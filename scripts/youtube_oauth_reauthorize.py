#!/usr/bin/env python3
"""
Start OAuth for YouTube Data API v3 with the scopes needed for uploads + metadata edits.

A browser window opens (or copy the URL from the terminal). Sign in with the channel
owner account (e.g. admin@truesight.me) and approve access. Writes scripts/youtube_token.json.

Scope: https://www.googleapis.com/auth/youtube.force-ssl  
(same as youtube_update_video_titles.py; suffices for uploads if captions were consented separately).

If you previously authorized with a narrower scope, delete youtube_token.json first:

  rm scripts/youtube_token.json
  python3 scripts/youtube_oauth_reauthorize.py

Requires scripts/youtube_credentials.json (Desktop OAuth client from Google Cloud Console).

Related Cloud Console pages (pick your project — the one whose OAuth client JSON you downloaded):
  - Credentials: https://console.cloud.google.com/apis/credentials
  - YouTube Data API v3: https://console.cloud.google.com/apis/library/youtube.googleapis.com
  - OAuth consent screen: https://console.cloud.google.com/apis/credentials/consent
"""
from __future__ import annotations

import sys
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow

SCRIPT_DIR = Path(__file__).resolve().parent
CREDENTIALS_FILE = SCRIPT_DIR / "youtube_credentials.json"
TOKEN_FILE = SCRIPT_DIR / "youtube_token.json"

SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]


def main() -> None:
    if not CREDENTIALS_FILE.is_file():
        print(f"Missing {CREDENTIALS_FILE}", file=sys.stderr)
        sys.exit(1)
    flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
    print("Opening browser for Google sign-in. Choose admin@truesight.me (or the YouTube channel owner).", flush=True)
    creds = flow.run_local_server(port=0, open_browser=True)
    TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    print(f"Saved {TOKEN_FILE}")


if __name__ == "__main__":
    main()
