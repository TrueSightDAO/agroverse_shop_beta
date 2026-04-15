#!/usr/bin/env python3
"""
One-time (or idempotent) injection of partner inventory snippet assets into
partners/*/index.html. Skips partners/index.html and any file already marked.
"""

from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PARTNERS_DIR = REPO / "partners"

MARKER = "<!-- partner-inventory-snippets-bundle -->"

BUNDLE_TAIL = f"""{MARKER}
<link href="../../css/cards.css" rel="stylesheet"/>
<link href="../../css/catalog-snippet-cards.css" rel="stylesheet"/>
<link href="../../css/partner-inventory-snippets.css" rel="stylesheet"/>
<script src="../../js/partner-catalog-snippets.js"></script>"""

ADD_TO_CART_LINE = '<script src="../../js/add-to-cart.js"></script>'
CART_UI_LINE = '<script src="../../js/cart-ui.js"></script>'


def inject_html(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        return False

    if ADD_TO_CART_LINE in text:
        replacement = (
            '<script src="../../js/products.js"></script>\n'
            '<script src="../../js/inventory-service.js"></script>\n'
            '<script src="../../js/inventory-display.js"></script>\n'
            f"{ADD_TO_CART_LINE}\n"
            f"{BUNDLE_TAIL}"
        )
        text = text.replace(ADD_TO_CART_LINE, replacement, 1)
        path.write_text(text, encoding="utf-8")
        return True

    if CART_UI_LINE in text and ADD_TO_CART_LINE not in text:
        insertion = (
            f"{CART_UI_LINE}\n"
            '<script src="../../js/products.js"></script>\n'
            '<script src="../../js/inventory-service.js"></script>\n'
            '<script src="../../js/inventory-display.js"></script>\n'
            f"{ADD_TO_CART_LINE}\n"
            f"{BUNDLE_TAIL}"
        )
        text = text.replace(CART_UI_LINE, insertion, 1)
        path.write_text(text, encoding="utf-8")
        return True

    return False


def main() -> None:
    changed = 0
    skipped = 0
    for path in sorted(PARTNERS_DIR.glob("*/index.html")):
        if path.parent.name == "partners":
            continue
        if inject_html(path):
            changed += 1
        else:
            skipped += 1
    print(f"Updated: {changed}")
    print(f"Skipped (marker present or no hook): {skipped}")


if __name__ == "__main__":
    main()
