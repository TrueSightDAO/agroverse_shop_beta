#!/usr/bin/env python3
"""
Align each blog post's og:image / twitter:image with the same asset used on blog/index.html
(card hero <img src>), and add og:image:width / og:image:height from the local JPEG.

Skips redirect stub posts (sitemap-omit). Does not change canonical/og:url unless --sync-page-urls.

Public hostname for absolute image URLs:
  AGROVERSE_PUBLIC_ORIGIN (default https://www.agroverse.shop)
  e.g. AGROVERSE_PUBLIC_ORIGIN=https://beta.agroverse.shop for beta deploys where assets are
  not yet on production (WhatsApp/Facebook must fetch og:image with HTTP 200).

Usage (from agroverse_shop/):
  python3 scripts/sync_post_open_graph_images.py --dry-run
  python3 scripts/sync_post_open_graph_images.py
  AGROVERSE_PUBLIC_ORIGIN=https://beta.agroverse.shop python3 scripts/sync_post_open_graph_images.py
"""
from __future__ import annotations

import argparse
import html as html_lib
import re
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from og_image_utils import (
    dims_for_site_path,
    public_origin,
    strip_og_image_dims,
)

REPO = _SCRIPT_DIR.parent
BLOG_INDEX = REPO / "blog/index.html"

CARD_RE = re.compile(
    r'<a href="/post/([^/]+)/" class="blog-card-link">\s*'
    r'<div class="blog-card-image-container">\s*'
    r'<img src="([^"]+)"',
    re.MULTILINE,
)


def parse_card_images(index_html: str) -> dict[str, str]:
    return {m.group(1): m.group(2) for m in CARD_RE.finditer(index_html)}


def is_redirect_stub(content: str) -> bool:
    return "sitemap-omit: redirect stub" in content


def _set_or_insert_meta(s: str, prop: str, value_esc: str, insert_after_prop: str) -> str:
    line = f'<meta content="{value_esc}" property="{prop}"/>'
    pat_existing = rf'<meta content="[^"]*" property="{prop}"/>'
    if re.search(pat_existing, s):
        return re.sub(pat_existing, line, s, count=1)
    anchor = rf'(<meta content="[^"]*" property="{insert_after_prop}"/>)'
    n, c = re.subn(anchor, rf"\1\n{line}", s, count=1)
    if c != 1:
        raise ValueError(f"Could not insert {prop} after {insert_after_prop}")
    return n


def patch_post_html(
    path: Path,
    *,
    origin: str,
    img_src: str,
    sync_page_urls: bool,
    slug: str,
    dry_run: bool,
) -> bool:
    raw = path.read_text(encoding="utf-8", errors="replace")
    if is_redirect_stub(raw):
        return False

    abs_img = f"{origin.rstrip('/')}{img_src}"
    esc_img = html_lib.escape(abs_img, quote=True)
    dims = dims_for_site_path(REPO, img_src)
    base = origin.rstrip("/")
    page_url = f"{base}/post/{slug}"

    raw2 = strip_og_image_dims(raw)

    def sub_one(pattern: str, repl: str, s: str, *, flags: int = 0) -> str:
        n, count = re.subn(pattern, repl, s, count=1, flags=flags)
        if count != 1:
            raise ValueError(f"Expected 1 match for {pattern!r} in {path}")
        return n

    raw2 = _set_or_insert_meta(raw2, "og:image", esc_img, "og:description")
    if dims:
        w, h = dims
        og_line = f'<meta content="{esc_img}" property="og:image"/>'
        raw2 = raw2.replace(
            og_line,
            f'{og_line}\n<meta content="{w}" property="og:image:width"/>\n<meta content="{h}" property="og:image:height"/>',
            1,
        )
    raw2 = _set_or_insert_meta(raw2, "twitter:image", esc_img, "twitter:description")

    if sync_page_urls:
        esc_url = html_lib.escape(page_url, quote=True)
        raw2 = sub_one(
            r'<link href="https?://[^"]+/post/[^"]+" rel="canonical"/>',
            f'<link href="{esc_url}" rel="canonical"/>',
            raw2,
        )
        for prop in ("og:url", "twitter:url"):
            raw2 = sub_one(
                rf'<meta content="https?://[^"]+/post/[^"]+" property="{prop}"/>',
                f'<meta content="{esc_url}" property="{prop}"/>',
                raw2,
            )

    if raw2 != raw and not dry_run:
        path.write_text(raw2, encoding="utf-8")
    return raw2 != raw


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--sync-page-urls",
        action="store_true",
        help="Also set canonical, og:url, twitter:url to {origin}/post/{slug}",
    )
    ap.add_argument("--origin", default="", help="Override AGROVERSE_PUBLIC_ORIGIN")
    args = ap.parse_args()

    origin = (args.origin or public_origin()).rstrip("/")
    if not BLOG_INDEX.is_file():
        print(f"Missing {BLOG_INDEX}", file=sys.stderr)
        sys.exit(1)

    index_text = BLOG_INDEX.read_text(encoding="utf-8", errors="replace")
    cards = parse_card_images(index_text)
    changed = 0
    for slug, src in sorted(cards.items()):
        post_path = REPO / "post" / slug / "index.html"
        if not post_path.is_file():
            continue
        if patch_post_html(
            post_path,
            origin=origin,
            img_src=src,
            sync_page_urls=args.sync_page_urls,
            slug=slug,
            dry_run=args.dry_run,
        ):
            print(f"{'(dry-run) ' if args.dry_run else ''}updated OG image: {slug} -> {src}")
            changed += 1
    print(f"{'Would update' if args.dry_run else 'Updated'} {changed} post(s). Origin={origin!r}")


if __name__ == "__main__":
    main()
