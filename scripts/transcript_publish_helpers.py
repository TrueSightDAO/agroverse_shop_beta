"""
Heuristic cleanup and title inference for field-video transcripts (Whisper/ASR).

Keeps content on-device—no API calls. Suitable for readable blog copy, not legal transcripts.
"""
from __future__ import annotations

import re
import unicodedata
from pathlib import Path


KEYWORDS = re.compile(
    r"\b(cacao|cocoa|farm|ferment|harvest|brazil|bahia|amazon|pod|pods|bean|beans|"
    r"seedling|seedlings|chocolate|drying|shade|cabruka|cabruca|nib|nibs|lot|craft|"
    r"roast|melanger|greenhouse|transplant|ceremony|swamp|grove|estate)\b",
    re.I,
)

# Laughter / filler only (very short lines)
_LAUGH_ONLY = re.compile(r"(?i)^(\s*(ha|haha|uh|um|hmm|mm|yeah|ok|okay)[\s,.!]*)+$")

# Human-curated titles for known uploads (basename must match manifest exactly).
STORY_TITLE_OVERRIDES: dict[str, str] = {
    "Project 10-13_Full HD 1080p.MP4": "After a swamp walk to century-old cacao trees",
    "Project 11-02(1)_Full HD 1080p.MP4": "Making chocolate at home from Amazon rainforest cacao",
    "Project 09-18(3)_Full HD 1080p.MP4": "From cattle pasture to cacao: rebuilding the farm",
    "Project 03-26(1)_Full HD 1080p.MP4": "Stone melanger: cacao nibs to liquor for a small batch",
    "Project 09-26_Full HD 1080p.MP4": "Cacao pod selection walk on Oscar's farm",
    "Project 09-20_Full HD 1081.MP4": "Pruning witches' broom with Vivi across the grove",
    "Project 10-09_Full HD 1080p.MP4": "Day three sun-drying cacao on banana leaves",
    "Project 09-19_Full HD 1080p.MP4": "Cracking fresh cacao pods in the field",
    "oscar_farm_video_Full HD 1080p.MP4": "Sorting harvested cacao pods at Oscar's farm",
    "Project 10-07_Full HD 1080p.MP4": "Opening the box after seven days of cacao fermentation",
    "Project 05-23_Full HD 1080p.MP4": "Greenhouse visit: young cacao seedlings before transplant",
}


def apply_story_title_overrides(titles_by_basename: dict[str, str]) -> dict[str, str]:
    out = dict(titles_by_basename)
    for k, v in STORY_TITLE_OVERRIDES.items():
        if k in out:
            out[k] = polish_title_phrase(v)
    return out


def normalize_unicode(s: str) -> str:
    return unicodedata.normalize("NFKC", s or "")


def polish_title_phrase(s: str) -> str:
    s = (s or "").strip()
    s = s.rstrip(",;:")
    s = re.sub(r"\s+", " ", s)
    return s


def _apply_lexical_fixes(text: str) -> str:
    subs: list[tuple[str, str]] = [
        (r"\bKakakopots\b", "cacao pods"),
        (r"\bKakakopot\b", "cacao pod"),
        (r"\bKakakot\b", "cacao"),
        (r"\bkakobines\b", "cacao beans"),
        (r"\bkaka home\b", "cacao"),
        (r"\bKakawa\b", "cacao"),
        (r"\bKakao coconut\b", "cacao"),
        (r"\bKakao\b", "cacao"),
        (r"\bKakosaromony\b", "cacao ceremony"),
        (r"\bKakos beans\b", "Cacao beans"),
        (r"\bwitch flume\b", "witches' broom"),
        (r"\bWitch flume\b", "Witches' broom"),
        (r"\bnips into the cacao\b", "nibs into the cacao"),
        (r"\bcacao nips\b", "cacao nibs"),
        (r"\breturn nips\b", "return nibs"),
        (r"\bcacao loaker\b", "cacao melanger"),
        (r"\bBok Gakau\b", "Bulk cacao"),
        (r"\bBome Gakau\b", "Fine cacao"),
        (r"\bcuscating\b", "cascading"),
        (r"\bgacao nips\b", "cacao nibs"),
    ]
    out = text
    for pat, rep in subs:
        out = re.sub(pat, rep, out)
    out = re.sub(r"(?i)(\bha\b[,\s]*){5,}", "[Laughter] ", out)
    out = re.sub(r"\.{2,}", ". ", out)
    out = re.sub(r"\bcacao cacao\b", "cacao", out, flags=re.I)
    return out


def _pre_segment_sentences(text: str) -> str:
    """Insert breaks before common discourse markers so ASR wall-of-text splits."""
    if not text.strip():
        return text
    markers = (
        r"(?<=[a-z0-9,\)\]'\"])\s+("
        r"So|And|But|Then|Yeah|Okay|Oh|We|I|Today|After|Now|Here|This|They|He|She|"
        r"It|Sometimes|People|Most|When|Before|During|Later"
        r")\b"
    )
    return re.sub(markers, r". \1", text, flags=re.I)


