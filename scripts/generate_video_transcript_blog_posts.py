#!/usr/bin/env python3
"""
Regenerate transcript blog posts with YouTube embeds, and add longer-form “story” posts.

- Bean to Bliss (existing slugs): embeds match basename → scripts/youtube_videos.json
- Story posts: manifest rows in YouTube mapping, duration ≥ 45s, transcript ≥ 80 words,
  excluding Bean/B2B files already covered by Bean posts.

Updates blog/index.html between <!-- VIDEO_TRANSCRIPT_POSTS --> … <!-- /VIDEO_TRANSCRIPT_POSTS -->.

Usage (from agroverse_shop/):
  python3 scripts/generate_video_transcript_blog_posts.py

Public URL for canonical, og:url, and og:image (must match the host where HTML and JPEGs are served;
otherwise WhatsApp/Facebook may show no preview if og:image 404s on production):
  AGROVERSE_PUBLIC_ORIGIN=https://beta.agroverse.shop python3 scripts/generate_video_transcript_blog_posts.py

This script runs **`sync_post_open_graph_images.py`** at the end so **`og:image`** matches blog cards. Re-run only that step if needed:
  python3 scripts/sync_post_open_graph_images.py

Transcripts: local ASR cleanup via transcript_publish_helpers, then optional Grok polish
(≥40 words) when GROK_API_KEY is set or found in ../market_research/.env. Cache:
scripts/transcript_grok_polish_cache.json
"""
from __future__ import annotations

import html
import json
import re
import subprocess
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from og_image_utils import (
    DEFAULT_OG_CARD_PATH,
    default_og_image_url,
    dims_for_site_path,
    public_origin,
    strip_og_image_dims,
)

from transcript_publish_helpers import (
    apply_story_title_overrides,
    clean_transcript,
    disambiguate_stories,
    paragraphize_for_html,
    propose_title,
    unique_slug,
    youtube_snippet_title,
)
from video_poster_thumb import ensure_post_thumbnail
from grok_transcript_polish import transcript_for_blog

REPO = Path(__file__).resolve().parent.parent
MANIFEST = REPO / "docs/incoming_videos_2026-04/manifest.json"
YOUTUBE_MAP = REPO / "scripts/youtube_videos.json"
TEMPLATE = REPO / "post/brazil-commodity-vs-origin-cacao-food-grade/index.html"
BLOG_INDEX = REPO / "blog/index.html"

LISTING_IMG = DEFAULT_OG_CARD_PATH

BEAN_HUMAN_TITLE_LOWER: dict[str, str] = {
    "bean to bliss episode 9_full hd 1080p.mp4": "Bean to Bliss — Episode 9",
    "bean to bliss episode 10 - tiktok_full hd 1080p.mp4": "Bean to Bliss — Episode 10 (TikTok)",
    "bean to bliss episode 10 - tiktok_full hd 1081.mp4": "Bean to Bliss — Episode 10 (TikTok)",
    "b2b ep 10 - tiktok part 2_full hd 1080p.mp4": "Bean to Bliss — B2B ep 10 (TikTok part 2)",
    "bean to bliss episode 12_full hd 1081.mp4": "Bean to Bliss — Episode 12",
    "bean to bliss episode 12_full hd 1080p.mp4": "Bean to Bliss — Episode 12",
}

BEAN_DISPLAY = "April 3, 2026"
BEAN_ISO = "2026-04-03T16:00:00+00:00"
# Shared H1 for the Episode 10 page (three embedded clips).
BEAN10_PAGE_H1 = "Bean to Bliss — Episode 10 — TikTok (videos & transcript)"
STORY_DISPLAY = "March 31, 2026"
STORY_ISO = "2026-03-31T16:00:00+00:00"

VIDEO_CARDS_START = "<!-- VIDEO_TRANSCRIPT_POSTS -->"
VIDEO_CARDS_END = "<!-- /VIDEO_TRANSCRIPT_POSTS -->"

VIDEO_STORY_STATE = _SCRIPT_DIR / "video_story_posts_state.json"

MIN_STORY_DURATION_SEC = 45.0
MIN_STORY_WORDS = 80

