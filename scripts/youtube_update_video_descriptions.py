#!/usr/bin/env python3
"""
Push updated descriptions to YouTube using Data API videos.update (snippet only).

Mirrors youtube_update_video_titles.py: reads descriptions from
scripts/youtube_videos.json ("description" field per basename) and pushes them
via videos().update(part="snippet"), preserving all other snippet fields
(title, tags, categoryId, ...) from the live video.

Requires YouTube OAuth with scope youtube.force-ssl (same as title updates).
Credentials live in scripts/youtube_credentials.json + youtube_token.json by
default; pass --config-dir to point at a different dir (e.g. the autopilot
box's /opt/truesight_autopilot/config/youtube).

Usage (from agroverse_shop/):
  python3 scripts/youtube_update_video_descriptions.py --dry-run
  python3 scripts/youtube_update_video_descriptions.py --basename "Project 10-13_Full HD 1080p.MP4"
  python3 scripts/youtube_update_video_descriptions.py   # all entries (live)
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

# YouTube description length limit.
MAX_DESC = 5000


def get_youtube_service(config_dir: Path):
    creds_file = config_dir / "youtube_credentials.json"
    token_file = config_dir / "youtube_token.json"
    creds = None
    if token_file.is_file():
        creds = Credentials.from_authorized_user_file(str(token_file), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not creds_file.is_file():
                print(f"Missing {creds_file}", file=sys.stderr)
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_file), SCOPES)
            creds = flow.run_local_server(port=0)
        token_file.write_text(creds.to_json(), encoding="utf-8")
    return build("youtube", "v3", credentials=creds)


def fetch_snippet(youtube, video_id: str) -> dict:
    r = youtube.videos().list(part="snippet", id=video_id).execute()
    items = r.get("items") or []
    if not items:
        raise SystemExit(f"No video found for id {video_id}")
    return items[0]["snippet"]


def update_description(youtube, video_id: str, new_desc: str, dry_run: bool) -> None:
    new_desc = (new_desc or "").strip()[:MAX_DESC]
    if dry_run:
        # Still fetch the live snippet so the diff is real, not self-reported.
        try:
            sn = fetch_snippet(youtube, video_id)
            old = sn.get("description") or ""
        except SystemExit as e:
            print(f"  (dry-run) {video_id}: {e}")
            return
        if old == new_desc:
            print(f"  (skip, unchanged) {video_id}")
        else:
            print(f"  {video_id}:")
            print(f"    OLD ({len(old)}): {old[:120]!r}")
            print(f"    NEW ({len(new_desc)}): {new_desc[:120]!r}")
        return
    sn = fetch_snippet(youtube, video_id)
    old = sn.get("description") or ""
    if old == new_desc:
        print(f"  (skip, unchanged) {video_id}")
        return
    print(f"  {video_id}: {old[:70]!r} -> {new_desc[:70]!r}")
    sn["description"] = new_desc
    youtube.videos().update(
        part="snippet", body={"id": video_id, "snippet": sn}
    ).execute()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch live descriptions and print diffs only; no changes.",
    )
    ap.add_argument(
        "--basename", type=str, default="", help="Only this manifest basename key"
    )
    ap.add_argument(
        "--config-dir",
        type=Path,
        default=SCRIPT_DIR,
        help="Dir with youtube_credentials.json + youtube_token.json (default: this script's dir)",
    )
    args = ap.parse_args()

    if not MAPPING_FILE.is_file():
        print(f"Missing {MAPPING_FILE}", file=sys.stderr)
        sys.exit(1)
    mapping = json.loads(MAPPING_FILE.read_text(encoding="utf-8"))
    # The service is needed in both modes: dry-run still fetches the live
    # "before" description via videos.list so the diff is real, not self-reported.
    youtube = get_youtube_service(args.config_dir)

    count = 0
    for base, row in sorted(mapping.items()):
        if args.basename and base != args.basename:
            continue
        vid = row.get("video_id")
        desc = (row.get("description") or "").strip()
        if not vid or not desc:
            continue
        try:
            update_description(youtube, vid, desc, args.dry_run)
        except HttpError as e:
            print(f"  ERROR {base}: {e}", file=sys.stderr)
            continue
        count += 1
    print(
        f"Processed {count} mapping entries." + (" (dry-run)" if args.dry_run else "")
    )


if __name__ == "__main__":
    main()
