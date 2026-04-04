"""Helpers for Open Graph preview images (dimensions, public origin)."""
from __future__ import annotations

import os
import re
from pathlib import Path


def public_origin() -> str:
    return os.environ.get("AGROVERSE_PUBLIC_ORIGIN", "https://www.agroverse.shop").rstrip("/")


def default_og_image_url() -> str:
    return f"{public_origin()}/assets/images/blog/bahia-photo-library/cocoa-ripe-pods-yellow-grove.jpg"


DEFAULT_OG_CARD_PATH = "/assets/images/blog/bahia-photo-library/cocoa-ripe-pods-yellow-grove.jpg"


def jpeg_dimensions(path: Path) -> tuple[int, int] | None:
    """Read width/height from JPEG without external deps (SOF marker)."""
    try:
        data = path.read_bytes()
    except OSError:
        return None
    if len(data) < 10 or data[0:2] != b"\xff\xd8":
        return None
    i = 2
    while i < len(data) - 9:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        seg_len = int.from_bytes(data[i + 2 : i + 4], "big")
        if marker in (0xC0, 0xC1, 0xC2):
            h = int.from_bytes(data[i + 5 : i + 7], "big")
            w = int.from_bytes(data[i + 7 : i + 9], "big")
            return w, h
        i += 2 + seg_len
    return None


def strip_og_image_dims(html: str) -> str:
    html = re.sub(r"\n<meta content=\"\d+\" property=\"og:image:width\"/>", "", html)
    html = re.sub(r"\n<meta content=\"\d+\" property=\"og:image:height\"/>", "", html)
    return html


def dims_for_site_path(repo_root: Path, site_path: str) -> tuple[int, int] | None:
    if not site_path.startswith("/assets/"):
        return None
    p = repo_root / site_path.lstrip("/")
    return jpeg_dimensions(p)