def _split_sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text.strip())
    if not text:
        return []
    t = text.replace("?", ". ").replace("!", ". ")
    parts = re.split(r"\.\s+", t)
    out: list[str] = []
    for p in parts:
        p = p.strip(" .")
        if not p or len(p) < 3:
            continue
        out.append(p)
    if len(out) <= 1 and "," in text:
        parts = re.split(r",\s+", text)
        chunks: list[str] = []
        buf: list[str] = []
        for part in parts:
            buf.append(part)
            if len(" ".join(buf)) > 90:
                chunks.append(", ".join(buf))
                buf = []
        if buf:
            chunks.append(", ".join(buf))
        if len(chunks) > 1:
            out = [c.strip() for c in chunks if len(c.strip()) > 8]
    return out


def _score_sentence(s: str) -> float:
    s = s.strip()
    if len(s) < 10:
        return -80.0
    if _LAUGH_ONLY.match(s):
        return -100.0
    low = s.lower()
    words = low.split()
    if len(words) < 5:
        sc = -10.0
    else:
        sc = min(len(s), 220) * 0.22
    if low.count("ha ha") >= 3:
        return -40.0
    sc += len(KEYWORDS.findall(s)) * 10.0
    if low.startswith(
        ("after ", "today ", "this is ", "we are ", "this used ", "people ", "i headed", "i've had", "decided "),
    ):
        sc += 8.0
    if low.startswith("i think"):
        sc -= 25.0
    # Penalize fragments with many one-letter "words" from bad segmentation
    if len(words) >= 4 and sum(1 for w in words if len(w.strip(".,!?'\"")) <= 1) >= 4:
        sc -= 30.0
    if "?" in s and len(s) < 25:
        sc -= 5.0
    return sc


def clean_transcript(raw: str) -> str:
    """Light editorial pass: fixes obvious ASR variants, segments, normalizes spacing."""
    t = normalize_unicode(raw or "")
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"\s+", " ", t).strip()
    if not t:
        return ""
    t = t[0].upper() + t[1:] if len(t) > 1 else t.upper()
    t = _apply_lexical_fixes(t)
    t = _pre_segment_sentences(t)
    sentences = _split_sentences(t)
    if not sentences:
        return t
    cleaned_sentences: list[str] = []
    for sent in sentences:
        sent = sent.strip()
        if _LAUGH_ONLY.match(sent):
            continue
        if sent.lower() in ("uh", "um", "yeah", "okay", "ok"):
            continue
        sent = sent[0].upper() + sent[1:] if len(sent) > 1 else sent.upper()
        if not cleaned_sentences or cleaned_sentences[-1] != sent:
            cleaned_sentences.append(sent)
    if not cleaned_sentences:
        return t
    return ". ".join(s + ("." if not s.endswith((".", "!", "?")) else "") for s in cleaned_sentences)


def _pick_best_title_sentence(sents: list[str], max_len: int) -> str:
    ranked: list[tuple[float, str]] = []
    for s in sents:
        sc = _score_sentence(s)
        if sc < 6.0 and len(s.split()) < 6:
            continue
        ranked.append((sc, s))
    ranked.sort(key=lambda x: (-x[0], -min(len(x[1]), max_len + 40)))
    for sc, s in ranked:
        t = polish_title_phrase(s.rstrip(".!?"))
        if len(t.split()) < 5:
            continue
        if len(t) > max_len:
            t = t[:max_len].rsplit(" ", 1)[0]
        if len(t.split()) < 4:
            continue
        return t
    return ""


def _basename_fallback_title(basename: str) -> str:
    stem = Path(basename).stem
    stem = re.sub(r"_Full HD \d+p?$", "", stem, flags=re.I)
    if re.match(r"^oscar[_ ]farm", stem, re.I):
        return "Oscar's farm — cacao field video"
    m = re.search(r"Project\s+([\d\-()]+)", stem, re.I)
    label = m.group(1).replace("(", "").replace(")", "") if m else stem
    return f"Field clip — project {label}"


def propose_title(
    cleaned: str,
    basename: str,
    *,
    max_len: int = 90,
    fallback_stem_words: int = 8,
) -> str:
    """Pick a short, human title from cleaned transcript; fall back to file stem."""
    sents = _split_sentences(cleaned) if cleaned else []
    chosen = _pick_best_title_sentence(sents, max_len) if sents else ""
    if not chosen and sents:
        chosen = polish_title_phrase(max(sents, key=len).rstrip(".!?"))
        if len(chosen) > max_len:
            chosen = chosen[:max_len].rsplit(" ", 1)[0]
    if not chosen and cleaned:
        chosen = cleaned[:max_len].rsplit(" ", 1)[0]
    if chosen:
        c = chosen[0].upper() + chosen[1:] if len(chosen) > 1 else chosen.upper()
        return polish_title_phrase(c)
    stem = Path(basename).stem
    stem = re.sub(r"_Full HD \d+p?$", "", stem, flags=re.I)
    words = stem.replace("_", " ").split()
    fb = " ".join(words[:fallback_stem_words])
    return polish_title_phrase(fb or "Field video")


