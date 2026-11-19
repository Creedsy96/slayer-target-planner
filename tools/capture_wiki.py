"""Capture revisioned Wiki data; content is parsed as data and never executed."""
import argparse
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--directory',type=Path,default=ROOT/'data/sources')
args=parser.parse_args()
SOURCES=args.directory
SOURCES.mkdir(parents=True,exist_ok=True)
legacy = json.loads((ROOT / "data" / "legacy.json").read_text(encoding="utf-8"))
titles = [urllib.parse.unquote(c["source"].split("/w/")[-1]).replace("_", " ") for c in legacy["creatures"]]
titles += [f"{name}/Slayer assignments" for name in ["Turael", "Spria", "Krystilia", "Mazchna", "Vannaka", "Chaeldar", "Konar quo Maten", "Nieve", "Duradel"]]
titles += ["Slayer task/" + c["name"] for c in legacy["creatures"]]
titles += [json.loads(p.read_text(encoding='utf-8-sig'))['title'] for p in (ROOT/'data/sources').glob('*.json')]
titles = sorted(set(titles))
for start in range(0, len(titles), 40):
    batch = titles[start:start + 40]
    query = urllib.parse.urlencode(dict(action="query", redirects=1, titles="|".join(batch), prop="revisions", rvprop="ids|timestamp|content", rvslots="main", format="json", formatversion=2))
    request = urllib.request.Request("https://oldschool.runescape.wiki/api.php?" + query, headers={"User-Agent": "SlayerTargetPlanner/2.0 (offline calculation data audit)"})
    with urllib.request.urlopen(request, timeout=45) as response:
        result = json.load(response)
    for page in result["query"]["pages"]:
        name = re.sub(r"[^a-z0-9]+", "-", page["title"].lower()).strip("-")
        if "revisions" in page:
            (SOURCES / f"{name}.json").write_text(json.dumps(page, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Captured batch {start // 40 + 1}: {len(batch)} requested titles", flush=True)
