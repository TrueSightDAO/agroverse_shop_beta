import json, os, subprocess, datetime
from pathlib import Path

ROOT = Path("assets/images")
OUT = Path("/tmp/agv_out/manifest.json")

def dims(p):
    try:
        from PIL import Image
        with Image.open(p) as im:
            return im.size
    except Exception:
        return (None, None)

entries = []
for p in sorted(ROOT.rglob("*")):
    if p.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}:
        continue
    w, h = dims(p)
    rel = p.as_posix()
    parts = rel.split("/")
    entries.append({
        "path": rel,
        "url": "/" + rel,
        "category": parts[2] if len(parts) > 3 else "",
        "width": w,
        "height": h,
        "bytes": p.stat().st_size,
    })

cats = {}
for e in entries:
    c = e["category"] or "(root)"
    cats[c] = cats.get(c, 0) + 1

doc = {
    "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    "source_repo": "TrueSightDAO/agroverse_shop_beta",
    "image_root": "assets/images",
    "total": len(entries),
    "categories": dict(sorted(cats.items(), key=lambda kv: -kv[1])),
    "images": entries,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(doc, indent=1))
print("total", len(entries), "bytes", OUT.stat().st_size)
print("categories:", json.dumps(doc["categories"]))