BEAN_B2B_BASENAMES_LOWER = {
    "bean to bliss episode 9_full hd 1080p.mp4",
    "bean to bliss episode 10 - tiktok_full hd 1080p.mp4",
    "bean to bliss episode 10 - tiktok_full hd 1081.mp4",
    "b2b ep 10 - tiktok part 2_full hd 1080p.mp4",
    "bean to bliss episode 12_full hd 1081.mp4",
}

EMBED_CSS = """
        .blog-video-embed {
            position: relative;
            width: 100%;
            max-width: 960px;
            margin: 1.25rem auto 2rem;
            aspect-ratio: 16 / 9;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 6px 28px rgba(0, 0, 0, 0.12);
        }
        .blog-video-embed iframe {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            border: 0;
        }
        .blog-content .blog-transcript-heading {
            font-family: var(--font-heading);
            font-size: 1.75rem;
            margin: 2.5rem 0 1rem;
        }
        .blog-content .blog-embed-section-title {
            font-family: var(--font-heading);
            font-size: 1.35rem;
            margin: 2rem 0 0.75rem;
        }
"""


def load_manifest() -> list[dict]:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    return data.get("videos") or []


def load_youtube() -> dict[str, dict]:
    return json.loads(YOUTUBE_MAP.read_text(encoding="utf-8"))


def by_basename(videos: list[dict], name: str) -> dict | None:
    for v in videos:
        if v.get("basename") == name:
            return v
    return None


def word_count(text: str) -> int:
    return len(((text or "").strip()).split())


def load_story_state() -> dict[str, dict]:
    if not VIDEO_STORY_STATE.is_file():
        return {}
    data = json.loads(VIDEO_STORY_STATE.read_text(encoding="utf-8"))
    return data.get("by_basename") or {}


