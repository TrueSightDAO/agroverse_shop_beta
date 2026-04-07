#!/usr/bin/env python3
"""
Push updated titles to YouTube using Data API videos.update (snippet only).

Requires scripts/youtube_credentials.json and a token with scope that allows
metadata edits (use youtube.force-ssl). If uploads used youtube.upload only,
delete scripts/youtube_token.json and re-authorize when prompted.

Reads titles from scripts/youtube_videos.json ("title" field per basename).

**Workflow:** Run after **`generate_video_transcript_blog_posts.py`** or any edit to **`youtube_videos.json`** so YouTube matches the blog (see **`agentic_ai_context/DOWNLOADS_MEDIA_TO_AGROVERSE.md`** §7 and end-to-end checklist). **OAuth:** requires **`youtube.force-ssl`**; on **`invalid_scope`** run **`youtube_oauth_reauthorize.py`** then retry.

Usage (from agroverse_shop/):
  python3 scripts/youtube_update_video_titles.py --dry-run
  python3 scripts/youtube_update_video_titles.py --basename "Project 10-13_Full HD 1080p.MP4"
  python3 scripts/youtube_update_video_titles.py   # all entries
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCRIPT_DIR = Path(__file__).resolve().parent
CREDENTIALS_FILE = SCRIPT_DIR / "youtube_credentials.json"
TOKEN_FILE = SCRIPT_DIR / "youtube_token.json"
MAPPING_FILE = SCRIPT_DIR / "youtube_videos.json"

# Metadata updates require this scope (broader than upload-only).
SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]


def get_youtube_service():
    creds = None
    if TOKEN_FILE.is_file():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_FILE.is_file():
                print(f"Missing {CREDENTIALS_FILE}", file=sys.stderr)
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    return build("youtube", "v3", credentials=creds)


def fetch_snippet(youtube, video_id: str) -> dict:
    r = youtube.videos().list(part="snippet", id=video_id).execute()
    items = r.get("items") or []
    if not items:
        raise SystemExit(f"No video found for id {video_id}")
    return items[0]["snippet"]


def update_title(youtube, video_id: str, new_title: str, dry_run: bool) -> None:
    new_title = new_title.strip()[:100]
    if dry_run:
        print(f"  (dry-run) {video_id} -> {new_title[:90]!r}")
        return
    sn = fetch_snippet(youtube, video_id)
    old = sn.get("title") or ""
    if old == new_title:
        print(f"  (skip, unchanged) {video_id}: {new_title[:80]}")
        return
    print(f"  {video_id}: {old[:70]!r} -> {new_title[:70]!r}")
    sn["title"] = new_title
    youtube.videos().update(part="snippet", body={"id": video_id, "snippet": sn}).execute()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--basename", type=str, default="", help="Only this manifest basename key")
    args = ap.parse_args()

    if not MAPPING_FILE.is_file():
        print(f"Missing {MAPPING_FILE}", file=sys.stderr)
        sys.exit(1)
    mapping = json.loads(MAPPING_FILE.read_text(encoding="utf-8"))
    youtube = None
    if not args.dry_run:
        youtube = get_youtube_service()

    count = 0
    for base, row in sorted(mapping.items()):
        if args.basename and base != args.basename:
            continue
        vid = row.get("video_id")
        title = (row.get("title") or "").strip()
        if not vid or not title:
            continue
        try:
            update_title(youtube, vid, title, args.dry_run)
        except HttpError as e:
            print(f"  ERROR {base}: {e}", file=sys.stderr)
            continue
        count += 1
    print(f"Processed {count} mapping entries." + (" (dry-run)" if args.dry_run else ""))


if __name__ == "__main__":
    main()
