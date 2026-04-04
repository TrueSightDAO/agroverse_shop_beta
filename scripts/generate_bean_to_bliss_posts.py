#!/usr/bin/env python3
"""Delegates to generate_video_transcript_blog_posts.py (Bean + story transcript posts)."""

import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from generate_video_transcript_blog_posts import main

if __name__ == "__main__":
    main()
