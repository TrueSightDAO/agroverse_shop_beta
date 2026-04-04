#!/usr/bin/env python3
"""
Polish ASR transcripts via xAI Grok for blog publishing.

Reads GROK_API_KEY from the environment. Caches results under
scripts/transcript_grok_polish_cache.json (keyed by SHA-256 of raw transcript + basename).

No third-party deps (stdlib only).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import ssl
import urllib.error
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CACHE_FILE = SCRIPT_DIR / "transcript_grok_polish_cache.json"
GROK_URL = "https://api.x.ai/v1/chat/completions"
# grok-3 used elsewhere in this workspace; override with GROK_MODEL if needed.
DEFAULT_MODEL = os.environ.get("GROK_MODEL", "grok-3")


def _cache_load() -> dict[str, str]:
    if not CACHE_FILE.is_file():
        return {}
    try:
        data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def _cache_save(mapping: dict[str, str]) -> None:
    CACHE_FILE.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding="utf-8")


def cache_key(basename: str, raw_transcript: str) -> str:
    h = hashlib.sha256()
    h.update(basename.encode("utf-8", errors="replace"))
    h.update(b"\0")
    h.update((raw_transcript or "").encode("utf-8", errors="replace"))
    return h.hexdigest()


def _parse_dotenv_value(line: str) -> tuple[str, str] | None:
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    if "=" not in line:
        return None
    key, _, rest = line.partition("=")
    key = key.strip()
    val = rest.strip().strip("'").strip('"')
    if key and val:
        return key, val
    return None


def get_api_key() -> str | None:
    k = (os.environ.get("GROK_API_KEY") or "").strip()
    if k:
        return k
    # Sibling repo (common in this workspace): Applications/market_research/.env
    env_file = SCRIPT_DIR.parent.parent / "market_research" / ".env"
    if not env_file.is_file():
        return None
    try:
        for line in env_file.read_text(encoding="utf-8").splitlines():
            parsed = _parse_dotenv_value(line)
            if parsed and parsed[0] == "GROK_API_KEY":
                return parsed[1]
    except OSError:
        return None
    return None


def polish_transcript_grok(
    raw_transcript: str,
    basename: str,
    *,
    title_hint: str = "",
    model: str | None = None,
    temperature: float = 0.35,
    timeout_sec: int = 120,
) -> str | None:
    """
    Return polished plain text, or None if no API key / request failed.
    """
    api_key = get_api_key()
    text = (raw_transcript or "").strip()
    if not api_key or not text:
        return None

    m = model or DEFAULT_MODEL
    key = cache_key(basename, text)
    cache = _cache_load()
    if key in cache and (cache[key] or "").strip():
        return cache[key].strip()

    system = (
        "You edit field-video transcripts for Agroverse, a Brazilian cacao and regenerative-farming story brand.\n"
        "Rules:\n"
        "- Output ONLY the cleaned transcript as plain prose (no title, no markdown, no bullet lists unless the speaker used them).\n"
        "- Fix obvious speech-recognition errors; prefer cacao/cocoa orchard terms, farm workflows (ferment, dry, pod, cabruca, etc.).\n"
        "- Keep first-person voice and facts; do not invent places, people, or numbers.\n"
        "- Merge broken phrases into readable sentences; add punctuation; split into short paragraphs separated by a blank line when the topic shifts.\n"
        "- If a phrase is hopelessly unclear, omit it or replace with [inaudible] sparingly.\n"
    )
    user = (
        (f"Context (video / post title): {title_hint}\n\n" if title_hint else "")
        + "Transcript to clean:\n\n"
        + text
    )
    payload = json.dumps(
        {
            "model": m,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        GROK_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout_sec, context=ctx) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None

    try:
        out = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return None
    out = (out or "").strip()
    if not out:
        return None
    # Strip accidental markdown code fences
    out = re.sub(r"^```[a-z]*\s*", "", out, flags=re.I)
    out = re.sub(r"\s*```$", "", out)
    cache[key] = out.strip()
    _cache_save(cache)
    return cache[key]


def transcript_for_blog(
    raw_transcript: str,
    basename: str,
    *,
    locally_cleaned: str,
    title_hint: str = "",
    min_words_for_grok: int = 40,
) -> str:
    """
    Prefer Grok-polished text when API key is set and transcript is long enough; otherwise locally_cleaned.
    """
    base = locally_cleaned.strip()
    raw = (raw_transcript or "").strip()
    if not src_words_ok(raw or base, min_words_for_grok):
        return base
    polished = polish_transcript_grok(raw, basename, title_hint=title_hint)
    return polished.strip() if polished and polished.strip() else base


def src_words_ok(text: str, min_words: int) -> bool:
    return len(text.split()) >= min_words
