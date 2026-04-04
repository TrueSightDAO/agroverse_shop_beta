#!/usr/bin/env python3
"""
Propose YouTube titles for field-note videos (basename "Project ...") using Grok.

Priority:
1. If a matching blog post exists under post/, use its title/meta/H1/excerpt as context.
2. Otherwise fetch the video snippet from YouTube, ask Grok to clean the description,
   then ask Grok to derive a title from that cleaned description.

Updates scripts/youtube_videos.json. Optionally pushes titles via youtube_update_video_titles.py.

Requires GROK_API_KEY (env or repo/.env). YouTube fetch/update uses the same OAuth files as
youtube_update_video_titles.py when --push-youtube or when a fallback description is needed.

From agroverse_shop/:
  python3 scripts/youtube_grok_project_titles.py --dry-run --max 3
  python3 scripts/youtube_grok_project_titles.py --scope placeholder --push-youtube
  python3 scripts/youtube_grok_project_titles.py --scope all --max 50
"""
from __future__ import annotations

import argparse
import html as html_lib
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
POST_DIR = REPO_ROOT / "post"
MAPPING_FILE = SCRIPT_DIR / "youtube_videos.json"

GROK_ENDPOINT = "https://api.x.ai/v1/chat/completions"
GROK_MODEL = "grok-3"

GENERIC_TITLE_RE = re.compile(
    r"^Project\s+\d{2}-\d{2}(?:\(\d+\))?\s*\|\s*Agroverse\s*$",
    re.IGNORECASE,
)
EMBED_RE = re.compile(r"""youtube\.com/embed/([a-zA-Z0-9_-]{11})""")
BASENAME_PROJECT_RE = re.compile(
    r"^Project\s+(\d{2}-\d{2})(?:\((\d+)\))?.+\.MP4$",
    re.IGNORECASE,
)


