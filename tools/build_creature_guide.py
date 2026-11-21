"""Build standalone guide facts from existing local captures. No network I/O."""
import json
import re
from pathlib import Path
from urllib.parse import quote

from guide_wikitext import monster_forms, monster_locations, representative_form

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def build():
    pages = {read(p)["title"].casefold(): read(p) for folder in ["sources", "variant-sources"]
             for p in sorted((ROOT / "data" / folder).glob("*.json"))}
    catalogue = read(ROOT / "data/catalogue.json")
    variants = catalogue["variants"] + read(ROOT / "data/variant-additions.json")["variants"]
    result = {}
    for variant in variants:
        if variant["id"] == "boss-pool":
            continue  # This is an aggregate timing scenario, not a creature.
        page = pages.get(variant["source"]["title"].casefold())
        if not page:
            raise ValueError("Missing cached page: " + variant["id"])
        revision = page["revisions"][0]
        text = revision["slots"]["main"]["content"]
        forms, locations = monster_forms(text), monster_locations(text)
        if not forms:
            raise ValueError("No combat forms: " + variant["id"])
        name_level = re.search(r"level (\d+)", variant["name"])
        matching = [f for f in forms if name_level and f["combat"] == int(name_level[1])]
        matching = matching or [f for f in forms if f["hitpoints"] == variant["hp"]]
        default = representative_form(matching or forms, locations) or (matching or forms)[0]
        if variant["id"] == "black-dragon-wilderness-slayer-cave":
            matching = [f for f in forms if "wilderness slayer" in f["label"].lower()]
            default = (matching or [f for f in forms if f["hitpoints"] == 250] or forms)[0]
            locations = [loc for loc in locations if "Wilderness Slayer Cave" in loc["name"]]
            forms = [default]
        elif name_level and matching:
            forms = matching
        url = "https://oldschool.runescape.wiki/w/" + quote(page["title"].replace(" ", "_"), safe="/:")
        result[variant["id"]] = dict(id=variant["id"], name=variant["name"],
            assignmentIds=variant["assignmentIds"], forms=forms, defaultForm=default["id"],
            locations=locations, requirements=variant["requirements"], status=variant["status"],
            source=dict(title=page["title"], url=url, revision=revision["revid"], timestamp=revision["timestamp"]))
    strategy_sources = {}
    for path in sorted((ROOT / 'data/guide-sources').glob('*.json')):
        page = read(path)
        revision = page['revisions'][0]
        strategy_sources[page['title'].casefold()] = dict(title=page['title'],
            url='https://oldschool.runescape.wiki/w/' + quote(page['title'].replace(' ', '_'), safe='/:'),
            revision=revision['revid'], timestamp=revision['timestamp'])
    return dict(schemaVersion=1, version="2026-11-21.1", records=result, strategySources=strategy_sources)


if __name__ == "__main__":
    output = build()
    (ROOT / "data/creature-guide.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Built", len(output["records"]), "creature guides,", sum(len(r["forms"]) for r in output["records"].values()),
          "source forms; live Wiki requests: 0.")
