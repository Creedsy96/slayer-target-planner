"""Capture sourced creature artwork and build the offline UI sprite sheet.

Requires Pillow. Network responses are data only; existing cached originals are
reused. Run deliberately when changing artwork, never as part of normal builds.
"""
import hashlib
import io
import json
import math
import re
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".desktop-build/creature-art-cache"
CACHE.mkdir(parents=True, exist_ok=True)
AGENT = {"User-Agent": "SlayerTargetPlanner/2.7 (offline fan planner artwork)"}


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=45) as response:
        content = response.read(4_000_001)
    if len(content) > 4_000_000:
        raise ValueError("Artwork response exceeds the size limit")
    return content


pages = {read(p)["title"].casefold(): read(p) for folder in ["sources", "variant-sources"]
         for p in (ROOT / "data" / folder).glob("*.json")}
catalogue = read(ROOT / "data/catalogue.json")
variants = catalogue["variants"] + read(ROOT / "data/variant-additions.json")["variants"]
variants = list({v["id"]: v for v in variants}.values())
files = {}
for variant in variants:
    page = pages.get(variant["source"]["title"].casefold())
    content = page["revisions"][0]["slots"]["main"]["content"] if page else ""
    icon = re.search(r"\[\[File:([^\]|\n]+ icon\.png)", content, re.I)
    image = re.search(r"^\|\s*image\d*\s*=\s*\[\[File:([^\]|\n]+)", content, re.M | re.I)
    if icon or image:
        files[variant["id"]] = (icon or image)[1]
    elif variant["id"] == "boss-pool":
        files[variant["id"]] = "Slayer icon.png"
    else:
        raise ValueError("No sourced artwork for " + variant["id"])

metadata_path = CACHE / "imageinfo.json"
metadata = read(metadata_path) if metadata_path.exists() else {}
needed = sorted(set(files.values()) - metadata.keys())
for offset in range(0, len(needed), 40):
    names = needed[offset:offset + 40]
    query = urllib.parse.urlencode(dict(action="query", format="json", formatversion=2,
        prop="imageinfo", iiprop="url|timestamp|sha1", iiurlwidth=64,
        titles="|".join("File:" + name for name in names)))
    result = json.loads(fetch("https://oldschool.runescape.wiki/api.php?" + query))
    returned = {p["title"][5:].replace("_", " "): p for p in result["query"]["pages"]}
    for name in names:
        page = returned.get(name.replace("_", " "))
        if not page or not page.get("imageinfo"):
            raise ValueError("Missing Wiki image: " + name)
        metadata[name] = page["imageinfo"][0]
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print("Resolved artwork", min(offset + 40, len(needed)), "/", len(needed), flush=True)


def download(name):
    info = metadata[name]
    path = CACHE / (hashlib.sha256(name.encode()).hexdigest() + ".png")
    if not path.exists():
        path.write_bytes(fetch(info.get("thumburl", info["url"])))
    image = Image.open(path).convert("RGBA")
    image = image.crop(image.getbbox())
    scale = 54 / max(image.size)
    image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))),
                         Image.Resampling.NEAREST if scale > 1 else Image.Resampling.LANCZOS)
    return name, image, hashlib.sha256(path.read_bytes()).hexdigest()


with ThreadPoolExecutor(max_workers=4) as executor:
    originals = {name: (image, digest) for name, image, digest in executor.map(download, sorted(set(files.values())))}
columns, cell = 16, 64
sheet = Image.new("RGBA", (columns * cell, math.ceil(len(variants) / columns) * cell))
entries = {}
aliases = {}
for index, variant in enumerate(variants):
    name = files[variant["id"]]
    image, digest = originals[name]
    x, y = index % columns * cell, index // columns * cell
    sheet.alpha_composite(image, (x + (cell - image.width) // 2, y + (cell - image.height) // 2))
    entries[variant["id"]] = dict(frame=index, name=variant["name"], file=name,
        source=variant["source"]["url"], imagePage=metadata[name]["descriptionurl"],
        originalSha256=digest, imageTimestamp=metadata[name]["timestamp"])
    aliases.setdefault(variant["name"].casefold(), variant["id"])
for assignment in catalogue["assignments"]:
    representative = next((v for v in assignment["variantIds"] if v in entries), None)
    if not representative:
        raise ValueError("No assignment artwork: " + assignment["id"])
    aliases.setdefault(assignment["name"].casefold(), representative)
    aliases.setdefault(assignment["id"].casefold(), representative)
(ROOT / "assets").mkdir(exist_ok=True)
sheet.save(ROOT / "assets/creatures.png", optimize=True)
(ROOT / "src/ui/creature-art.json").write_text(json.dumps(dict(columns=columns,
    rows=math.ceil(len(variants) / columns), entries=entries, aliases=aliases), indent=2) + "\n", encoding="utf-8")
print("Built", len(entries), "creature frames and", len(aliases), "name aliases.")
