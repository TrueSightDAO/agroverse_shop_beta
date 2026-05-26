#!/usr/bin/env python3
"""Build a machine-readable index of Agroverse's published event pages.

Scans event-details-registration/<slug>/index.html (the public "cacao circle"
landing/recap pages) and emits event-details-registration/events.json — the
PAST-events tier of the unified Agroverse event registry.

    python3 scripts/build_events_json.py     # run from the agroverse_shop root

Title / description / image / location are read straight from each page. Dates
come from the page's structured event-meta field (📅), but on these generated
pages many dates are duplicated placeholders (e.g. several distinct events all
stamped the same day), so a date shared by >1 event is flagged
date_confidence="low" and listed under review_needed. Treat dates as a hint,
not ground truth, until reviewed.

Upcoming/operational events live in go_to_market/events/ (their own event.json
files); the unified registry is assembled by go_to_market/events/build_index.py.
Convention doc: agentic_ai_context/EVENTS.md
"""
import collections
import datetime
import glob
import json
import os
import re
from html import unescape

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGES_DIR = os.path.join(ROOT, "event-details-registration")
BASE_URL = "https://agroverse.shop/event-details-registration"


def _meta(content, pattern):
    m = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
    return unescape(m.group(1).strip()) if m else None


def _emoji_field(content, emoji):
    m = re.search(rf"{emoji}</span>\s*<span>([^<]*)</span>", content)
    return unescape(m.group(1).strip()) if m else None


def _parse_date(displayed):
    """'March 19, 2025 at 07:00 PM' -> ('2025-03-19', '07:00 PM'). Best effort."""
    if not displayed:
        return None, None
    time = None
    tm = re.search(r"\bat\s+(.+)$", displayed)
    if tm:
        time = tm.group(1).strip()
    date_part = re.sub(r"\s*\bat\b.*$", "", displayed).strip().replace(",", "")
    for fmt in ("%B %d %Y", "%d %B %Y"):
        try:
            return datetime.datetime.strptime(date_part, fmt).date().isoformat(), time
        except ValueError:
            continue
    return None, time


def extract(slug, path):
    with open(path, encoding="utf-8", errors="ignore") as f:
        content = f.read(500000)

    title = _meta(content, r"<title>(.*?)\s*\|\s*Agroverse</title>")
    if not title:
        title = _meta(content, r'property=["\']og:title["\']\s+content=["\'](.*?)["\']')
        if title:
            title = re.sub(r"\s*\|\s*Agroverse\s*$", "", title)
    description = (_meta(content, r'name=["\']description["\']\s+content=["\'](.*?)["\']')
                   or _meta(content, r'content=["\'](.*?)["\']\s+name=["\']description["\']')
                   or _meta(content, r'property=["\']og:description["\']\s+content=["\'](.*?)["\']'))
    image = (_meta(content, r'property=["\']og:image["\']\s+content=["\'](.*?)["\']')
             or _meta(content, r'content=["\'](.*?)["\']\s+property=["\']og:image["\']'))

    displayed = _emoji_field(content, "📅")
    location = _emoji_field(content, "📍")
    date, time = _parse_date(displayed)
    date_source = "page-meta" if date else None
    if not date:
        ym = re.search(r"(20\d{2})", slug)
        if ym:
            date, date_source = ym.group(1), "slug"

    rsvp = _meta(content, r'href=["\'](https?://(?:lu\.ma|www\.eventbrite\.com|eventbrite\.com)/[^"\']+)')

    return {
        "slug": slug,
        "title": title,
        "status": "past",
        "date": date,
        "date_displayed": displayed,
        "time": time,
        "date_source": date_source,
        "date_confidence": None,   # filled in main() once duplicates are known
        "location": location,
        "url": f"{BASE_URL}/{slug}/",
        "rsvp_url": rsvp,
        "description": description,
        "image": image,
    }


def main():
    events = [extract(os.path.basename(os.path.dirname(p)), p)
              for p in sorted(glob.glob(os.path.join(PAGES_DIR, "*", "index.html")))]

    # Duplicate ISO dates across distinct events => almost certainly placeholders.
    iso_counts = collections.Counter(e["date"] for e in events
                                     if e["date"] and len(e["date"]) == 10)
    today = datetime.date.today().isoformat()
    for e in events:
        d = e["date"]
        if d and len(d) == 10:
            e["date_confidence"] = "low" if iso_counts[d] > 1 else "medium"
            e["status"] = "upcoming" if d >= today else "past"
        elif d:  # year only
            e["date_confidence"] = "low"
        else:
            e["date_confidence"] = None

    events.sort(key=lambda e: (e["date"] or "0000"), reverse=True)
    review = [e["slug"] for e in events if e["date_confidence"] in (None, "low")]

    out = {
        "schema_version": 1,
        "description": ("Published Agroverse event pages (cacao circles). PAST tier of "
                        "the unified event registry; upcoming/operational events live in "
                        "go_to_market/events/. Convention: agentic_ai_context/EVENTS.md"),
        "source": "agroverse_shop/event-details-registration",
        "generated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "generated_by": "scripts/build_events_json.py",
        "count": len(events),
        "date_review_needed": review,
        "events": events,
    }
    out_path = os.path.join(PAGES_DIR, "events.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"wrote {out_path} ({len(events)} events)")
    if review:
        print(f"\n⚠ {len(review)} event(s) need a date review (null, year-only, or "
              f"a date shared with other events / likely placeholder):")
        for e in events:
            if e["date_confidence"] in (None, "low"):
                print(f"  - {e['date'] or '(none)':10} {e['slug']}")


if __name__ == "__main__":
    main()
