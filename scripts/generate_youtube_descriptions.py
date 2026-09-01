#!/usr/bin/env python3
"""
Generate a polished YouTube description for every video in youtube_videos.json.

Reuses the existing blog-pipeline helpers verbatim (no new cleanup logic):
  * transcript_publish_helpers.clean_transcript()      -> local ASR cleanup
  * grok_transcript_polish.transcript_for_blog()       -> Grok polish (cache-first,
                                                          falls back to local cleanup
                                                          when no API key or request fails)

For videos whose raw transcript is missing from the manifests, the polished
transcript is extracted from the matching blog post HTML (the same text the
published blog already uses), so descriptions stay in exact parity with the blog.

Each description = "<video title>\\n\\n<polished transcript>\\n\\n—\\n📝 Full story &
transcript: <blog post URL or homepage>\\n📜 Full episode transcript appears above
for accessibility and search.\\n#cacao #ceremonialcacao #Brazil #Bahia #Agroverse #beantobliss"

Truncation reuses the youtube_batch_incoming.description_for_video() cap (4900 chars).

Writes the new `description` field into scripts/youtube_videos.json (in place).
Local JSON only — this script never touches the YouTube Data API.
"""

from __future__ import annotations

import glob
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

sys.path.insert(0, str(SCRIPT_DIR))

from transcript_publish_helpers import clean_transcript  # noqa: E402
from grok_transcript_polish import transcript_for_blog  # noqa: E402

VIDEO_MAP_FILE = SCRIPT_DIR / "youtube_videos.json"
MANIFESTS = [
    REPO_ROOT / "docs" / "incoming_videos_2026-04" / "manifest.json",
    REPO_ROOT / "docs" / "incoming_videos_2026-07" / "manifest.json",
]
POSTS_GLOB = str(REPO_ROOT / "post" / "*" / "index.html")

DESCRIPTION_CAP = 4900
FOOTER_HOME = (
    "\n\n—\n"
    "🌐 Agroverse: https://www.agroverse.shop\n"
    "📜 Full episode transcript appears above for accessibility and search.\n"
    "#cacao #ceremonialcacao #Brazil #Bahia #Agroverse #beantobliss"
)
FOOTER_POST = (
    "\n\n—\n"
    "📝 Full story & transcript: https://www.agroverse.shop/post/{slug}\n"
    "📜 Full episode transcript appears above for accessibility and search.\n"
    "#cacao #ceremonialcacao #Brazil #Bahia #Agroverse #beantobliss"
)
TRUNC_NOTE = "\n\n[Description truncated; see video captions for full transcript.]"


def load_manifests() -> dict[str, str]:
    """Return {basename: raw transcript} across all manifests."""
    raw_by_bn: dict[str, str] = {}
    for mf in MANIFESTS:
        if not mf.is_file():
            continue
        data = json.loads(mf.read_text(encoding="utf-8"))
        for vid in data.get("videos", []):
            bn = vid.get("basename")
            if bn:
                raw_by_bn[bn] = vid.get("transcript") or ""
    return raw_by_bn


def build_blog_slug_map() -> dict[str, str]:
    """Map video_id -> blog post slug by scanning post pages for the embed URL."""
    id2slug: dict[str, str] = {}
    for idx in glob.glob(POSTS_GLOB):
        slug = idx.split("/")[-2]
        html = Path(idx).read_text(encoding="utf-8")
        for m in re.findall(r"youtube\.com/embed/([A-Za-z0-9_-]{6,})", html):
            id2slug.setdefault(m, slug)
    return id2slug


def blog_transcript(slug: str) -> str:
    """Extract the polished transcript from a blog post's HTML (blog parity)."""
    if not slug:
        return ""
    path = REPO_ROOT / "post" / slug / "index.html"
    if not path.is_file():
        return ""
    html = path.read_text(encoding="utf-8")
    m = re.search(
        r'<h2 class="blog-transcript-heading">Transcript</h2>(.*?)</div>', html, re.S
    )
    if not m:
        return ""
    paras = re.findall(r"<p>(.*?)</p>", m.group(1), re.S)
    text = " ".join(re.sub(r"<[^>]+>", "", p) for p in paras)
    return " ".join(text.split())


def tail_for(video_id: str, id2slug: dict[str, str]) -> str:
    slug = id2slug.get(video_id)
    if slug:
        return FOOTER_POST.format(slug=slug)
    return FOOTER_HOME


def build_description(
    basename: str,
    entry: dict,
    raw_by_bn: dict[str, str] | None = None,
    id2slug: dict[str, str] | None = None,
) -> str:
    """Build the polished YouTube description for one video entry.

    Reuses the blog-pipeline helpers (clean_transcript + transcript_for_blog) and
    the same tail/truncation logic as the batch generator, so every caller (the
    batch backfill generator and the upload-time ingress in
    youtube_batch_incoming.py) produces byte-identical, blog-parity descriptions.
    """
    video_id = entry["video_id"]
    title = entry["title"]
    raw = (raw_by_bn or {}).get(basename, "")

    if raw.strip():
        body = transcript_for_blog(
            raw,
            basename,
            locally_cleaned=clean_transcript(raw),
            title_hint=title,
        )
    else:
        body = blog_transcript((id2slug or {}).get(video_id))

    prefix = f"{title}\n\n"
    tail = tail_for(video_id, id2slug or {})
    combined = prefix + body + tail
    if len(combined) > DESCRIPTION_CAP:
        cut = DESCRIPTION_CAP - len(tail) - len(prefix) - len(TRUNC_NOTE)
        body = body[: max(0, cut)] + TRUNC_NOTE
    return prefix + body + tail


def main() -> None:
    video_map = json.loads(VIDEO_MAP_FILE.read_text(encoding="utf-8"))
    raw_by_bn = load_manifests()
    id2slug = build_blog_slug_map()

    results: dict[str, str] = {}
    for i, (bn, entry) in enumerate(video_map.items(), 1):
        results[bn] = build_description(bn, entry, raw_by_bn, id2slug)

        if i % 5 == 0 or i == len(video_map):
            print(f"progress {i}/{len(video_map)}", flush=True)

    new_map = {}
    for bn, entry in video_map.items():
        e = dict(entry)
        e["description"] = results[bn]
        new_map[bn] = e
    VIDEO_MAP_FILE.write_text(
        json.dumps(new_map, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"DONE {len(new_map)} descriptions written to {VIDEO_MAP_FILE.name}")


if __name__ == "__main__":
    main()
