#!/usr/bin/env python3
"""Guard: every journey stop's card image must actually resolve.

Why this exists
---------------
The Brazilian path page sets `imagePath` per stop, falling back to
`assets/images/farms/<slug>.jpg`. If that file is absent the <img> carries
`onerror="this.style.display='none'"`, so the card renders with NO image and
NO visible error. Two stops were silently broken this way (Sítio Catarinense,
Fazenda Analuana) and stayed broken until a visual UAT pass happened to
screenshot the page.

This script makes that failure loud at review time. It deliberately mirrors
ONLY the resolution contract (explicit mapping, else the per-type default,
else the farm fallback) rather than re-implementing the whole render chain, so
there is little to drift.

Exit 0 = every image resolves. Exit 1 = at least one broken (CI should fail).
Stops listed in KNOWN_MISSING are reported but do not fail the build.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

PAGE = Path("cacao-journeys/brazilian-path/index.html")

# Stops known to lack an asset. Reported loudly, but they must not fail the
# build forever -- they need a real photograph, not a code change.
KNOWN_MISSING = {
    "fazenda-analuana-bahia": "no photograph exists in the repo; needs a real photo",
}

# Per-type default when a slug has no explicit mapping in the chain.
TYPE_DEFAULTS = {
    "partner": "../../assets/partners/headers/{slug}-header.jpg",
    "cooperative": "../../assets/cooperatives/headers/{slug}-header.jpeg",
    "farm": "../../assets/images/farms/{slug}.jpg",
}


def parse_stops(src: str) -> dict[str, str]:
    """slug -> type, for every stop literal in BRAZILIAN_PATH_DATA."""
    stops: dict[str, str] = {}
    for m in re.finditer(r"slug:\s*'([^']+)'[^}]*?type:\s*'([a-z]+)'", src, re.S):
        stops[m.group(1)] = m.group(2)
    return stops


def parse_explicit(src: str) -> dict[str, str]:
    """slug -> image path, for stops given an explicit branch in the chain."""
    explicit: dict[str, str] = {}
    # One-armed: `stop.slug === 'x' ? \`path\`` (ternary, used by partners)
    for m in re.finditer(
        r"stop\.slug === '([^']+)'\s*\?\s*`([^`]+)`", src, re.S
    ):
        explicit[m.group(1)] = m.group(2)
    # Two-armed: `else if (stop.slug === 'x') { imagePath = \`path\`; }`
    # Allows // comments between the brace and the assignment -- a mapping is
    # usually given a comment explaining the photo choice, and a stricter
    # pattern silently misses it (which shows up as a false BROKEN report).
    for m in re.finditer(
        r"stop\.slug === '([^']+)'\)\s*\{\s*(?://[^\n]*\n\s*)*imagePath\s*=\s*`([^`]+)`",
        src,
        re.S,
    ):
        explicit[m.group(1)] = m.group(2)
    return explicit


def resolve(stop: str, stype: str, explicit: dict[str, str]) -> str | None:
    if stop in explicit:
        return explicit[stop]
    default = TYPE_DEFAULTS.get(stype)
    return default.format(slug=stop) if default else None


def main() -> int:
    if not PAGE.exists():
        print(f"FAIL: {PAGE} not found (run from the repo root)")
        return 1

    src = PAGE.read_text(encoding="utf-8")
    stops = parse_stops(src)
    explicit = parse_explicit(src)

    root = PAGE.parent
    broken: list[tuple[str, str, str]] = []   # slug, type, resolved path
    known: list[tuple[str, str, str]] = []
    unresolved: list[tuple[str, str]] = []    # experience with no mapping
    ok = 0

    for stop, stype in sorted(stops.items()):
        path = resolve(stop, stype, explicit)
        if path is None:
            unresolved.append((stop, stype))
            continue
        if path.startswith(("http://", "https://")):
            ok += 1          # remote; not fetched at review time
            continue
        local = (root / path).resolve()
        if local.exists():
            ok += 1
        elif stop in KNOWN_MISSING:
            known.append((stop, stype, path))
        else:
            broken.append((stop, stype, path))

    print(f"journey card images: {len(stops)} stops checked")
    print(f"  explicit mappings : {len(explicit)}")
    print(f"  resolve OK        : {ok}")

    for stop, stype, path in known:
        print(f"  KNOWN MISSING     : {stop} ({stype}) -> {path}")
        print(f"                      {KNOWN_MISSING[stop]}")

    for stop, stype in unresolved:
        print(f"  UNRESOLVED        : {stop} ({stype}) has no explicit image and no {stype} default")

    for stop, stype, path in broken:
        print(f"  BROKEN            : {stop} ({stype}) -> {path} does not exist")

    if broken or unresolved:
        print(
            f"\nFAIL: {len(broken)} broken, {len(unresolved)} unresolved.\n"
            "These cards will render with no image and no visible error "
            "(onerror hides the <img>). Add the asset or an explicit mapping."
        )
        return 1

    print("\nOK: all journey card images resolve.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
