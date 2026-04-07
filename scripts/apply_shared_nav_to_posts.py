#!/usr/bin/env python3
"""Remove duplicate inline mobile-menu scripts, add navigation.js + image-url-helper, hoist cart.css to <head>."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS_GLOB = ROOT / "post"


def remove_inline_menu_after_overlay(html: str) -> str:
    marker = '<div class="mobile-menu-overlay"></div>'
    start = html.find(marker)
    if start == -1:
        return html
    after = start + len(marker)
    rest = html[after:]
    stripped = rest.lstrip()
    if not stripped.startswith("<script>"):
        return html
    ws_len = len(rest) - len(stripped)
    s = after + ws_len
    e = html.find("</script>", s)
    if e == -1:
        return html
    e += len("</script>")
    inner = html[s:e]
    if "menuToggle" not in inner and "mobileMenu" not in inner:
        return html
    return html[:after] + "\n" + html[e:].lstrip("\n")


def ensure_nav_scripts(html: str) -> str:
    if "navigation.js" in html:
        return html
    needle = '<script src="../../js/config.js"></script>'
    if needle not in html:
        print("WARN: no config.js anchor", file=sys.stderr)
        return html
    insertion = (
        needle
        + "\n<script src=\"../../js/image-url-helper.js\"></script>"
        + "\n<script src=\"../../js/navigation.js\"></script>"
    )
    return html.replace(needle, insertion, 1)


def hoist_cart_css(html: str) -> str:
    link = '<link href="../../css/cart.css" rel="stylesheet"/>'
    if link not in html:
        return html
    head_end = html.lower().find("</head>")
    if head_end == -1:
        return html
    head = html[:head_end]
    tail = html[head_end:]
    if "cart.css" in head:
        tail2 = tail
        while link in tail2:
            tail2 = tail2.replace(link + "\n", "", 1)
            tail2 = tail2.replace("\n" + link, "", 1)
        if tail2 != tail:
            return head + tail2
        return html
    if link not in tail:
        return html
    tail2 = tail.replace(link + "\n", "", 1)
    tail2 = tail2.replace("\n" + link, "", 1)
    insert = f"    {link}\n"
    return head + insert + tail2


def process_file(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    updated = raw
    updated = remove_inline_menu_after_overlay(updated)
    updated = ensure_nav_scripts(updated)
    updated = hoist_cart_css(updated)
    if updated != raw:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = 0
    for path in sorted(POSTS_GLOB.glob("*/index.html")):
        if process_file(path):
            changed += 1
            print(path.relative_to(ROOT))
    print(f"Updated {changed} post index.html files")


if __name__ == "__main__":
    main()
