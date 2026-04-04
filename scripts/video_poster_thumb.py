"""
Blog listing thumbnails: first frame from local video (ffmpeg) or YouTube poster fallback.

Writes JPEGs under assets/images/blog/transcript-thumbs/{slug}.jpg
"""
from __future__ import annotations

import shutil
import subprocess
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
THUMB_DIR = REPO / "assets" / "images" / "blog" / "transcript-thumbs"
DEFAULT_POSTER_NAMES = ("maxresdefault", "hqdefault", "mqdefault")


def thumb_web_path(slug: str) -> str:
    return f"/assets/images/blog/transcript-thumbs/{slug}.jpg"


def thumb_fs_path(slug: str) -> Path:
    return THUMB_DIR / f"{slug}.jpg"


def _ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def extract_frame_ffmpeg(video: Path, dest: Path, seek_sec: float = 0.0) -> bool:
    """Grab one frame at `seek_sec` (default 0 = first frame per product/blog spec)."""
    if not video.is_file():
        return False
    if not _ffmpeg_available():
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    vf = "scale='min(1280,iw)':-2"
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        str(seek_sec),
        "-i",
        str(video),
        "-frames:v",
        "1",
        "-vf",
        vf,
        "-q:v",
        "3",
        "-y",
        str(dest),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    return r.returncode == 0 and dest.is_file() and dest.stat().st_size > 800


def download_youtube_poster(video_id: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    for name in DEFAULT_POSTER_NAMES:
        url = f"https://i.ytimg.com/vi/{video_id}/{name}.jpg"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AgroverseThumb/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            if len(data) < 2000:
                continue
            dest.write_bytes(data)
            return True
        except (urllib.error.HTTPError, urllib.error.URLError, OSError, TimeoutError):
            continue
    return False


def ensure_post_thumbnail(
    slug: str,
    *,
    video_path: str | None,
    video_id: str | None,
    force_refresh: bool = False,
) -> str | None:
    """
    Create transcript-thumbs/{slug}.jpg when possible.
    Returns site-relative image URL, or None to use theme default.
    """
    dest = thumb_fs_path(slug)
    if not force_refresh and dest.is_file() and dest.stat().st_size > 800:
        return thumb_web_path(slug)

    vp = Path(video_path) if video_path else None
    if vp and extract_frame_ffmpeg(vp, dest):
        print(f"  thumb(ffmpeg): {slug} <- {vp.name}")
        return thumb_web_path(slug)

    if video_id and download_youtube_poster(video_id, dest):
        print(f"  thumb(youtube): {slug} <- {video_id}")
        return thumb_web_path(slug)

    if dest.is_file():
        dest.unlink(missing_ok=True)
    return None
