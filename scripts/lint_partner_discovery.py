#!/usr/bin/env python3
"""Defense-in-depth lint for partner discovery surfaces.

Every directory under ``partners/<slug>/`` (with an ``index.html``) MUST
appear on the discovery surfaces a visitor uses to find that partner:

  1. ``partners/index.html``      — hub card with ``href="<slug>/index.html"``
  2. ``js/partners-data.js``      — entry keyed by ``'<slug>':``
  3. ``partner_locations.json``   — entry keyed by ``"<slug>":``

Failing any of these means the partner page exists but the visitor can
never find it from the hub map / partners listing — exactly the silent
failure that bit Shiok Kitchen in PR #92.

This lint complements ``dao_client/modules/onboard_partner.py`` step 5
(which automates the partners-data.js + partner_locations.json updates):
the lint is the safety net for partner pages that bypass the automated
flow (hand-crafted PRs, copies-of-existing-partner experiments, etc).

Exit code 0 if every partner has a complete discovery surface; 1 otherwise.

Run from the repo root:
    python3 scripts/lint_partner_discovery.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PARTNERS_DIR = REPO / "partners"
HUB_HTML = REPO / "partners" / "index.html"
PARTNERS_DATA_JS = REPO / "js" / "partners-data.js"
PARTNER_LOCATIONS_JSON = REPO / "partner_locations.json"

# Slugs that intentionally don't appear on every discovery surface even
# though they have a directory under partners/. Each entry needs a
# documented reason. Future additions go here only when the omission is
# deliberate (international partners absent from US-focused hub map,
# etc) — NOT when it's an oversight to be fixed.
EXEMPT_SLUGS: set[str] = {
    # International / origin partners — geographically outside the US-focused
    # hub map (js/partners-data.js + partner_locations.json), so their
    # absence from those surfaces is intentional. These DO appear on the
    # partners hub HTML in their own "international" cluster.
    "black-king-ilheus",            # Ilhéus, Bahia, Brazil — origin warehouse
    "cic-cacao-innovation-center",  # Ilhéus, Bahia, Brazil — lab + processing
    "shuar-design-boutique",        # Bern, Switzerland — fair-trade boutique
}


def list_partner_slugs() -> list[str]:
    if not PARTNERS_DIR.is_dir():
        return []
    out = []
    for entry in sorted(PARTNERS_DIR.iterdir()):
        if not entry.is_dir():
            continue
        if (entry / "index.html").is_file():
            out.append(entry.name)
    return out


def hub_html_slugs() -> set[str]:
    if not HUB_HTML.is_file():
        return set()
    text = HUB_HTML.read_text(encoding="utf-8")
    # Match href="<slug>/index.html" or href="<slug>/" — the partner-card
    # convention. Anchor on the partner-card class to avoid catching nav links.
    return set(re.findall(r'class="partner-card"\s+href="([a-z0-9][a-z0-9\-]*?)/index\.html"', text))


def partners_data_slugs() -> set[str]:
    if not PARTNERS_DATA_JS.is_file():
        return set()
    text = PARTNERS_DATA_JS.read_text(encoding="utf-8")
    return set(re.findall(r"^\s*'([a-z0-9][a-z0-9\-]*?)':\s*\{", text, re.MULTILINE))


def partner_locations_slugs() -> set[str]:
    if not PARTNER_LOCATIONS_JSON.is_file():
        return set()
    try:
        data = json.loads(PARTNER_LOCATIONS_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"  ERROR: {PARTNER_LOCATIONS_JSON.name} is invalid JSON: {e}", file=sys.stderr)
        return set()
    if not isinstance(data, dict):
        return set()
    return set(data.keys())


def main() -> int:
    slugs = list_partner_slugs()
    if not slugs:
        print("No partner directories found under partners/<slug>/. Skipping lint.")
        return 0

    hub = hub_html_slugs()
    pdata = partners_data_slugs()
    plocs = partner_locations_slugs()

    print(f"Scanning {len(slugs)} partner page(s) under partners/...")
    failures: list[tuple[str, list[str]]] = []
    for slug in slugs:
        if slug in EXEMPT_SLUGS:
            continue
        missing = []
        if slug not in hub:
            missing.append("partners/index.html (hub card)")
        if slug not in pdata:
            missing.append("js/partners-data.js")
        if slug not in plocs:
            missing.append("partner_locations.json")
        if missing:
            failures.append((slug, missing))

    if not failures:
        print(f"  ✓ All {len(slugs)} partners have complete discovery surfaces.")
        return 0

    print(f"\n  ✗ {len(failures)} partner(s) missing discovery surface entries:\n")
    for slug, missing in failures:
        print(f"    - {slug}")
        for m in missing:
            print(f"        missing: {m}")
    print(
        "\n  Fix: either run dao_client/modules/onboard_partner.py for this partner,\n"
        "  or hand-add the missing entries (alphabetical on the hub HTML; insert\n"
        "  before the closing '}' of PARTNERS_DATA in partners-data.js).\n"
        "\n  If a partner intentionally should NOT appear on a discovery surface,\n"
        "  add the slug to EXEMPT_SLUGS in this script with a documented reason."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
