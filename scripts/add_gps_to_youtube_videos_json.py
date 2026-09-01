#!/usr/bin/env python3
"""Backfill latitude/longitude/gps_source into scripts/youtube_videos.json.

GPS is read from the SOURCE FILE's own embedded metadata (highest precision),
falling back to the committed farm manifests (rounded) when the source file
is not present on this box. Precision is recorded in `gps_source` so LLMs
can trust the values they search by.

Sources, in priority order:
  1. file_exif      — source file present on this box, exact DMS parsed from
                      QuickTime GPSCoordinates / EXIF GPS (S/W -> negative)
  2. farm_manifest  — matched entry in FARM_MEDIA_MANIFESTS/<farm>.json
                      (may be rounded to whole degrees; marked as such)
  3. (absent)       — no source found; field omitted entirely

Usage:
  python3 scripts/add_gps_to_youtube_videos_json.py [--source-dirs D1 D2 ...]
      --source-dirs: extra dirs to search for source files (defaults to the
      known farm work dirs on the autopilot box). Use --write to apply.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MAPPING = REPO_ROOT / "scripts" / "youtube_videos.json"

# Farm work dirs where source MOV/MP4s live on the autopilot box.
DEFAULT_SOURCE_DIRS = [
    "/home/ubuntu/santa_anna_fazenda",
    "/home/ubuntu/santa_anna_new",
    "/home/ubuntu/santa_anna_work/mp4",
    "/home/ubuntu/cleide_work/mp4",
    "/home/ubuntu/la_do_sitio_work",
    "/tmp",
]

FARM_MANIFEST_DIR = REPO_ROOT.parent / "agentic_ai_context" / "FARM_MEDIA_MANIFESTS"
# Also try the aac checkout used on this box.
ALT_MANIFEST_DIR = Path("/tmp/aac_work/FARM_MEDIA_MANIFESTS")

DMS_RE = re.compile(
    r"(?P<lat_d>\d+)\s*deg\s+(?P<lat_m>\d+)'\s+(?P<lat_s>[\d.]+)\"\s+(?P<lat_h>[NS])"
    r",\s*(?P<lon_d>\d+)\s*deg\s+(?P<lon_m>\d+)'\s+(?P<lon_s>[\d.]+)\"\s+(?P<lon_h>[EW])"
)


def dms_to_decimal(deg: float, minutes: float, sec: float, hemi: str) -> float:
    dec = deg + minutes / 60.0 + sec / 3600.0
    return -dec if hemi in ("S", "W") else dec


def gps_from_exiftool(path: str) -> dict | None:
    """Return {'latitude','longitude'} parsed from the file's own EXIF/QuickTime GPS."""
    try:
        out = subprocess.run(
            ["exiftool", "-s", "-s", "-GPSCoordinates", path],
            capture_output=True,
            text=True,
            timeout=30,
        ).stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        return None
    if not out:
        return None
    m = DMS_RE.search(out)
    if not m:
        return None
    lat = dms_to_decimal(
        float(m.group("lat_d")),
        float(m.group("lat_m")),
        float(m.group("lat_s")),
        m.group("lat_h"),
    )
    lon = dms_to_decimal(
        float(m.group("lon_d")),
        float(m.group("lon_m")),
        float(m.group("lon_s")),
        m.group("lon_h"),
    )
    return {"latitude": round(lat, 6), "longitude": round(lon, 6)}


def load_farm_manifests() -> dict[str, dict]:
    """basename -> {'latitude','longitude'} from FARM_MEDIA_MANIFESTS/*.json."""
    out: dict[str, dict] = {}
    for d in (FARM_MANIFEST_DIR, ALT_MANIFEST_DIR):
        if not d.is_dir():
            continue
        for p in sorted(d.glob("*.json")):
            if p.name in ("index.json", "README.md"):
                continue
            try:
                data = json.loads(p.read_text())
            except Exception:
                continue
            for item in data.get("items", []):
                lat = item.get("latitude")
                lon = item.get("longitude")
                if lat is None or lon is None:
                    continue
                for key in ("file", "basename"):
                    f = item.get(key)
                    if f:
                        out[os.path.basename(f)] = {"latitude": lat, "longitude": lon}
                        out[f] = {"latitude": lat, "longitude": lon}
    return out


def gps_for_source(path: str) -> dict | None:
    """Return {'latitude','longitude'} for a source file, or None.

    Thin wrapper so uploaders can capture GPS at ingress without importing
    exiftool plumbing. Mirrors gps_from_exiftool() (exact DMS, S/W negative).
    """
    return gps_from_exiftool(path)


def find_source_file(basename: str, source_dirs: list[str]) -> str | None:
    """Locate a source file for a mapping key across candidate dirs."""
    candidates = [basename]
    stem = os.path.splitext(basename)[0]
    for ext in (".MOV", ".mov", ".mp4", ".MP4", ".jpg", ".jpeg", ".HEIC", ".heic"):
        candidates.append(stem + ext)
    for d in source_dirs:
        for c in candidates:
            p = os.path.join(d, c)
            if os.path.isfile(p):
                return p
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source-dirs", nargs="*", default=DEFAULT_SOURCE_DIRS)
    ap.add_argument(
        "--write",
        action="store_true",
        help="apply changes to youtube_videos.json (default: dry-run)",
    )
    args = ap.parse_args()

    mapping = json.loads(MAPPING.read_text())
    farm_gps = load_farm_manifests()

    changes = 0
    for basename, entry in mapping.items():
        if "latitude" in entry:
            continue  # already has GPS
        src = find_source_file(basename, args.source_dirs)
        gps = None
        source = None
        if src:
            gps = gps_from_exiftool(src)
            if gps:
                source = "file_exif"
        if gps is None:
            key = os.path.basename(basename)
            if key in farm_gps:
                gps = farm_gps[key]
                source = "farm_manifest"
        if gps:
            entry["latitude"] = gps["latitude"]
            entry["longitude"] = gps["longitude"]
            entry["gps_source"] = source
            changes += 1
            if not args.write:
                print(
                    f"  + {basename[:55]:<57} {gps['latitude']:>10.6f}, {gps['longitude']:>11.6f} [{source}]"
                )
        else:
            print(f"  ~ {basename[:55]:<57} (no GPS source found)")

    print(
        f"\n{changes} entries would get GPS ({'WRITTEN' if args.write else 'dry-run'})."
    )
    if args.write:
        MAPPING.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
