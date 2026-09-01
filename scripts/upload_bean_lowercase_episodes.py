#!/usr/bin/env python3
"""
Upload lowercase Bean to Bliss episode files from Downloads (episodes 1–7, 11),
then append entries to scripts/youtube_videos.json.

Skips episode 8 (per editorial policy) and skips basenames already present in the mapping.

Requires: scripts/youtube_credentials.json, scripts/youtube_token.json (same as upload_video_to_youtube.py).

Usage (from repo root):
  python3 scripts/upload_bean_lowercase_episodes.py
  python3 scripts/upload_bean_lowercase_episodes.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
UPLOADER = SCRIPT_DIR / "upload_video_to_youtube.py"
MAP_PATH = SCRIPT_DIR / "youtube_videos.json"
DOWNLOADS = Path.home() / "Downloads"

EPISODES = (1, 2, 3, 4, 5, 6, 7, 11)


def basename_for_ep(n: int) -> str:
    return f"bean to bliss episode {n}.MP4"


def youtube_title(ep: int) -> str:
    return f"Bean to Bliss — Episode {ep} (field clip) | Agroverse #Shorts"


def description_from_transcript(text: str, ep: int) -> str:
    t = (text or "").strip()
    if not t:
        t = f"Bean to Bliss episode {ep}: field clip from the Agroverse cacao journey in Brazil."
    # YouTube max ~5000; keep headroom
    if len(t) > 4500:
        t = t[:4490].rstrip() + "…"
    footer = (
        f"\n\nFull transcript and context on the Agroverse blog:\n"
        f"https://www.agroverse.shop/post/bean-to-bliss-episode-{ep}/\n\n"
        f"#Shorts #Cacao #Brazil #BeanToBliss #Agroverse"
    )
    room = 5000 - len(footer)
    body = t[: max(0, room)]
    return body + footer


def parse_video_id(stdout: str) -> str | None:
    m = re.search(r"Video ID:\s*([A-Za-z0-9_-]+)", stdout)
    return m.group(1) if m else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--downloads",
        type=Path,
        default=DOWNLOADS,
        help="Folder containing the MP4 files (default: ~/Downloads)",
    )
    args = ap.parse_args()

    manifest_path = REPO / "docs/incoming_videos_2026-04/manifest.json"
    if not manifest_path.is_file():
        print(f"Missing {manifest_path}", file=sys.stderr)
        sys.exit(1)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    by_base = {v["basename"]: v for v in manifest.get("videos") or []}

    yt = json.loads(MAP_PATH.read_text(encoding="utf-8"))

    for ep in EPISODES:
        b = basename_for_ep(ep)
        path = args.downloads / b
        if b in yt:
            print(f"Skip (already mapped): {b}")
            continue
        if not path.is_file():
            print(f"Missing file, skip: {path}", file=sys.stderr)
            continue
        row = by_base.get(b) or {}
        desc = description_from_transcript(row.get("transcript") or "", ep)
        title = youtube_title(ep)
        cmd = [
            sys.executable,
            str(UPLOADER),
            str(path),
            "--title",
            title,
            "--description",
            desc,
            "--privacy",
            "public",
            "--tags",
            "Agroverse",
            "BeanToBliss",
            "cacao",
            "cocoa",
            "Brazil",
            "Bahia",
            "Shorts",
            "fieldvideo",
        ]
        print("→", " ".join(cmd[:4]), "…")
        if args.dry_run:
            continue
        proc = subprocess.run(cmd, cwd=str(REPO), capture_output=True, text=True)
        sys.stdout.write(proc.stdout)
        sys.stderr.write(proc.stderr)
        if proc.returncode != 0:
            print(f"Upload failed for {b} (exit {proc.returncode})", file=sys.stderr)
            sys.exit(proc.returncode)
        vid = parse_video_id(proc.stdout) or parse_video_id(proc.stderr)
        if not vid:
            print(f"Could not parse video id from output for {b}", file=sys.stderr)
            sys.exit(1)
        entry = {
            "video_id": vid,
            "url": f"https://www.youtube.com/watch?v={vid}",
            "embed_url": f"https://www.youtube.com/embed/{vid}",
            "title": title,
            "uploaded_via": "upload_bean_lowercase_episodes.py",
        }
        # Capture the source file's own embedded GPS at ingress.
        try:
            from add_gps_to_youtube_videos_json import gps_for_source

            gps = gps_for_source(str(path))
            if gps:
                entry["latitude"] = gps["latitude"]
                entry["longitude"] = gps["longitude"]
                entry["gps_source"] = "file_exif"
        except Exception:
            pass  # GPS is best-effort; never fail the upload over it.
        yt[b] = entry
        MAP_PATH.write_text(json.dumps(yt, indent=2), encoding="utf-8")
        print(f"Mapped {b} -> {vid}")

    print("Done.")


if __name__ == "__main__":
    main()
