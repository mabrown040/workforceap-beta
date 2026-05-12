#!/usr/bin/env python3
"""
Download Material Symbols Outlined subset via Google Fonts icon_names API,
then emit a self-hosted woff2 (keeps prod on /fonts/, no runtime Google dependency).
"""
from __future__ import annotations

import re
import shutil
import sys
import tempfile
from io import BytesIO
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
GLYPHS = Path(__file__).resolve().parent / "material-symbol-glyphs.txt"
FONT_OUT = ROOT / "public/fonts/material-symbols-outlined.woff2"


def fetch_css_subset_bytes(names: list[str]) -> bytes:
    import urllib.request

    icon_names = ",".join(names)
    # Google documents `icon_names` for Material Symbols — keeps download small server-side.
    css_url = (
        "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
        ":opsz,wght,FILL,GRAD@24,400,0,0"
        f"&icon_names={quote(icon_names, safe=',')}"
    )
    req = urllib.request.Request(
        css_url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        css = r.read().decode("utf-8", errors="replace")
    m = re.search(r"src:\s*url\(([^)]+)\)", css)
    if not m:
        raise RuntimeError("Could not parse font URL from Google Fonts CSS (icon_names subset)")
    font_url = m.group(1).strip().strip('"').strip("'")
    if not font_url.startswith("http"):
        raise RuntimeError(f"Unexpected font URL: {font_url!r}")
    with urllib.request.urlopen(font_url, timeout=180) as fr:
        return fr.read()


def main() -> int:
    from fontTools.ttLib import TTFont  # noqa: PLC0415

    if not GLYPHS.is_file():
        print(f"Missing {GLYPHS}; run node scripts/extract-material-symbol-glyphs.mjs", file=sys.stderr)
        return 1

    names = sorted({ln.strip() for ln in GLYPHS.read_text().splitlines() if ln.strip()})
    if not names:
        print("Glyph list is empty", file=sys.stderr)
        return 1

    print(f"Fetching Google-hosted subset ({len(names)} icons) …", flush=True)
    raw = fetch_css_subset_bytes(names)
    font = TTFont(BytesIO(raw))

    FONT_OUT.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(suffix=".woff2", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        font.flavor = "woff2"
        font.save(str(tmp_path))
        shutil.move(str(tmp_path), str(FONT_OUT))
    finally:
        if tmp_path.exists():
            tmp_path.unlink()

    size_kb = FONT_OUT.stat().st_size / 1024
    print(f"Wrote {FONT_OUT} ({size_kb:.1f} KB)")
    if size_kb > 200:
        print("Warning: still over 200 KB — reduce glyph list or split icon sets.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
