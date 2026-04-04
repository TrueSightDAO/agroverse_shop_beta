#!/usr/bin/env python3
"""Remove legacy intro <p> blocks above YouTube embeds on transcript posts."""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
POST_DIR = REPO / "post"

REMOVE: list[re.Pattern[str]] = [
    re.compile(
        r'<p><strong>Watch on YouTube</strong>\s*below,\s*then read the transcript\.\s*'
        r"It was lightly edited for readability from machine-generated captions\.</p>\s*",
        re.I,
    ),
    re.compile(
        r"<p><strong>Watch on YouTube</strong>\s*below\.\s*The transcript was lightly edited for readability "
        r"from machine-generated captions\.</p>\s*",
        re.I,
    ),
    re.compile(
        r"<p><strong>Watch on YouTube</strong>\s*below\.\s*The write-up is the full machine-made transcript "
        r"from the field audio—treat it as raw notes you can edit into narrative later\.</p>\s*",
        re.I,
    ),
    re.compile(
        r"<p><strong>Three related clips</strong> from episode 10—each with its own player\.\s*"
        r"Transcripts were lightly edited for readability from machine-generated captions\.</p>\s*",
        re.I,
    ),
]


def strip_file(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    out = raw
    for pat in REMOVE:
        out = pat.sub("", out)
    if out != raw:
        path.write_text(out, encoding="utf-8")
        return True
    return False


def main() -> None:
    n = 0
    for idx in sorted(POST_DIR.glob("*/index.html")):
        if strip_file(idx):
            print(idx.parent.name, flush=True)
            n += 1
    print(f"Updated {n} pages.", file=sys.stderr)


if __name__ == "__main__":
    main()
