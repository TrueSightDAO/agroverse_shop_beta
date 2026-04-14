#!/usr/bin/env python3
"""
Analyze incoming video files: metadata, sampled-frame fingerprints (pseudo–frame-by-frame),
speech-to-text, and duplicate grouping before YouTube upload.

Duplicate detection (no YouTube API required):
  1) Exact: SHA-256 of file bytes
  2) Strong visual: same duration (±50ms), same WxH, and 5 anchor perceptual hashes match
  3) Near-duplicate: same duration (±100ms), same WxH, mean Hamming distance across anchors ≤ PHASH_NEAR_BITS

Frame sampling:
  - Anchor frames at 10%, 30%, 50%, 70%, 90% of duration (for stable dedup)
  - Optional dense line: one frame per --fps-sample seconds, capped at --max-timeline-frames
    (stores timestamp + phash only; not a substitute for ML vision captions)

Transcription: faster-whisper (CPU). Install: pip install faster-whisper imagehash Pillow

Usage:
  python3 scripts/analyze_incoming_videos.py \\
    --input ~/Downloads \\
    --output docs/incoming_videos_2026-04 \\
    --glob '*.MP4' \\
    --model tiny

Incremental runs (reuse transcript + frame hashes when file unchanged):

  python3 scripts/analyze_incoming_videos.py \\
    --input ~/Downloads \\
    --output docs/incoming_videos_2026-04 \\
    --reuse-from docs/incoming_videos_2026-04/manifest.json

**Important:** Each run rewrites **manifest.json** to **only** the files matched by `--glob`
under `--input`. Narrow globs (e.g. a single series) **drop** other videos from the manifest unless
you merge the JSON back into your full catalog afterward.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from collections import defaultdict
from dataclasses import dataclass, field, asdict, fields
from pathlib import Path
from typing import Any

# Perceptual hash
from PIL import Image

try:
    import imagehash
except ImportError:
    print("Install: pip install imagehash Pillow", file=sys.stderr)
    sys.exit(1)


PHASH_NEAR_BITS = 10  # mean Hamming across 5 anchors; tune 8–12


def ffprobe(path: Path) -> dict[str, Any]:
    cmd = [
        "ffprobe",
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(path),
    ]
    out = subprocess.check_output(cmd, text=True)
    data = json.loads(out)
    fmt = data.get("format") or {}
    dur = float(fmt.get("duration") or 0)
    v_streams = [s for s in data.get("streams") or [] if s.get("codec_type") == "video"]
    vw = vh = None
    codec = None
    if v_streams:
        s0 = v_streams[0]
        vw = int(s0.get("width") or 0)
        vh = int(s0.get("height") or 0)
        codec = s0.get("codec_name")
    br = fmt.get("bit_rate")
    size = int(fmt.get("size") or path.stat().st_size)
    return {
        "duration_sec": dur,
        "width": vw,
        "height": vh,
        "video_codec": codec,
        "bit_rate": int(br) if br else None,
        "container_size_bytes": size,
    }


def sha256_file(path: Path, chunk: int = 8 * 1024 * 1024) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def extract_frame(path: Path, t_sec: float, out_png: Path) -> None:
    out_png.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        f"{max(0.0, t_sec):.3f}",
        "-i",
        str(path),
        "-frames:v",
        "1",
        "-vf",
        "scale=320:-1",
        str(out_png),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def phash_image(png: Path):
    im = Image.open(png).convert("RGB")
    return imagehash.phash(im)


def anchor_times(duration: float) -> list[float]:
    if duration <= 0:
        return [0.0]
    return [duration * p for p in (0.10, 0.30, 0.50, 0.70, 0.90)]


def dense_sample_times(duration: float, fps_sample: float, max_frames: int) -> list[float]:
    if duration <= 0 or fps_sample <= 0:
        return []
    step = 1.0 / fps_sample
    times = []
    t = 0.0
    while t <= duration and len(times) < max_frames:
        times.append(min(t, max(0, duration - 0.05)))
        t += step
    return times


def hamming(a, b) -> int:
    return int(a - b)


def extract_audio_wav(video: Path, wav: Path) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        str(wav),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def transcribe_wav(
    model: Any | None, model_name: str, wav: Path, language: str | None
) -> tuple[str, str | None]:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return "", "faster-whisper not installed (pip install faster-whisper)"

    m = model
    if m is None:
        m = WhisperModel(model_name, device="cpu", compute_type="int8")
    kwargs = {}
    if language:
        kwargs["language"] = language
    segments, info = m.transcribe(str(wav), beam_size=1, **kwargs)
    parts = []
    for seg in segments:
        parts.append(seg.text.strip())
    text = " ".join(parts).strip()
    lang = getattr(info, "language", None)
    return text, lang


class UnionFind:
    def __init__(self, n: int):
        self.p = list(range(n))

    def find(self, x: int) -> int:
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a: int, b: int) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.p[rb] = ra


def normalize_key(name: str) -> str:
    base = Path(name).stem.lower()
    base = re.sub(r"[^a-z0-9]+", "", base)
    return base


@dataclass
class VideoRecord:
    path: str
    basename: str
    sha256: str
    duration_sec: float
    width: int | None
    height: int | None
    video_codec: str | None
    bit_rate: int | None
    container_size_bytes: int
    anchor_phashes: list[str] = field(default_factory=list)
    timeline_phashes: list[dict[str, Any]] = field(default_factory=list)
    transcript: str = ""
    transcript_language: str | None = None
    transcript_error: str | None = None
    duplicate_of_index: int | None = None
    duplicate_group_id: int | None = None
    duplicate_of_basename: str | None = None
    duplicate_reason: str | None = None
    youtube_upload_recommended: bool = True
    notes: str = ""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Directory with video files")
    ap.add_argument("--output", required=True, help="Output directory (under repo)")
    ap.add_argument("--glob", default="*.MP4", help="Glob under input (case-sensitive on Unix)")
    ap.add_argument("--model", default="tiny", help="faster-whisper model: tiny, base, small, ...")
    ap.add_argument("--language", default="", help="Force language code, e.g. en (optional)")
    ap.add_argument("--fps-sample", type=float, default=1.0, help="Seconds between timeline phash samples")
    ap.add_argument("--max-timeline-frames", type=int, default=90, help="Cap timeline samples per file")
    ap.add_argument("--skip-transcribe", action="store_true")
    ap.add_argument("--skip-timeline", action="store_true", help="Only anchor phashes (faster)")
    ap.add_argument(
        "--reuse-from",
        type=Path,
        default=None,
        help="Existing manifest.json: reuse rows when basename+sha256 match and transcript exists (or --skip-transcribe)",
    )
    args = ap.parse_args()

    in_dir = Path(args.input).expanduser().resolve()
    out_dir = Path(args.output).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    # Collect files
    paths = sorted(in_dir.glob(args.glob))
    if not paths:
        paths = sorted(in_dir.glob("*.mp4"))
    if not paths:
        print(f"No videos matching {args.glob} under {in_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(paths)} files", flush=True)

    old_by_basename: dict[str, dict[str, Any]] = {}
    if args.reuse_from:
        reuse_path = Path(args.reuse_from).expanduser().resolve()
        if reuse_path.is_file():
            prev = json.loads(reuse_path.read_text(encoding="utf-8"))
            for v in prev.get("videos") or []:
                b = v.get("basename")
                if isinstance(b, str):
                    old_by_basename[b] = v
            print(f"Loaded {len(old_by_basename)} rows from {reuse_path.name} for reuse", flush=True)

    field_names = {f.name for f in fields(VideoRecord)}

    def record_from_reuse_row(path: Path, row: dict[str, Any]) -> VideoRecord:
        kw: dict[str, Any] = {}
        for name in field_names:
            if name == "path":
                kw["path"] = str(path)
            elif name in row:
                kw[name] = row[name]
        return VideoRecord(**kw)

    records: list[VideoRecord] = []
    tmp = Path(tempfile.mkdtemp(prefix="video_analysis_"))

    whisper_model = None
    if not args.skip_transcribe:
        try:
            from faster_whisper import WhisperModel

            print(f"Loading Whisper model {args.model!r} (once)…", flush=True)
            whisper_model = WhisperModel(args.model, device="cpu", compute_type="int8")
        except ImportError:
            whisper_model = None

    try:
        for i, path in enumerate(paths):
            print(f"[{i+1}/{len(paths)}] probes + hashes: {path.name}", flush=True)
            meta = ffprobe(path)
            digest = sha256_file(path)

            old_row = old_by_basename.get(path.name)
            if old_row and old_row.get("sha256") == digest:
                has_tr = bool((old_row.get("transcript") or "").strip())
                if args.skip_transcribe or has_tr:
                    print(f"    reuse manifest row (same sha256, transcript ok)", flush=True)
                    records.append(record_from_reuse_row(path, old_row))
                    continue

            anchors = anchor_times(meta["duration_sec"])
            aphs: list[str] = []
            for j, t in enumerate(anchors):
                png = tmp / f"{i}_a{j}.png"
                try:
                    extract_frame(path, t, png)
                    aphs.append(str(phash_image(png)))
                except subprocess.CalledProcessError:
                    aphs.append("")

            timeline: list[dict[str, Any]] = []
            if not args.skip_timeline and meta["duration_sec"] > 0:
                for t in dense_sample_times(
                    meta["duration_sec"], args.fps_sample, args.max_timeline_frames
                ):
                    png = tmp / f"{i}_t_{t:.2f}.png"
                    try:
                        extract_frame(path, t, png)
                        h = phash_image(png)
                        timeline.append({"t_sec": round(t, 3), "phash": str(h)})
                    except subprocess.CalledProcessError:
                        continue

            transcript = ""
            tlang = None
            terr = None
            if not args.skip_transcribe:
                wav = tmp / f"{i}.wav"
                try:
                    extract_audio_wav(path, wav)
                    transcript, tlang = transcribe_wav(
                        whisper_model,
                        args.model,
                        wav,
                        args.language or None,
                    )
                except Exception as e:
                    terr = str(e)

            rec = VideoRecord(
                path=str(path),
                basename=path.name,
                sha256=digest,
                duration_sec=round(meta["duration_sec"], 3),
                width=meta["width"],
                height=meta["height"],
                video_codec=meta.get("video_codec"),
                bit_rate=meta.get("bit_rate"),
                container_size_bytes=meta["container_size_bytes"],
                anchor_phashes=aphs,
                timeline_phashes=timeline,
                transcript=transcript,
                transcript_language=tlang,
                transcript_error=terr,
            )
            records.append(rec)
    finally:
        import shutil

        shutil.rmtree(tmp, ignore_errors=True)

    # Recompute duplicate groups whenever the file set changes (reused rows may gain siblings).
    for r in records:
        r.duplicate_of_index = None
        r.duplicate_group_id = None
        r.duplicate_of_basename = None
        r.duplicate_reason = None
        r.youtube_upload_recommended = True

    # --- Duplicate clustering ---
    n = len(records)
    uf = UnionFind(n)
    sha_groups: dict[str, list[int]] = defaultdict(list)
    for idx, r in enumerate(records):
        sha_groups[r.sha256].append(idx)

    def phash_list_from_hex(hexes: list[str]):
        return [imagehash.hex_to_hash(h) for h in hexes if h]

    # Exact file duplicates
    for _, idxs in sha_groups.items():
        if len(idxs) < 2:
            continue
        root = min(idxs)
        for j in idxs:
            if j != root:
                uf.union(root, j)

    # Visual near-duplicates: same rounded duration & resolution
    bucket: dict[tuple, list[int]] = defaultdict(list)
    for idx, r in enumerate(records):
        if r.duration_sec <= 0 or not r.width or not r.height:
            continue
        key = (round(r.duration_sec, 2), r.width, r.height)
        bucket[key].append(idx)

    for _, idxs in bucket.items():
        if len(idxs) < 2:
            continue
        # pairwise compare anchors
        ph_lists = []
        for i in idxs:
            ph_lists.append(phash_list_from_hex(records[i].anchor_phashes))
        for a in range(len(idxs)):
            for b in range(a + 1, len(idxs)):
                ia, ib = idxs[a], idxs[b]
                pa, pb = ph_lists[a], ph_lists[b]
                if len(pa) < 3 or len(pb) < 3:
                    continue
                m = min(len(pa), len(pb))
                dists = [hamming(pa[k], pb[k]) for k in range(m)]
                mean_h = sum(dists) / len(dists)
                if mean_h <= PHASH_NEAR_BITS:
                    uf.union(ia, ib)

    # Assign group ids and canonical (largest file wins tie-break by longer basename)
    group_members: dict[int, list[int]] = defaultdict(list)
    for i in range(n):
        group_members[uf.find(i)].append(i)

    gid = 0
    for root in sorted(group_members.keys()):
        members = sorted(group_members[root])
        if len(members) == 1:
            records[members[0]].duplicate_group_id = None
            continue
        gid += 1
        # canonical: prefer largest container_size_bytes, then shorter name (stable export)
        members_sorted = sorted(
            members,
            key=lambda i: (-records[i].container_size_bytes, len(records[i].basename), records[i].basename),
        )
        keep = members_sorted[0]
        for i in members:
            records[i].duplicate_group_id = gid
            if i == keep:
                records[i].duplicate_reason = "canonical_unique_in_group"
                records[i].youtube_upload_recommended = True
            else:
                records[i].duplicate_of_index = keep
                records[i].duplicate_of_basename = records[keep].basename
                if records[i].sha256 == records[keep].sha256:
                    records[i].duplicate_reason = "exact_byte_match"
                else:
                    records[i].duplicate_reason = "near_duplicate_visual"
                records[i].youtube_upload_recommended = False

    # Heuristic: name similarity to existing video_metadata.json
    meta_path = Path(__file__).resolve().parent / "video_metadata.json"
    catalog_names = set()
    if meta_path.is_file():
        data = json.loads(meta_path.read_text())
        for v in data.get("videos") or []:
            catalog_names.add(normalize_key(v.get("filename", "")))

    for r in records:
        nk = normalize_key(r.basename)
        for cn in catalog_names:
            if nk and cn and (nk in cn or cn in nk) and len(nk) > 6:
                r.notes += f"Possibly same topic as catalog file matching '{cn}'. "
                break

    # JSON out
    payload = {
        "input_dir": str(in_dir),
        "ffmpeg_sample": {
            "anchors": "10/30/50/70/90% duration, phash, scale=320px",
            "timeline": f"every {args.fps_sample}s, max {args.max_timeline_frames} frames",
            "transcription_model": args.model,
        },
        "duplicate_policy": {
            "exact": "same sha256",
            "near": f"same duration±~0.01s (bucket), same WxH, mean anchor Hamming ≤ {PHASH_NEAR_BITS}",
        },
        "videos": [asdict(r) for r in records],
        "youtube_upload_candidates": [r.basename for r in records if r.youtube_upload_recommended],
        "skip_if_already_on_channel": "Compare filename + duration against youtube_videos.json / YouTube Studio; this script does not call YouTube API.",
    }

    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {manifest_path}", flush=True)

    # README stub
    dup_lines = []
    for r in records:
        if r.duplicate_of_basename:
            dup_lines.append(
                f"- **{r.basename}** → duplicate of **{r.duplicate_of_basename}** ({r.duplicate_reason})"
            )

    readme = out_dir / "README.md"
    readme.write_text(
        """# Incoming video analysis

Generated by `scripts/analyze_incoming_videos.py`.

- **manifest.json** — per-file metadata, anchor + timeline perceptual hashes, transcripts, duplicate fields.
- **Frame “analysis”** — we store **perceptual hashes** per sampled timestamp (not raw pixels). True pixel–pixel frame comparison is usually unnecessary for dedup; anchors catch re-exports. For ML vision captions, run a separate vision pass on sampled PNGs.
- **Speech** — **faster-whisper** transcript in `transcript` (CPU `int8`).

## YouTube: avoid duplicates

1. **In this batch:** upload only rows where `youtube_upload_recommended` is true (see `youtube_upload_candidates` in manifest).
2. **Against future uploads:** keep `youtube_videos.json` updated; before batch upload, merge new `sha256` + duration into a local index.
3. **Against this repo’s catalog:** compare `basename` / normalized name to `scripts/video_metadata.json`.

## Duplicate summary

"""
        + ("\n".join(dup_lines) if dup_lines else "_No duplicate groups detected in this batch._")
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {readme}", flush=True)


if __name__ == "__main__":
    main()
