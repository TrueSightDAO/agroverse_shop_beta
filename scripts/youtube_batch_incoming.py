#!/usr/bin/env python3
"""
Upload videos from incoming analysis manifest to YouTube with English captions (SRT).

- Requires: scripts/youtube_credentials.json, scripts/youtube_token.json
- OAuth scopes: youtube.upload + youtube.force-ssl (captions). If uploads work but
  captions fail with 403, delete youtube_token.json and re-run to consent to new scopes.

Quota: each videos.insert costs ~1600 units/day (default quota 10,000). Use --max to limit.

Usage (from agroverse_shop/):
  python3 scripts/youtube_batch_incoming.py --manifest docs/incoming_videos_2026-04/manifest.json \\
    --skips scripts/incoming_upload_skips.json --max 5 --dry-run

By default only **story-grade** clips upload (≥ 45s and ≥ 80 words of transcript). Pass
`--include-non-story` to also upload shorter/quieter files. Duplicates (`youtube_upload_recommended: false`)
are always skipped.

After new rows land in **youtube_videos.json**, run **`generate_video_transcript_blog_posts.py`**
then **`youtube_update_video_titles.py`** so Studio titles match the manifest (**agentic_ai_context/DOWNLOADS_MEDIA_TO_AGROVERSE.md** checklist).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
from pathlib import Path

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from transcript_publish_helpers import (
    apply_story_title_overrides,
    clean_transcript,
    disambiguate_stories,
    propose_title,
    youtube_snippet_title,
)
from generate_youtube_descriptions import build_description
from add_gps_to_youtube_videos_json import gps_for_source

REPO_ROOT = SCRIPT_DIR.parent
CREDENTIALS_FILE = SCRIPT_DIR / "youtube_credentials.json"
TOKEN_FILE = SCRIPT_DIR / "youtube_token.json"
MAPPING_FILE = SCRIPT_DIR / "youtube_videos.json"

SCOPES_UPLOAD = ["https://www.googleapis.com/auth/youtube.upload"]
# Captions API needs force-ssl; you must DELETE youtube_token.json and re-consent once.
SCOPES_WITH_CAPTIONS = SCOPES_UPLOAD + [
    "https://www.googleapis.com/auth/youtube.force-ssl",
]


def get_youtube_service(captions: bool):
    scopes = SCOPES_WITH_CAPTIONS if captions else SCOPES_UPLOAD
    creds = None
    if TOKEN_FILE.is_file():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), scopes)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(
                    f"Token refresh failed ({e}). If you need captions, delete {TOKEN_FILE} "
                    "and re-run so the browser opens for oauth with caption scope.",
                    file=sys.stderr,
                )
                raise
        else:
            if not CREDENTIALS_FILE.is_file():
                print(f"Missing {CREDENTIALS_FILE}", file=sys.stderr)
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), scopes)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    return build("youtube", "v3", credentials=creds)


def fmt_srt_time(sec: float) -> str:
    if sec < 0:
        sec = 0
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec - 3600 * h - 60 * m
    whole = int(s)
    ms = int(round((s - whole) * 1000))
    return f"{h:02d}:{m:02d}:{whole:02d},{ms:03d}"


def transcript_to_srt(text: str, duration_sec: float) -> str:
    """Spread plain transcript across duration in ~200-char cues (no word timings)."""
    text = (text or "").strip()
    if not text:
        return (
            "1\n00:00:00,000 --> "
            f"{fmt_srt_time(max(1.0, duration_sec))}\n(music or no speech detected)\n"
        )
    words = text.split()
    chunks: list[str] = []
    cur: list[str] = []
    for w in words:
        cur.append(w)
        if len(" ".join(cur)) >= 200:
            chunks.append(" ".join(cur))
            cur = []
    if cur:
        chunks.append(" ".join(cur))
    n = max(1, len(chunks))
    step = duration_sec / n if duration_sec > 0 else 5.0
    lines: list[str] = []
    t = 0.0
    for i, c in enumerate(chunks):
        start = t
        end = min(duration_sec if duration_sec > 0 else (i + 1) * step, t + step)
        if end - start < 0.05:
            end = start + 0.2
        lines.append(f"{i + 1}\n{fmt_srt_time(start)} --> {fmt_srt_time(end)}\n{c}\n")
        t = end
    return "\n".join(lines)


def title_from_basename(name: str) -> str:
    base = re.sub(r"_Full HD \d+p\.(MP4|mp4|mov)$", "", name)
    base = base.replace(".MP4", "").replace(".mp4", "")
    return f"{base} | Agroverse"


MIN_STORY_DURATION_SEC = 45.0
MIN_STORY_WORDS = 80

BEAN_HUMAN_TITLE_LOWER: dict[str, str] = {
    "bean to bliss episode 9_full hd 1080p.mp4": "Bean to Bliss — Episode 9",
    "bean to bliss episode 10 - tiktok_full hd 1080p.mp4": "Bean to Bliss — Episode 10 (TikTok)",
    "bean to bliss episode 10 - tiktok_full hd 1081.mp4": "Bean to Bliss — Episode 10 (TikTok)",
    "b2b ep 10 - tiktok part 2_full hd 1080p.mp4": "Bean to Bliss — B2B ep 10 (TikTok part 2)",
    "bean to bliss episode 12_full hd 1081.mp4": "Bean to Bliss — Episode 12",
    "bean to bliss episode 12_full hd 1080p.mp4": "Bean to Bliss — Episode 12",
}


def word_count(text: str) -> int:
    return len(((text or "").strip()).split())


def is_story_grade(row: dict) -> bool:
    dur = float(row.get("duration_sec") or 0)
    return dur >= MIN_STORY_DURATION_SEC and word_count(row.get("transcript") or "") >= MIN_STORY_WORDS


def build_upload_title_map(manifest_videos: list[dict], upload_basenames: list[str]) -> dict[str, str]:
    """Content-aware + Bean labels; disambiguate within this upload batch."""
    by_b = {v["basename"]: v for v in manifest_videos}
    cleaned_by: dict[str, str] = {}
    preliminary: dict[str, str] = {}
    for b in upload_basenames:
        row = by_b.get(b) or {}
        transcript = row.get("transcript") or ""
        bl = b.lower()
        cleaned_by[b] = clean_transcript(transcript)
        if bl in BEAN_HUMAN_TITLE_LOWER:
            preliminary[b] = BEAN_HUMAN_TITLE_LOWER[bl]
        else:
            preliminary[b] = propose_title(cleaned_by[b], b)
    final = disambiguate_stories(preliminary, cleaned_by)
    final = apply_story_title_overrides(final)
    return final


def description_for_video(title: str, transcript: str) -> str:
    body = (transcript or "").strip()
    tail = (
        "\n\n—\n"
        "🌐 Agroverse: https://www.agroverse.shop\n"
        "📝 Full episode transcript appears above for accessibility and search.\n"
        "#cacao #ceremonialcacao #Brazil #Bahia #Agroverse #beantobliss"
    )
    prefix = f"{title}\n\n"
    combined = prefix + body + tail
    if len(combined) > 4900:
        cut = 4900 - len(tail) - len(prefix) - 40
        body = body[: max(0, cut)] + "\n\n[Description truncated; see video captions for full transcript.]"
    return prefix + body + tail


def tags_default(title: str) -> list[str]:
    base = [
        "cacao",
        "ceremonial cacao",
        "Brazil",
        "Bahia",
        "Agroverse",
        "Bean to Bliss",
        "chocolate",
        "regenerative agriculture",
    ]
    return base[:]


def upload_video(youtube, path: Path, title: str, description: str, tags: list[str]):
    body = {
        "snippet": {
            "title": title[:100],
            "description": description[:5000],
            "tags": tags[:500],
            "categoryId": "24",
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False,
        },
    }
    media = MediaFileUpload(str(path), chunksize=-1, resumable=True, mimetype="video/mp4")
    req = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
    resp = None
    while resp is None:
        _, resp = req.next_chunk()
    return resp


def upload_caption(youtube, video_id: str, srt_path: Path):
    body = {
        "snippet": {
            "videoId": video_id,
            "language": "en",
            "name": "English (transcript)",
            "isDraft": False,
        }
    }
    media = MediaFileUpload(str(srt_path), mimetype="application/octet-stream", resumable=False)
    return youtube.captions().insert(part="snippet", body=body, media_body=media).execute()


def load_mapping() -> dict:
    if MAPPING_FILE.is_file():
        return json.loads(MAPPING_FILE.read_text(encoding="utf-8"))
    return {}


def save_mapping(m: dict) -> None:
    MAPPING_FILE.write_text(json.dumps(m, indent=2), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", type=Path, default=REPO_ROOT / "docs/incoming_videos_2026-04/manifest.json")
    ap.add_argument("--skips", type=Path, default=SCRIPT_DIR / "incoming_upload_skips.json")
    ap.add_argument("--max", type=int, default=0, help="Max uploads (0 = no limit)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--include-non-story",
        action="store_true",
        help="Upload shorter/quieter clips too (default: only story-grade: ≥%.0fs and ≥%d words)"
        % (MIN_STORY_DURATION_SEC, MIN_STORY_WORDS),
    )
    ap.add_argument(
        "--captions",
        action="store_true",
        help="Upload SRT captions (needs youtube.force-ssl). Delete youtube_token.json once if refresh fails, then re-consent.",
    )
    args = ap.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    skips = set()
    if args.skips.is_file():
        skips = set(json.loads(args.skips.read_text(encoding="utf-8")).get("skip_basenames") or [])

    videos = manifest.get("videos") or []
    # Raw transcripts keyed by basename (used for the polished description at upload).
    raw_by_bn = {
        v.get("basename"): (v.get("transcript") or "")
        for v in videos
        if v.get("basename")
    }
    todo = [v for v in videos if v.get("basename") not in skips]

    youtube = None
    if not args.dry_run:
        print("Authenticating YouTube API…", flush=True)
        youtube = get_youtube_service(captions=args.captions)

    mapping = load_mapping()
    done = 0

    upload_queue: list[dict] = []
    for v in todo:
        path = Path(v["path"])
        base = v["basename"]
        if not path.is_file():
            print(f"SKIP missing file: {path}", flush=True)
            continue
        if base in mapping:
            print(f"SKIP already in youtube_videos.json: {base}", flush=True)
            continue
        if not v.get("youtube_upload_recommended", True):
            print(f"SKIP duplicate / not recommended: {base}", flush=True)
            continue
        if not args.include_non_story and not is_story_grade(v):
            print(f"SKIP non-story (use --include-non-story): {base}", flush=True)
            continue
        upload_queue.append(v)

    # Every cached entry must carry a polished description (uniform format).
    for bn, entry in mapping.items():
        if not (entry.get("description") or "").strip():
            raise SystemExit(
                f"ERROR: {bn} in youtube_videos.json has no polished description. "
                "Run generate_youtube_descriptions.py first."
            )

    title_map = build_upload_title_map(videos, [v["basename"] for v in upload_queue])

    for v in upload_queue:
        if args.max and done >= args.max:
            print(f"Stopping after --max {args.max} uploads.", flush=True)
            break
        path = Path(v["path"])
        base = v["basename"]
        human = title_map.get(base) or propose_title(clean_transcript(v.get("transcript") or ""), base)
        title = youtube_snippet_title(human)
        # Build the polished, blog-parity description (clean_transcript +
        # Grok polish cache-first) so the cache never stores raw ASR text.
        desc = build_description(
            base,
            {
                "video_id": "",
                "title": title,
            },
            raw_by_bn=raw_by_bn,
        )
        tags = tags_default(title)
        duration = float(v.get("duration_sec") or 0)
        srt_content = transcript_to_srt(v.get("transcript") or "", duration)

        if args.dry_run:
            gps = gps_for_source(str(path))
            gps_txt = (
                f"  gps: {gps['latitude']}, {gps['longitude']} [file_exif]"
                if gps
                else "  gps: (none)"
            )
            print(f"DRY-RUN upload: {base}\n  title: {title}\n{gps_txt}\n", flush=True)
            done += 1
            continue

        print(f"\n=== Uploading ({done + 1}) {base} ===", flush=True)
        try:
            resp = upload_video(youtube, path, title, desc, tags)
        except HttpError as e:
            print(f"VIDEO UPLOAD FAILED: {e}", flush=True)
            try:
                print(json.loads(e.content.decode()) if e.content else "", flush=True)
            except Exception:
                pass
            break

        vid = resp["id"]
        entry = {
            "video_id": vid,
            "url": f"https://www.youtube.com/watch?v={vid}",
            "embed_url": f"https://www.youtube.com/embed/{vid}",
            "title": title,
            "description": desc,
            "uploaded_via": "youtube_batch_incoming.py",
        }
        # Capture the source file's own embedded GPS at ingress (highest
        # precision; the file is in hand right now) so the cache is geo-searchable.
        gps = gps_for_source(str(path))
        if gps:
            entry["latitude"] = gps["latitude"]
            entry["longitude"] = gps["longitude"]
            entry["gps_source"] = "file_exif"
        mapping[base] = entry
        save_mapping(mapping)

        if args.captions:
            tmp = Path(tempfile.mkdtemp()) / "captions.srt"
            tmp.write_text(srt_content, encoding="utf-8")
            try:
                upload_caption(youtube, vid, tmp)
                print(f"Captions uploaded for {vid}", flush=True)
            except HttpError as e:
                print(f"Caption upload failed (video is live): {e}", flush=True)
            finally:
                tmp.unlink(missing_ok=True)
        else:
            print("Captions: skipped (use --captions after re-consent, or polish in YouTube Studio).", flush=True)

        done += 1

    print(f"\nDone. Uploaded this run: {done}. Mapping: {MAPPING_FILE}", flush=True)


if __name__ == "__main__":
    main()