def disambiguate_stories(titles_by_basename: dict[str, str], cleaned_by_basename: dict[str, str]) -> dict[str, str]:
    """Adjust titles that are identical across two clips (common opening line)."""
    from collections import Counter

    counts = Counter(titles_by_basename.values())
    out = dict(titles_by_basename)
    dup_today = {
        k
        for k, v in titles_by_basename.items()
        if counts[v] > 1 and v.lower().startswith("today you observe the cacao pod selection")
    }
    if len(dup_today) >= 2:
        for b in dup_today:
            low = b.lower()
            cleaned = cleaned_by_basename.get(b) or ""
            sents = _split_sentences(cleaned)
            second = polish_title_phrase(sents[1].rstrip(".!?")) if len(sents) > 1 else ""
            if "oscar_farm_video" in low and second:
                t = second[0].upper() + second[1:] if len(second) > 1 else second
                out[b] = t if len(t) <= 92 else t[:92].rsplit(" ", 1)[0]
            elif "project 09-26" in low:
                out[b] = "Cacao pod selection walk on Oscar's farm"

    for b, title in list(out.items()):
        if counts[title] <= 1:
            continue
        low = b.lower()
        cleaned = cleaned_by_basename.get(b) or ""
        sents = _split_sentences(cleaned)
        second = sents[1] if len(sents) > 1 else ""
        if b in dup_today:
            continue
        if "oscar_farm_video" in low and second:
            out[b] = polish_title_phrase(
                (second[0].upper() + second[1:] if len(second) > 1 else second).rstrip(".!?")
            )
            if len(out[b]) > 90:
                out[b] = out[b][:90].rsplit(" ", 1)[0]
            continue
        if "project 09-26" in low:
            out[b] = "Cacao pod selection walk on Oscar's farm"
            continue
        if "project 09-19" in low or "09-19_full" in low:
            out[b] = "Cracking fresh cacao pods on the farm"
            continue
        if "project 09-20" in low or "09-20_full" in low:
            out[b] = "Pruning witches' broom with Vivi on the farm"
            continue
        if "project 05-23" in low or "05-23_full" in low:
            out[b] = "Greenhouse visit: young cacao seedlings before transplant"
            continue
        if "project 10-07" in low or "10-07_full" in low:
            out[b] = "Opening the fermentation box after seven days"
            continue
        # Generic: use second sentence or basename hint
        if second:
            alt = polish_title_phrase(second.rstrip(".!?"))
            if len(alt) > 88:
                alt = alt[:88].rsplit(" ", 1)[0]
            out[b] = alt[0].upper() + alt[1:] if len(alt) > 1 else alt
        else:
            out[b] = f"{title} ({_basename_fallback_title(b)})"[0:90]
    return out


def slug_from_title(title: str, *, max_slug_len: int = 72) -> str:
    t = normalize_unicode(title).lower()
    t = re.sub(r"[^a-z0-9]+", "-", t)
    t = re.sub(r"-+", "-", t).strip("-")
    if len(t) > max_slug_len:
        t = t[:max_slug_len].rstrip("-")
        t = re.sub(r"-[^-]+$", "", t)  # drop partial token
    return t or "video"


def unique_slug(title: str, basename: str, used: set[str], *, max_slug_len: int = 72) -> str:
    base = slug_from_title(title, max_slug_len=max_slug_len)
    if len(base) < 6:
        base = slug_from_title(propose_title("", basename), max_slug_len=max_slug_len)
    slug = base
    n = 2
    while slug in used:
        suffix = f"-{n}"
        slug = (base[: max_slug_len - len(suffix)].rstrip("-")) + suffix
        n += 1
    used.add(slug)
    return slug


def youtube_snippet_title(human_title: str, brand: str = "Agroverse", cap: int = 100) -> str:
    core = human_title.strip()
    suffix = f" | {brand}"
    room = cap - len(suffix)
    if len(core) > room:
        core = core[: room].rsplit(" ", 1)[0]
    return (core + suffix)[:cap]


def paragraphize_for_html(text: str, max_chars: int = 380) -> list[str]:
    """Turn a single-block cleaned transcript into short paragraphs for reading."""
    text = (text or "").strip()
    if not text:
        return []
    if "\n\n" in text:
        return [b.strip() for b in re.split(r"\n{2,}", text) if b.strip()]
    parts = re.split(r"(?<=[.!?])\s+", text)
    paras: list[str] = []
    cur: list[str] = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        cand = " ".join(cur + [p])
        if cur and len(cand) > max_chars:
            paras.append(" ".join(cur))
            cur = [p]
        else:
            cur.append(p)
    if cur:
        paras.append(" ".join(cur))
    return paras
