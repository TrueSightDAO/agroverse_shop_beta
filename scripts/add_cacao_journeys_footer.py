#!/usr/bin/env python3
"""Insert Cacao Journeys footer link after Partners (matches site index footer)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(html: str) -> tuple[str, bool]:
    if re.search(
        r"Partners</a></li>\s*<li><a href=\"\.\./\.\./cacao-journeys/index\.html\">",
        html,
    ):
        return html, False

    pattern = re.compile(
        r'(<li><a href="\.\./\.\./partners/index\.html">Partners</a></li>)\s*'
        r'(<li><a href="\.\./\.\./order-history/">Order History</a></li>)',
        re.MULTILINE,
    )

    def repl(m: re.Match[str]) -> str:
        return (
            f"{m.group(1)}\n"
            '<li><a href="../../cacao-journeys/index.html">Cacao Journeys</a></li>\n'
            f"{m.group(2)}"
        )

    new_html, n = pattern.subn(repl, html, count=1)
    return new_html, n > 0


def main() -> None:
    changed = 0
    for path in sorted((ROOT / "post").glob("*/index.html")):
        raw = path.read_text(encoding="utf-8")
        if "sitemap-omit: redirect stub" in raw:
            continue
        new, did = patch(raw)
        if did:
            path.write_text(new, encoding="utf-8")
            print(path.relative_to(ROOT))
            changed += 1
    print(f"Patched {changed} files", file=sys.stderr)


if __name__ == "__main__":
    main()
