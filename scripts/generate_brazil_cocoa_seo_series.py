#!/usr/bin/env python3
"""
Assemble the 2026 “Brazil / cocoa” SEO blog series from HTML fragments + the single-estate post shell.

Usage (from agroverse_shop/):
  python3 scripts/generate_brazil_cocoa_seo_series.py

Writes: post/<slug>/index.html for each fragment in scripts/brazil_cocoa_series/frags/
"""
from __future__ import annotations

import html as html_lib
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
TEMPLATE = REPO / "post/single-estate-vs-single-origin-why-it-matters/index.html"
FRAG_DIR = REPO / "scripts" / "brazil_cocoa_series"
META_PATH = FRAG_DIR / "meta.json"
ISO_DATE = "2026-04-02T14:00:00+00:00"
DISPLAY_DATE = "April 2, 2026"
DEFAULT_OG = "https://www.agroverse.shop/assets/images/partners/cic/cacao-tasting-wheel.jpg"


def load_template() -> str:
    if not TEMPLATE.is_file():
        raise SystemExit(f"Missing template: {TEMPLATE}")
    return TEMPLATE.read_text(encoding="utf-8")


def _canonical_url(canonical_path: str) -> str:
    path = canonical_path.strip().rstrip("/")
    if not path.startswith("/"):
        path = "/" + path
    return f"https://www.agroverse.shop{path}"


def replace_head(html: str, title: str, description: str, canonical_path: str, og_image: str) -> str:
    url = _canonical_url(canonical_path)
    esc_full = html_lib.escape(f"{title} | Agroverse")
    esc_desc = html_lib.escape(description)
    esc_url = html_lib.escape(url)
    esc_og = html_lib.escape(og_image)
    esc_iso = html_lib.escape(ISO_DATE)

    html = re.sub(
        r"<title>.*?</title>",
        f"<title>{esc_full}</title>",
        html,
        count=1,
        flags=re.DOTALL,
    )
    html = re.sub(
        r'<meta content="[^"]*" name="description"/>',
        f'<meta content="{esc_desc}" name="description"/>',
        html,
        count=1,
    )
    html = re.sub(
        r'<link href="https://www\.agroverse\.shop/post/[^"]+" rel="canonical"/>',
        f'<link href="{esc_url}" rel="canonical"/>',
        html,
        count=1,
    )
    html = re.sub(
        r'<meta content="https://www\.agroverse\.shop/post/[^"]+" property="og:url"/>',
        f'<meta content="{esc_url}" property="og:url"/>',
        html,
        count=1,
    )
    html = re.sub(
        r'<meta content="[^"]*" property="og:title"/>',
        f'<meta content="{esc_full}" property="og:title"/>',
        html,
        count=1,
    )
    html = re.sub(
        r'<meta content="[^"]*" property="og:description"/>',
        f'<meta content="{esc_desc}" property="og:description"/>',
        html,
        count=1,
    )
    html = re.sub(
        r'<meta content="https://www\.agroverse\.shop/assets/images/partners/cic/cacao-tasting-wheel\.jpg" property="og:image"/>',
        f'<meta content="{esc_og}" property="og:image"/>',
        html,
        count=1,
    )
    html = re.sub(
        r'<meta content="[^"]*" property="article:published_time"/>',
        f'<meta content="{esc_iso}" property="article:published_time"/>',
        html,
        count=1,
    )
    html = re.sub(
        r'<meta content="https://www\.agroverse\.shop/post/[^"]+" property="twitter:url"/>',
        f'<meta content="{esc_url}" property="twitter:url"/>',
        html,
        count=1,
    )
    html = re.sub(
        r'<meta content="[^"]*" property="twitter:title"/>',
        f'<meta content="{esc_full}" property="twitter:title"/>',
        html,
        count=1,
    )
    html = re.sub(
        r'<meta content="[^"]*" property="twitter:description"/>',
        f'<meta content="{esc_desc}" property="twitter:description"/>',
        html,
        count=1,
    )
    html = re.sub(
        r'<meta content="https://www\.agroverse\.shop/assets/images/partners/cic/cacao-tasting-wheel\.jpg" property="twitter:image"/>',
        f'<meta content="{esc_og}" property="twitter:image"/>',
        html,
        count=1,
    )
    return html


def replace_title_and_meta_block(html: str, h1: str) -> str:
    esc_h1 = html_lib.escape(h1)
    html = re.sub(
        r'<h1 class="blog-title">.*?</h1>',
        f'<h1 class="blog-title">{esc_h1}</h1>',
        html,
        count=1,
        flags=re.DOTALL,
    )
    html = re.sub(
        r"<span>Published: .*?</span>",
        f"<span>Published: {DISPLAY_DATE}</span>",
        html,
        count=1,
    )
    return html


def replace_blog_content(html: str, inner: str) -> str:
    pattern = re.compile(
        r'(<div class="blog-content">)(.*?)(</div>\s*<nav class="post-navigation">)',
        re.DOTALL,
    )
    m = pattern.search(html)
    if not m:
        raise RuntimeError("Could not find blog-content block in template")
    return pattern.sub(r"\1\n" + inner.strip() + r"\n\3", html, count=1)


def _nav_label(t: str) -> str:
    return (t[:77] + "…") if len(t) > 80 else t


def replace_nav(
    html: str,
    prev_href: str,
    prev_label: str,
    next_href: str,
    next_label: str,
) -> str:
    esc_prev = html_lib.escape(prev_label)
    esc_next = html_lib.escape(next_label)
    nav_html = f"""<nav class="post-navigation">
<div class="nav-item nav-prev"><a class="nav-link" href="{html_lib.escape(prev_href)}">← <span class="nav-label">{esc_prev}</span></a></div>
<div class="nav-item nav-next"><a class="nav-link" href="{html_lib.escape(next_href)}"><span class="nav-label">{esc_next}</span> →</a></div>
</nav>"""
    pattern = re.compile(r"<nav class=\"post-navigation\">.*?</nav>", re.DOTALL)
    return pattern.sub(nav_html, html, count=1)


def main() -> None:
    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    posts = meta["posts"]
    template = load_template()

    for i, post in enumerate(posts):
        slug = post["slug"]
        frag_path = FRAG_DIR / "frags" / f"{slug}.html"
        if not frag_path.is_file():
            raise SystemExit(f"Missing fragment: {frag_path}")
        inner = frag_path.read_text(encoding="utf-8")
        title = post["title"]
        description = post["description"]
        canonical_path = f"/post/{slug}"
        og_image = post.get("og_image") or DEFAULT_OG

        html = template
        html = replace_head(html, title, description, canonical_path, og_image)
        html = replace_title_and_meta_block(html, title)
        html = replace_blog_content(html, inner)

        prev_p = posts[i - 1] if i > 0 else None
        next_p = posts[i + 1] if i + 1 < len(posts) else None
        if prev_p:
            prev_href = f"../{prev_p['slug']}/"
            prev_label = _nav_label(prev_p["title"])
        else:
            prev_href = "../single-estate-vs-single-origin-why-it-matters/"
            prev_label = _nav_label("Single Estate vs Single Origin: Why It Matters for Your Cacao")
        if next_p:
            next_href = f"../{next_p['slug']}/"
            next_label = _nav_label(next_p["title"])
        else:
            next_href = "../../blog/"
            next_label = "Blog"

        html = replace_nav(html, prev_href, prev_label, next_href, next_label)

        out_dir = REPO / "post" / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "index.html").write_text(html, encoding="utf-8")
        print(f"Wrote {out_dir / 'index.html'}")


if __name__ == "__main__":
    main()
