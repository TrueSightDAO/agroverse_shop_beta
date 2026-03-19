#!/usr/bin/env python3
"""
Translate Portuguese lab report PDFs to English summaries using Grok API.

Usage:
  python translate_lab_report.py [pdf_url_or_path]
  # Or with extracted text piped:
  python translate_lab_report.py --text "$(cat extracted.txt)"

Grok API key: GROK_API_KEY env var, or .env in video_editor/ or current dir.
"""

import argparse
import json
import os
import sys
from pathlib import Path

import requests

# Try to load .env from video_editor (common location for Grok key)
def _load_grok_key():
    key = os.environ.get("GROK_API_KEY")
    if key:
        return key
    for p in [
        Path(__file__).parent.parent.parent / "video_editor" / ".env",
        Path.cwd() / ".env",
    ]:
        if p.exists():
            try:
                from dotenv import load_dotenv
                load_dotenv(p)
                key = os.environ.get("GROK_API_KEY")
                if key:
                    return key
            except ImportError:
                pass
    return None


def extract_text_from_pdf(pdf_path_or_url: str) -> str:
    """Extract text from PDF file or URL."""
    import pdfplumber
    import tempfile

    if pdf_path_or_url.startswith("http"):
        import urllib.request
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            urllib.request.urlretrieve(pdf_path_or_url, f.name)
            path = f.name
        try:
            with pdfplumber.open(path) as pdf:
                return "\n\n".join(p.extract_text() or "" for p in pdf.pages)
        finally:
            os.unlink(path)
    else:
        with pdfplumber.open(pdf_path_or_url) as pdf:
            return "\n\n".join(p.extract_text() or "" for p in pdf.pages)


def translate_lab_report(portuguese_text: str, report_id: str = "") -> dict:
    """
    Send Portuguese lab report text to Grok and get English summary + translation.

    Returns dict with: summary (concise), full_translation (complete), key_results (list)
    """
    api_key = _load_grok_key()
    if not api_key:
        raise ValueError(
            "GROK_API_KEY not set. Set env var or add to video_editor/.env"
        )

    system = """You are a technical translator. Translate Brazilian Portuguese lab reports (relatórios de ensaio) for cacao/cocoa products into clear English.

For each report, provide:
1. summary: A concise 2-4 sentence English summary for consumers (certifications, key results, compliance).
2. key_results: A structured list of the main test parameters and results in English (e.g., "Heavy Metals - Arsenic: < 0.025 mg/kg (below limit)").
3. full_translation: Complete translation of all sections into English, preserving structure and technical accuracy.

Respond with valid JSON only, in this exact format:
{"summary": "...", "key_results": ["...", "..."], "full_translation": "..."}"""

    user = f"""Translate this Portuguese lab report to English and provide the summary format above.

Report identifier: {report_id or "Lab Report"}

--- Portuguese text ---
{portuguese_text}
--- End ---"""

    resp = requests.post(
        "https://api.x.ai/v1/chat/completions",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        json={
            "model": "grok-3",
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
        timeout=90,
    )

    if not resp.ok:
        raise Exception(f"Grok API error {resp.status_code}: {resp.text}")

    content = resp.json()["choices"][0]["message"]["content"]
    # Extract JSON from markdown if present
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].split("```")[0].strip()
    return json.loads(content)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", nargs="?", help="PDF URL, file path, or --text for stdin")
    ap.add_argument("--text", action="store_true", help="Read raw text from stdin")
    ap.add_argument("--id", default="", help="Report identifier for output")
    args = ap.parse_args()

    if args.text:
        text = sys.stdin.read()
    elif args.input:
        if args.input.startswith("http") or os.path.isfile(args.input):
            text = extract_text_from_pdf(args.input)
        else:
            print("Error: input must be URL or file path", file=sys.stderr)
            sys.exit(1)
    else:
        print("Usage: translate_lab_report.py <pdf_url|path> [--id LAB_ID]", file=sys.stderr)
        sys.exit(1)

    result = translate_lab_report(text, args.id)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
