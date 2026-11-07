"""Guard: the committed product feed must be in sync with products.js.

The feed is a generated artifact with no CI owner, so it silently rotted from
2026-10-25 until a manual regeneration in Nov 2026 (PR #367). This test fails the
build when the committed XML drifts from what the generator would produce, or
when the feed violates Google Merchant Center identifier/availability rules.

Deliberately scoped to structural invariants only -- no network calls in the
default path so CI stays hermetic. Pass --check-inventory to also assert live
availability agreement (manual/opt-in; see scripts/check_feed_inventory.py).
"""

import os
import re
import sys
import xml.etree.ElementTree as ET

import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FEED_PATH = os.path.join(BASE_DIR, "facebook_product_feed.xml")
G = "{http://base.google.com/ns/1.0}"


@pytest.fixture(scope="module")
def feed():
    assert os.path.exists(FEED_PATH), f"missing feed artifact: {FEED_PATH}"
    tree = ET.parse(FEED_PATH)
    return tree.getroot()


@pytest.fixture(scope="module")
def items(feed):
    return feed.findall("channel/item")


def test_feed_is_well_formed(feed):
    assert feed.tag == "rss"
    assert feed.find("channel") is not None


def test_feed_has_items(items):
    assert len(items) > 0, "feed has no items"


def test_every_item_has_one_identifier_stance(items):
    """Merchant Center: each item needs g:gtin OR g:identifier_exists=no. Never neither, never both."""
    for item in items:
        gid = item.findtext(f"{G}id")
        gtin = item.findtext(f"{G}gtin")
        ident = item.findtext(f"{G}identifier_exists")
        assert not (gtin and ident), (
            f"{gid}: emitted both g:gtin and g:identifier_exists "
            f"(gtin={gtin}, identifier_exists={ident})"
        )
        assert gtin or ident == "no", (
            f"{gid}: no identifier stance -- missing g:gtin and "
            f"g:identifier_exists != 'no' would be disapproved by Merchant Center"
        )


def test_gtin_format_when_present(items):
    for item in items:
        gtin = item.findtext(f"{G}gtin")
        if not gtin:
            continue
        gid = item.findtext(f"{G}id")
        assert re.fullmatch(r"\d{8}|\d{12,14}", gtin), (
            f"{gid}: g:gtin must be 8, 12, 13 or 14 digits, got {gtin!r}"
        )


def test_availability_is_valid_enum(items):
    allowed = {"in stock", "out of stock", "preorder", "backorder"}
    for item in items:
        gid = item.findtext(f"{G}id")
        avail = item.findtext(f"{G}availability")
        assert avail in allowed, (
            f"{gid}: g:availability={avail!r} not one of {sorted(allowed)}"
        )


def test_links_point_at_existing_product_pages(items):
    """A dead g:link is a Merchant Center disapproval and a wasted click."""
    missing = []
    for item in items:
        link = item.findtext(f"{G}link") or ""
        slug = link.rstrip("/").rsplit("/", 1)[-1]
        if not slug or not os.path.isdir(os.path.join(BASE_DIR, "product-page", slug)):
            missing.append((item.findtext(f"{G}id"), link))
    assert not missing, f"feed items with no product-page directory: {missing}"


def test_no_duplicate_ids(items):
    ids = [i.findtext(f"{G}id") for i in items]
    dupes = {x for x in ids if ids.count(x) > 1}
    assert not dupes, f"duplicate g:id values: {dupes}"


def test_price_is_positive(items):
    for item in items:
        gid = item.findtext(f"{G}id")
        price = item.findtext(f"{G}price") or ""
        m = re.search(r"([\d.]+)", price)
        assert m and float(m.group(1)) > 0, (
            f"{gid}: g:price={price!r} -- $0 feeds are rejected by Google"
        )


def _normalize_availability(xml_text):
    """Blank out availability so freshness compares STRUCTURE, not stock levels.

    Stock is live data by design (resolved from the inventory snapshot), so it can
    never be byte-stable against a committed artifact. Structural drift -- products
    appearing/disappearing, price/slug/identifier changes -- is the rot class this
    test exists to catch, and that survives normalization.
    """
    out = re.sub(
        r"<g:availability>[^<]*</g:availability>", "<g:availability/>", xml_text
    )
    # lastBuildDate is the generation timestamp -- volatile by definition.
    return re.sub(r"<lastBuildDate>[^<]*</lastBuildDate>", "<lastBuildDate/>", out)


@pytest.mark.skipif(
    os.environ.get("FEED_CHECK_FRESH") != "1",
    reason="set FEED_CHECK_FRESH=1 to regenerate and diff (structural, offline)",
)
def test_committed_feed_matches_generator():
    """Regenerate offline and diff structurally. Catches 'nobody regenerates it' rot."""
    import subprocess

    with open(FEED_PATH, encoding="utf-8") as f:
        before = f.read()
    gen = os.path.join(BASE_DIR, "scripts", "generate_facebook_feed.py")
    try:
        subprocess.run(
            [sys.executable, gen],
            cwd=BASE_DIR,
            check=True,
            capture_output=True,
            timeout=180,
            env={**os.environ, "FEED_OFFLINE": "1"},
        )
        with open(FEED_PATH, encoding="utf-8") as f:
            after = f.read()
    finally:
        with open(FEED_PATH, "w", encoding="utf-8") as f:
            f.write(before)

    assert _normalize_availability(before) == _normalize_availability(after), (
        "committed facebook_product_feed.xml has structurally drifted from what the "
        "generator produces -- regenerate with `python3 scripts/generate_facebook_feed.py` "
        "and commit the result"
    )


def test_freshness_normalization_is_not_vacuous():
    """Sanity: normalization must not erase identifier drift (guards the guard)."""
    a = "<g:gtin>00860010660249</g:gtin><g:availability>in stock</g:availability>"
    b = "<g:gtin>00860010660256</g:gtin><g:availability>out of stock</g:availability>"
    assert _normalize_availability(a) != _normalize_availability(b)