def load_dotenv_grok_key() -> str | None:
    if os.environ.get("GROK_API_KEY"):
        return os.environ.get("GROK_API_KEY")
    env_paths = [
        REPO_ROOT / ".env",
        SCRIPT_DIR / ".env",
        REPO_ROOT.parent / "market_research" / ".env",
    ]
    for p in env_paths:
        if not p.is_file():
            continue
        for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if line.startswith("GROK_API_KEY=") and not line.startswith("#"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def grok_chat(api_key: str, system: str, user: str, temperature: float = 0.35) -> str:
    payload = json.dumps(
        {
            "model": GROK_MODEL,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        GROK_ENDPOINT,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Grok HTTP {e.code}: {e.read().decode('utf-8', errors='replace')}") from e
    choices = body.get("choices") or []
    if not choices:
        raise SystemExit(f"Unexpected Grok response: {body!r}")
    return choices[0]["message"]["content"]


def parse_json_object(text: str) -> dict[str, Any]:
    t = text.strip()
    if "```json" in t:
        a = t.find("```json") + 7
        b = t.find("```", a)
        t = t[a:b].strip()
    elif "```" in t:
        a = t.find("```") + 3
        b = t.find("```", a)
        t = t[a:b].strip()
    return json.loads(t)


def build_video_to_posts() -> dict[str, list[Path]]:
    vid_posts: dict[str, list[Path]] = {}
    if not POST_DIR.is_dir():
        return vid_posts
    for index in sorted(POST_DIR.glob("*/index.html")):
        raw = index.read_text(encoding="utf-8", errors="replace")
        for m in EMBED_RE.finditer(raw):
            vid = m.group(1)
            vid_posts.setdefault(vid, []).append(index)
    return vid_posts


def expected_slug_from_basename(basename: str) -> str | None:
    m = BASENAME_PROJECT_RE.match(basename.strip())
    if not m:
        return None
    core, sub = m.group(1), m.group(2)
    if sub:
        return f"project-{core}-{sub}"
    return f"project-{core}"


def pick_blog_path(basename: str, video_id: str, vid_posts: dict[str, list[Path]]) -> Path | None:
    candidates = vid_posts.get(video_id) or []
    slug = expected_slug_from_basename(basename)
    if slug:
        preferred = POST_DIR / slug / "index.html"
        if preferred.is_file() and video_id in preferred.read_text(encoding="utf-8", errors="replace"):
            return preferred
        for p in candidates:
            if p.parent.name == slug:
                return p
    return candidates[0] if candidates else None


def strip_html_to_text(html: str, limit: int = 6000) -> str:
    t = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", html)
    t = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html_lib.unescape(t)
    t = re.sub(r"\s+", " ", t).strip()
    return t[:limit]


def extract_blog_context(html: str) -> dict[str, str]:
    title_m = re.search(r"<title>([^<]+)</title>", html, re.I)
    desc_m = re.search(
        r'<meta\s+content="([^"]*)"\s+name="description"',
        html,
        re.I,
    )
    og_desc_m = re.search(
        r'<meta\s+content="([^"]*)"\s+property="og:description"',
        html,
        re.I,
    )
    h1_m = re.search(
        r'<h1[^>]*class="blog-title"[^>]*>([^<]+)</h1>',
        html,
        re.I,
    )
    excerpt = desc_m.group(1) if desc_m else ""
    if og_desc_m and len((og_desc_m.group(1) or "").strip()) > len(excerpt):
        excerpt = og_desc_m.group(1) or excerpt
    return {
        "page_title": html_lib.unescape((title_m.group(1) if title_m else "").strip()),
        "h1": html_lib.unescape((h1_m.group(1) if h1_m else "").strip()),
        "meta_description": html_lib.unescape(excerpt.strip()),
        "body_excerpt": strip_html_to_text(html, 4000),
    }


def finalize_youtube_title(title: str) -> str:
    s = re.sub(r"\s+", " ", (title or "").strip())
    s = s.strip("\"'")
    if not s:
        return s
    low = s.lower()
    suffix = " | Agroverse"
    if "agroverse" not in low:
        if len(s) + len(suffix) <= 100:
            s = s + suffix
        else:
            s = s[: max(0, 100 - len(suffix))].rstrip(" |–—-") + suffix
    if len(s) > 100:
        s = s[:100]
    return s


def grok_title_from_blog(api_key: str, ctx: dict[str, str], video_id: str, basename: str) -> str:
    system = (
        "You name YouTube videos for Agroverse (ceremonial cacao, Brazil farms, transparency). "
        "Output strictly one JSON object, no markdown, keys: youtube_title (string). "
        "Title must be specific and readable; max 88 characters before any brand suffix. "
        "Prefer concrete nouns (cacao, fermentation, farm, nursery, etc.) over vague phrases."
    )
    user = json.dumps(
        {
            "video_id": video_id,
            "source_file": basename,
            "blog_page_title": ctx["page_title"],
            "blog_h1": ctx["h1"],
            "blog_meta_description": ctx["meta_description"],
            "blog_plain_excerpt": ctx["body_excerpt"][:3500],
        },
        ensure_ascii=False,
        indent=2,
    )
    user += (
        "\n\nUse the blog content to choose the best single YouTube title. "
        "Do not include the words 'video' or 'transcript' unless essential. "
        "If the blog title is already excellent for YouTube, you may adapt it slightly for clarity."
    )
    raw = grok_chat(api_key, system, user, temperature=0.35)
    obj = parse_json_object(raw)
    t = (obj.get("youtube_title") or "").strip()
    if not t:
        raise ValueError(f"Grok returned empty youtube_title: {raw!r}")
    return finalize_youtube_title(t)


def grok_clean_description(api_key: str, raw_description: str, video_id: str) -> str:
    system = (
        "You edit YouTube descriptions for clarity. "
        "Return strictly one JSON object: {\"cleaned_description\": \"...\"}. "
        "Fix obvious ASR/typo issues; keep facts; 2–5 short sentences; no hashtags; no URLs unless present in input."
    )
    user = json.dumps(
        {"video_id": video_id, "youtube_description": raw_description[:12000]},
        ensure_ascii=False,
    )
    raw = grok_chat(api_key, system, user, temperature=0.25)
    obj = parse_json_object(raw)
    d = (obj.get("cleaned_description") or "").strip()
    if not d:
        raise ValueError(f"Grok returned empty cleaned_description: {raw!r}")
    return d


def grok_title_from_description(api_key: str, cleaned_description: str, video_id: str, basename: str) -> str:
    system = (
        "You name YouTube videos for Agroverse. "
        "Return strictly one JSON object: {\"youtube_title\": \"...\"}. "
        "Derive a specific title only from the description text; max 88 chars before brand suffix."
    )
    user = json.dumps(
        {
            "video_id": video_id,
            "source_file": basename,
            "cleaned_description": cleaned_description[:4000],
        },
        ensure_ascii=False,
    )
    raw = grok_chat(api_key, system, user, temperature=0.35)
    obj = parse_json_object(raw)
    t = (obj.get("youtube_title") or "").strip()
    if not t:
        raise ValueError(f"Grok returned empty youtube_title: {raw!r}")
    return finalize_youtube_title(t)


def get_youtube_service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    creds_file = SCRIPT_DIR / "youtube_credentials.json"
    token_file = SCRIPT_DIR / "youtube_token.json"
    scopes = ["https://www.googleapis.com/auth/youtube.force-ssl"]
    creds = None
    if token_file.is_file():
        creds = Credentials.from_authorized_user_file(str(token_file), scopes)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not creds_file.is_file():
                print(f"Missing {creds_file}", file=sys.stderr)
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_file), scopes)
            creds = flow.run_local_server(port=0)
        token_file.write_text(creds.to_json(), encoding="utf-8")
    return build("youtube", "v3", credentials=creds)


def fetch_snippet(youtube, video_id: str) -> dict[str, Any]:
    r = youtube.videos().list(part="snippet", id=video_id).execute()
    items = r.get("items") or []
    if not items:
        raise SystemExit(f"No YouTube video for id {video_id}")
    return items[0]["snippet"]


def should_process(
    basename: str,
    current_title: str,
    scope: str,
) -> bool:
    if not basename.startswith("Project "):
        return False
    if scope == "all":
        return True
    return bool(GENERIC_TITLE_RE.match((current_title or "").strip()))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--scope",
        choices=("placeholder", "all"),
        default="placeholder",
        help="placeholder: only generic 'Project MM-DD | Agroverse' titles; all: every Project basename",
    )
    ap.add_argument("--dry-run", action="store_true", help="Do not write JSON or call YouTube update")
    ap.add_argument("--max", type=int, default=0, help="Process at most N entries (0 = no limit)")
    ap.add_argument("--basename", type=str, default="", help="Only this manifest key")
    ap.add_argument(
        "--push-youtube",
        action="store_true",
        help="After saving JSON, run youtube_update_video_titles.py for changed basenames",
    )
    args = ap.parse_args()

    api_key = load_dotenv_grok_key()
    if not api_key:
        print("Set GROK_API_KEY or add it to .env in the repo root.", file=sys.stderr)
        sys.exit(1)

    if not MAPPING_FILE.is_file():
        print(f"Missing {MAPPING_FILE}", file=sys.stderr)
        sys.exit(1)

    mapping = json.loads(MAPPING_FILE.read_text(encoding="utf-8"))
    vid_posts = build_video_to_posts()

    youtube = None
    changed: list[str] = []
    processed = 0

    for basename in sorted(mapping.keys()):
        if args.basename and basename != args.basename:
            continue
        row = mapping[basename]
        title = (row.get("title") or "").strip()
        vid = (row.get("video_id") or "").strip()
        if not vid:
            continue
        if not should_process(basename, title, args.scope):
            continue
        if args.max and processed >= args.max:
            break

        blog_path = pick_blog_path(basename, vid, vid_posts)
        old_title = title
        try:
            if blog_path:
                html = blog_path.read_text(encoding="utf-8", errors="replace")
                ctx = extract_blog_context(html)
                new_title = grok_title_from_blog(api_key, ctx, vid, basename)
                src = f"blog:{blog_path.parent.name}"
            else:
                if youtube is None:
                    youtube = get_youtube_service()
                sn = fetch_snippet(youtube, vid)
                raw_desc = (sn.get("description") or "").strip()
                if not raw_desc:
                    raw_desc = (sn.get("title") or "").strip()
                cleaned = grok_clean_description(api_key, raw_desc, vid)
                new_title = grok_title_from_description(api_key, cleaned, vid, basename)
                src = "youtube_description+grok"

            if not new_title:
                print(f"SKIP {basename}: empty title from Grok", file=sys.stderr)
                continue
            print(f"{basename}\n  [{src}] {old_title!r} -> {new_title!r}")
            if not args.dry_run:
                row["title"] = new_title
                row["title_source"] = src
            changed.append(basename)
            processed += 1
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            print(f"ERROR {basename}: {e}", file=sys.stderr)
            continue

    if changed and not args.dry_run:
        out = json.dumps(dict(sorted(mapping.items())), indent=2, ensure_ascii=False) + "\n"
        MAPPING_FILE.write_text(out, encoding="utf-8")
        print(f"Wrote {MAPPING_FILE} ({len(changed)} entries updated).")
    elif args.dry_run:
        print(f"Dry-run: would update {len(changed)} entries.")

    if args.push_youtube and changed and not args.dry_run:
        import subprocess

        updater = SCRIPT_DIR / "youtube_update_video_titles.py"
        for base in changed:
            subprocess.run([sys.executable, str(updater), "--basename", base], check=False)


if __name__ == "__main__":
    main()