def save_story_state(by_basename: dict[str, dict]) -> None:
    VIDEO_STORY_STATE.write_text(
        json.dumps({"by_basename": by_basename}, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {VIDEO_STORY_STATE}")


def write_redirect_stub(old_slug: str, new_slug: str) -> None:
    if old_slug == new_slug:
        return
    dest = f"/post/{new_slug}/"
    canonical = f"{public_origin()}/post/{new_slug}"
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<!-- sitemap-omit: redirect stub -->
<meta content="0;url={dest}" http-equiv="refresh"/>
<link href="{canonical}" rel="canonical"/>
<title>Moved</title>
</head>
<body>
<p>This post moved to <a href="{dest}">{dest}</a>.</p>
</body>
</html>
"""
    d = REPO / "post" / old_slug
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(page, encoding="utf-8")
    print(f"Redirect stub: /post/{old_slug}/ -> {dest}")


def description_from_transcript(transcript: str, max_len: int = 158) -> str:
    t = re.sub(r"\s+", " ", (transcript or "").strip())
    if not t:
        return "Video transcript and embed from the Agroverse field library."
    if len(t) <= max_len:
        return t
    return t[: max_len - 1].rsplit(" ", 1)[0] + "…"


def transcript_to_html(transcript: str) -> str:
    t = (transcript or "").strip()
    if not t:
        return "<p><em>(No speech detected in this export.)</em></p>"
    blocks = paragraphize_for_html(t)
    if not blocks:
        blocks = [t]
    return "\n".join(f"<p>{html.escape(block)}</p>" for block in blocks)


def youtube_embed(video_id: str, iframe_title: str) -> str:
    vid = html.escape(video_id)
    tit = html.escape(iframe_title)
    return (
        f'<div class="blog-video-embed">'
        f'<iframe src="https://www.youtube.com/embed/{vid}" title="{tit}" '
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" '
        "allowfullscreen loading=\"lazy\"></iframe></div>\n"
    )


def iframe_title_with_optional_section(page_h1: str, section_label: str | None) -> str:
    """Accessible iframe title: main post H1, or H1 plus embed section for multi-clip posts."""
    s = (section_label or "").strip()
    if s:
        return f"{page_h1.strip()}: {s}"
    return page_h1.strip()


def inject_embed_css(page: str) -> str:
    if ".blog-video-embed" in page:
        return page
    return re.sub(r"(</style>)", EMBED_CSS.rstrip() + r"\n    \1", page, count=1)


def abs_site_url(site_path: str) -> str:
    if site_path.startswith("http://") or site_path.startswith("https://"):
        return site_path
    base = public_origin()
    return f"{base}{site_path if site_path.startswith('/') else '/' + site_path}"


def sync_youtube_mapping_titles(manifest_videos: list[dict], yt: dict[str, dict]) -> None:
    """Align youtube_videos.json `title` with transcript + Bean labels + disambiguation."""
    by_b = {v["basename"]: v for v in manifest_videos}
    basenames = [b for b in yt if b in by_b]
    cleaned_by: dict[str, str] = {}
    preliminary: dict[str, str] = {}
    for b in basenames:
        row = by_b[b]
        bl = b.lower()
        cleaned_by[b] = clean_transcript(row.get("transcript") or "")
        if bl in BEAN_HUMAN_TITLE_LOWER:
            preliminary[b] = BEAN_HUMAN_TITLE_LOWER[bl]
        else:
            preliminary[b] = propose_title(cleaned_by[b], b)
    final = disambiguate_stories(preliminary, cleaned_by)
    final = apply_story_title_overrides(final)
    for b in basenames:
        bl = b.lower()
        if bl == "bean to bliss episode 9_full hd 1080p.mp4":
            yt[b]["title"] = youtube_snippet_title("Bean to Bliss — Episode 9 (video & transcript)")
        elif bl in ("bean to bliss episode 12_full hd 1081.mp4", "bean to bliss episode 12_full hd 1080p.mp4"):
            yt[b]["title"] = youtube_snippet_title("Bean to Bliss — Episode 12 (video & transcript)")
        elif bl == "bean to bliss episode 10 - tiktok_full hd 1080p.mp4":
            yt[b]["title"] = youtube_snippet_title(
                iframe_title_with_optional_section(BEAN10_PAGE_H1, "Export: Full HD 1080p")
            )
        elif bl == "bean to bliss episode 10 - tiktok_full hd 1081.mp4":
            yt[b]["title"] = youtube_snippet_title(
                iframe_title_with_optional_section(BEAN10_PAGE_H1, "Export: Full HD 1081 (newer file)")
            )
        elif bl == "b2b ep 10 - tiktok part 2_full hd 1080p.mp4":
            yt[b]["title"] = youtube_snippet_title(
                iframe_title_with_optional_section(BEAN10_PAGE_H1, "B2B ep 10 — TikTok part 2")
            )
        else:
            yt[b]["title"] = youtube_snippet_title(f"{final[b]} (video & transcript)")


def page_shell(
    slug: str,
    title_short: str,
    description: str,
    h1: str,
    body_inner: str,
    published_display: str,
    published_iso: str,
    *,
    og_image: str | None = None,
    og_card_site_path: str | None = None,
) -> str:
    if not TEMPLATE.is_file():
        raise SystemExit(f"Missing template {TEMPLATE}")
    raw = TEMPLATE.read_text(encoding="utf-8")
    raw = strip_og_image_dims(raw)
    origin = public_origin()
    canonical = f"{origin}/post/{slug}"
    full_title = f"{title_short} | Agroverse"
    esc_full = html.escape(full_title)
    esc_desc = html.escape(description)
    esc_url = html.escape(canonical)
    card_path = og_card_site_path or DEFAULT_OG_CARD_PATH
    og_final = og_image if og_image else default_og_image_url()
    esc_og = html.escape(og_final)
    esc_iso = html.escape(published_iso)
    esc_h1 = html.escape(h1)
    esc_pub = html.escape(published_display)
    dims = dims_for_site_path(REPO, card_path) if card_path.startswith("/assets/") else None

    raw = re.sub(r"<title>.*?</title>", f"<title>{esc_full}</title>", raw, count=1, flags=re.DOTALL)
    raw = re.sub(
        r'<meta content="[^"]*" name="description"/>',
        f'<meta content="{esc_desc}" name="description"/>',
        raw,
        count=1,
    )
    raw = re.sub(
        r'<link href="https?://[^"]+/post/[^"]+" rel="canonical"/>',
        f'<link href="{esc_url}" rel="canonical"/>',
        raw,
        count=1,
    )
    for prop in ("og:url", "twitter:url"):
        raw = re.sub(
            rf'<meta content="https?://[^"]+/post/[^"]+" property="{prop}"/>',
            f'<meta content="{esc_url}" property="{prop}"/>',
            raw,
            count=1,
        )
    raw = re.sub(
        r'<meta content="[^"]*" property="og:title"/>',
        f'<meta content="{esc_full}" property="og:title"/>',
        raw,
        count=1,
    )
    raw = re.sub(
        r'<meta content="[^"]*" property="og:description"/>',
        f'<meta content="{esc_desc}" property="og:description"/>',
        raw,
        count=1,
    )
    raw = re.sub(
        r'<meta content="[^"]*" property="twitter:title"/>',
        f'<meta content="{esc_full}" property="twitter:title"/>',
        raw,
        count=1,
    )
    raw = re.sub(
        r'<meta content="[^"]*" property="twitter:description"/>',
        f'<meta content="{esc_desc}" property="twitter:description"/>',
        raw,
        count=1,
    )
    raw = re.sub(
        r'<meta content="https://[^"]+" property="og:image"/>',
        f'<meta content="{esc_og}" property="og:image"/>',
        raw,
        count=1,
    )
    if dims:
        w, h = dims
        og_line = f'<meta content="{esc_og}" property="og:image"/>'
        raw = raw.replace(
            og_line,
            f'{og_line}\n<meta content="{w}" property="og:image:width"/>\n<meta content="{h}" property="og:image:height"/>',
            1,
        )
    raw = re.sub(
        r'<meta content="https://[^"]+" property="twitter:image"/>',
        f'<meta content="{esc_og}" property="twitter:image"/>',
        raw,
        count=1,
    )
    raw = re.sub(
        r'<meta content="[^"]*" property="article:published_time"/>',
        f'<meta content="{esc_iso}" property="article:published_time"/>',
        raw,
        count=1,
    )

    blog_region = re.search(
        r"<header class=\"blog-header\">[\s\S]*?</header>\s*<div class=\"blog-content\">[\s\S]*</div>\s*(?=<nav class=\"post-navigation\">)",
        raw,
    )
    if not blog_region:
        raise SystemExit("Could not find blog-header/blog-content region in template")

    meta_block = (
        f'<header class="blog-header">\n'
        f'<h1 class="blog-title">{esc_h1}</h1>\n'
        f'<div class="blog-meta">\n'
        f"<span>Published: {esc_pub}</span>\n"
        f'<span>By TrueSight Community</span>\n'
        f"</div>\n</header>\n"
        f'<div class="blog-content">\n'
        f"{body_inner}\n"
        f"</div>\n"
    )
    raw = raw[: blog_region.start()] + meta_block + raw[blog_region.end() :]

    raw = re.sub(
        r'<nav class="post-navigation">.*?</nav>',
        '<nav class="post-navigation">\n'
        '<div class="nav-item nav-prev"><a class="nav-link" href="../../blog/">← <span class="nav-label">Blog</span></a></div>\n'
        '<div class="nav-item nav-next"><a class="nav-link" href="../../blog/"><span class="nav-label">All posts</span> →</a></div>\n'
        "</nav>",
        raw,
        count=1,
        flags=re.DOTALL,
    )

    return inject_embed_css(raw)


def write_post(slug: str, html_out: str) -> None:
    d = REPO / "post" / slug
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(html_out, encoding="utf-8")
    print(f"Wrote {d / 'index.html'}")


def blog_card(slug: str, title: str, description: str, display_date: str, *, card_image: str | None = None) -> str:
    esc_title = html.escape(title)
    esc_desc = html.escape(description)
    esc_date = html.escape(display_date)
    img = card_image or LISTING_IMG
    return f"""
            <article class="blog-card">
                <a href="/post/{slug}/" class="blog-card-link">
                    <div class="blog-card-image-container">
                        <img src="{img}" alt="{esc_title}" class="blog-card-image" width="1600" height="1067" loading="lazy" decoding="async">
                    </div>
                    <div class="blog-card-content">
                        <h2 class="blog-card-title">{esc_title}</h2>
                        <p class="blog-card-description">{esc_desc}</p>
                        <div class="blog-card-meta">
                            <span class="blog-card-date">{esc_date}</span>
                            <span class="blog-card-author">By TrueSight Community</span>
                        </div>
                    </div>
                </a>
            </article>
"""


def post_thumb_web(
    slug: str,
    *,
    manifest_row: dict | None,
    video_id: str | None,
    force_refresh: bool = True,
) -> str | None:
    path = (manifest_row or {}).get("path") if manifest_row else None
    return ensure_post_thumbnail(
        slug,
        video_path=path,
        video_id=video_id,
        force_refresh=force_refresh,
    )


def refresh_blog_cards(cards_html: str) -> None:
    text = BLOG_INDEX.read_text(encoding="utf-8")
    block = f"{VIDEO_CARDS_START}\n{cards_html.rstrip()}\n            {VIDEO_CARDS_END}"
    if VIDEO_CARDS_START in text and VIDEO_CARDS_END in text:
        text = re.sub(
            re.escape(VIDEO_CARDS_START) + r"[\s\S]*?" + re.escape(VIDEO_CARDS_END),
            block,
            text,
            count=1,
        )
    else:
        needle = '<div class="blog-grid">'
        if needle not in text:
            raise SystemExit("blog/index.html: missing blog-grid")
        text = text.replace(needle, needle + "\n" + block + "\n", 1)
    BLOG_INDEX.write_text(text, encoding="utf-8")
    print(f"Updated {BLOG_INDEX}")


def main() -> None:
    vids = load_manifest()
    yt = load_youtube()

    # --- Bean to Bliss episode 9
    e9_name = "bean to bliss episode 9_Full HD 1080p.MP4"
    e9 = by_basename(vids, e9_name)
    if not e9 or e9_name not in yt:
        raise SystemExit("Episode 9 video or YouTube mapping missing")
    v9 = yt[e9_name]["video_id"]
    _raw9 = e9.get("transcript") or ""
    _cl9 = clean_transcript(_raw9)
    _disp9 = transcript_for_blog(_raw9, e9_name, locally_cleaned=_cl9, title_hint="Bean to Bliss — Episode 9")
    h1_9 = "Bean to Bliss — Episode 9 (video & transcript)"
    body9 = (
        youtube_embed(v9, h1_9)
        + '<h2 class="blog-transcript-heading">Transcript</h2>\n'
        + transcript_to_html(_disp9)
    )
    thumb9 = post_thumb_web("bean-to-bliss-episode-9", manifest_row=e9, video_id=v9)
    card9 = thumb9 or LISTING_IMG
    html9 = page_shell(
        "bean-to-bliss-episode-9",
        "Bean to Bliss — Episode 9",
        description_from_transcript(_disp9)
        or "Full transcript and video: Bean to Bliss episode 9 — cacao, craft, and story from the field.",
        h1_9,
        body9,
        BEAN_DISPLAY,
        BEAN_ISO,
        og_image=abs_site_url(card9),
        og_card_site_path=card9,
    )
    write_post("bean-to-bliss-episode-9", html9)

    # --- Episode 10 (multi-clip)
    e10a = by_basename(vids, "Bean to Bliss episode 10 - TikTok_Full HD 1080p.MP4")
    e10b = by_basename(vids, "Bean to Bliss episode 10 - TikTok_Full HD 1081.MP4")
    e10c = by_basename(vids, "B2B ep 10 - tiktok part 2_Full HD 1080p.MP4")
    parts10: list[str] = []
    if e10a and e10a.get("basename") in yt:
        bid = yt[e10a["basename"]]["video_id"]
        bn = e10a["basename"]
        r_, c_ = e10a.get("transcript") or "", clean_transcript(e10a.get("transcript") or "")
        parts10.append('<h2 class="blog-embed-section-title">Export: Full HD 1080p</h2>\n')
        parts10.append(
            youtube_embed(
                bid,
                iframe_title_with_optional_section(BEAN10_PAGE_H1, "Export: Full HD 1080p"),
            )
        )
        parts10.append(
            transcript_to_html(transcript_for_blog(r_, bn, locally_cleaned=c_, title_hint="Bean to Bliss — Episode 10 (1080p)"))
        )
    if e10b and e10b.get("basename") in yt:
        bid = yt[e10b["basename"]]["video_id"]
        bn = e10b["basename"]
        r_, c_ = e10b.get("transcript") or "", clean_transcript(e10b.get("transcript") or "")
        parts10.append('<h2 class="blog-embed-section-title">Export: Full HD 1081 (newer file)</h2>\n')
        parts10.append(
            youtube_embed(
                bid,
                iframe_title_with_optional_section(BEAN10_PAGE_H1, "Export: Full HD 1081 (newer file)"),
            )
        )
        parts10.append(
            transcript_to_html(transcript_for_blog(r_, bn, locally_cleaned=c_, title_hint="Bean to Bliss — Episode 10 (1081)"))
        )
    if e10c and e10c.get("basename") in yt:
        bid = yt[e10c["basename"]]["video_id"]
        bn = e10c["basename"]
        r_, c_ = e10c.get("transcript") or "", clean_transcript(e10c.get("transcript") or "")
        parts10.append('<h2 class="blog-embed-section-title">B2B ep 10 — TikTok part 2</h2>\n')
        parts10.append(
            youtube_embed(
                bid,
                iframe_title_with_optional_section(BEAN10_PAGE_H1, "B2B ep 10 — TikTok part 2"),
            )
        )
        parts10.append(
            transcript_to_html(transcript_for_blog(r_, bn, locally_cleaned=c_, title_hint="Bean to Bliss — B2B ep 10"))
        )
    body10 = "\n".join(parts10)
    e10_thumb_row = e10a or e10b or e10c
    e10_thumb_id = None
    if e10a and e10a.get("basename") in yt:
        e10_thumb_id = yt[e10a["basename"]]["video_id"]
    elif e10b and e10b.get("basename") in yt:
        e10_thumb_id = yt[e10b["basename"]]["video_id"]
    elif e10c and e10c.get("basename") in yt:
        e10_thumb_id = yt[e10c["basename"]]["video_id"]
    thumb10 = post_thumb_web(
        "bean-to-bliss-episode-10",
        manifest_row=e10_thumb_row,
        video_id=e10_thumb_id,
    )
    card10 = thumb10 or LISTING_IMG
    html10 = page_shell(
        "bean-to-bliss-episode-10",
        "Bean to Bliss — Episode 10 (TikTok)",
        "Transcripts and embedded videos for Bean to Bliss episode 10—alternate exports and TikTok part 2.",
        BEAN10_PAGE_H1,
        body10,
        BEAN_DISPLAY,
        BEAN_ISO,
        og_image=abs_site_url(card10),
        og_card_site_path=card10,
    )
    write_post("bean-to-bliss-episode-10", html10)

    # --- Episode 12
    e12_name = "Bean to Bliss episode 12_Full HD 1081.MP4"
    e12 = by_basename(vids, e12_name)
    if not e12 or e12_name not in yt:
        raise SystemExit("Episode 12 (1081) or YouTube mapping missing")
    v12 = yt[e12_name]["video_id"]
    _raw12 = e12.get("transcript") or ""
    _cl12 = clean_transcript(_raw12)
    _disp12 = transcript_for_blog(_raw12, e12_name, locally_cleaned=_cl12, title_hint="Bean to Bliss — Episode 12")
    h1_12 = "Bean to Bliss — Episode 12 (video & transcript)"
    body12 = (
        youtube_embed(v12, h1_12)
        + '<h2 class="blog-transcript-heading">Transcript</h2>\n'
        + transcript_to_html(_disp12)
    )
    thumb12 = post_thumb_web("bean-to-bliss-episode-12", manifest_row=e12, video_id=v12)
    card12 = thumb12 or LISTING_IMG
    html12 = page_shell(
        "bean-to-bliss-episode-12",
        "Bean to Bliss — Episode 12",
        description_from_transcript(_disp12) or "Full transcript and video for Bean to Bliss episode 12.",
        h1_12,
        body12,
        BEAN_DISPLAY,
        BEAN_ISO,
        og_image=abs_site_url(card12),
        og_card_site_path=card12,
    )
    write_post("bean-to-bliss-episode-12", html12)

    # --- Longer “story” posts
    story_rows: list[tuple[float, str, dict]] = []
    for v in vids:
        b = v.get("basename") or ""
        if b not in yt:
            continue
        if b.lower() in BEAN_B2B_BASENAMES_LOWER:
            continue
        dur = float(v.get("duration_sec") or 0)
        t = v.get("transcript") or ""
        if not (t.strip() and dur >= MIN_STORY_DURATION_SEC and word_count(t) >= MIN_STORY_WORDS):
            continue
        story_rows.append((dur, b, v))
    story_rows.sort(key=lambda x: -x[0])

    cleaned_by_basename: dict[str, str] = {}
    preliminary_titles: dict[str, str] = {}
    for _dur, basename, row in story_rows:
        raw_t = row.get("transcript") or ""
        cleaned_by_basename[basename] = clean_transcript(raw_t)
        preliminary_titles[basename] = propose_title(cleaned_by_basename[basename], basename)
    final_titles = disambiguate_stories(preliminary_titles, cleaned_by_basename)
    final_titles = apply_story_title_overrides(final_titles)

    prev_story = load_story_state()
    story_by_basename: dict[str, dict] = {}
    used_slugs: set[str] = set()
    story_cards: list[str] = []
    for dur, basename, row in story_rows:
        cleaned = cleaned_by_basename[basename]
        human_title = final_titles[basename]
        slug = unique_slug(human_title, basename, used_slugs)
        yt_title = youtube_snippet_title(f"{human_title} (video & transcript)")
        prev_slug = (prev_story.get(basename) or {}).get("slug")
        if prev_slug and prev_slug != slug:
            write_redirect_stub(prev_slug, slug)

        title_short = f"{human_title} (video & transcript)"
        raw_full = row.get("transcript") or ""
        display_text = transcript_for_blog(
            raw_full, basename, locally_cleaned=cleaned, title_hint=human_title
        )
        desc = description_from_transcript(display_text)
        h1 = f"{human_title} (video & transcript)"
        vid = yt[basename]["video_id"]
        body = (
            youtube_embed(vid, h1)
            + '<h2 class="blog-transcript-heading">Transcript</h2>\n'
            + transcript_to_html(display_text)
        )
        thumb = post_thumb_web(slug, manifest_row=row, video_id=vid)
        card = thumb or LISTING_IMG
        out = page_shell(
            slug,
            title_short,
            desc,
            h1,
            body,
            STORY_DISPLAY,
            STORY_ISO,
            og_image=abs_site_url(card),
            og_card_site_path=card,
        )
        write_post(slug, out)
        story_cards.append(blog_card(slug, title_short, desc, STORY_DISPLAY, card_image=thumb or LISTING_IMG))
        story_by_basename[basename] = {
            "slug": slug,
            "human_title": human_title,
            "youtube_title": yt_title,
        }

    save_story_state(story_by_basename)
    sync_youtube_mapping_titles(vids, yt)
    YOUTUBE_MAP.write_text(json.dumps(yt, indent=2), encoding="utf-8")
    print(f"Synced YouTube mapping titles for {len([b for b in yt if b in {v['basename'] for v in vids}])} manifest-mapped videos.")

    # --- Blog index cards: Bean first, then story (longest-first)
    bean_cards = (
        blog_card(
            "bean-to-bliss-episode-12",
            "Bean to Bliss — Episode 12 (transcript)",
            "Video and full transcript: Bean to Bliss episode 12.",
            BEAN_DISPLAY,
            card_image=thumb12 or LISTING_IMG,
        )
        + blog_card(
            "bean-to-bliss-episode-10",
            "Bean to Bliss — Episode 10 — TikTok (transcript)",
            "Embedded clips and transcripts for episode 10 exports and TikTok part 2.",
            BEAN_DISPLAY,
            card_image=thumb10 or LISTING_IMG,
        )
        + blog_card(
            "bean-to-bliss-episode-9",
            "Bean to Bliss — Episode 9 (transcript)",
            "Video and full transcript: Bean to Bliss episode 9.",
            BEAN_DISPLAY,
            card_image=thumb9 or LISTING_IMG,
        )
    )
    refresh_blog_cards(bean_cards + "".join(story_cards))

    og_sync = _SCRIPT_DIR / "sync_post_open_graph_images.py"
    if og_sync.is_file():
        print("Syncing Open Graph / Twitter images to match blog listing cards…")
        r = subprocess.run([sys.executable, str(og_sync)], cwd=str(REPO))
        if r.returncode != 0:
            print(
                f"Warning: {og_sync.name} exited {r.returncode}; run it manually after fixing errors.",
                file=sys.stderr,
            )


if __name__ == "__main__":
    main()
