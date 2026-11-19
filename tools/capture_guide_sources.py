"""Explicit, bounded capture of specialist guides; not a crawler.

At most three named pages per request, eight seconds between requests. Normal
application builds and the app itself never invoke this command or use Wiki I/O.
"""
import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

TITLES = ["Slayer training", "Basilisk Knight/Strategies", "Cerberus/Strategies", "Kraken/Strategies",
          "Araxxor/Strategies", "Alchemical Hydra/Strategies", "Lizardman shaman/Strategies",
          "Skeletal Wyvern/Strategies", "Demonic gorilla/Strategies", "Tormented Demon/Strategies",
          "TzTok-Jad/Strategies", "TzKal-Zuk/Strategies", "Royal Titans/Strategies"]
ROOT = Path(__file__).resolve().parents[1]


def capture():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch", action="store_true", help="Explicitly permit this fixed capture")
    parser.add_argument("--interval", type=float, default=8)
    args = parser.parse_args()
    if not args.fetch or args.interval < 5:
        parser.error("Use --fetch and an interval of at least five seconds")
    folder = ROOT / "data/guide-sources"
    folder.mkdir(exist_ok=True)
    existing = {json.loads(p.read_text(encoding="utf-8"))["title"].casefold() for p in folder.glob("*.json")}
    needed = [title for title in TITLES if title.casefold() not in existing]
    for start in range(0, len(needed), 3):
        if start:
            time.sleep(args.interval)
        titles = needed[start:start + 3]
        query = urllib.parse.urlencode(dict(action="query", redirects=1, titles="|".join(titles),
            prop="revisions", rvprop="ids|timestamp|content", rvslots="main", format="json", formatversion=2))
        request = urllib.request.Request("https://oldschool.runescape.wiki/api.php?" + query,
            headers={"User-Agent": "SlayerTargetPlanner/2.8 (bounded offline guide capture; no crawling)"})
        with urllib.request.urlopen(request, timeout=45) as response:
            content = response.read(5_000_001)
        if len(content) > 5_000_000:
            raise ValueError("Guide capture response exceeds five MB")
        for page in json.loads(content)["query"]["pages"]:
            if page.get("revisions"):
                name = re.sub(r"[^a-z0-9]+", "-", page["title"].lower()).strip("-")
                (folder / (name + ".json")).write_text(json.dumps(page, ensure_ascii=False, indent=2), encoding="utf-8")
                print("Captured", page["title"], "revision", page["revisions"][0]["revid"], flush=True)
            else:
                print("Not available:", page["title"], flush=True)


if __name__ == "__main__":
    capture()
