"""Build quest-point metadata offline from one retained Wiki table and RuneLite names."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class QuestTable(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = {"attrs": dict(attrs), "cells": []}
        if tag in ("td", "th") and self.row is not None:
            self.cell = []

    def handle_data(self, text):
        if self.cell is not None:
            self.cell.append(text)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.row["cells"].append(" ".join("".join(self.cell).split()))
            self.cell = None
        if tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def build():
    snapshot = json.loads((ROOT / "data/quest-point-sources/table.json").read_text(encoding="utf-8"))
    table = QuestTable()
    table.feed(snapshot["parse"]["text"])
    records = []
    for row in table.rows:
        name = row["attrs"].get("data-rowid")
        if not name:
            continue
        cells = row["cells"]
        points = int(cells[4]) if len(cells) == 7 and cells[4].isdigit() else 0
        records.append({"name": name, "points": points, "part": name.startswith("Recipe for Disaster/"), "aliases": []})
    normal = lambda text: re.sub(r"[^a-z0-9]", "", text.lower())
    lookup = {normal(r["name"]): r for r in records}
    part_names = {
        "Another Cook's Quest": "Another Cook's Quest", "Mountain Dwarf": "Freeing the Mountain Dwarf",
        "Wartface & Bentnoze": "Freeing the Goblin generals", "Pirate Pete": "Freeing Pirate Pete",
        "Lumbridge Guide": "Freeing the Lumbridge Guide", "Evil Dave": "Freeing Evil Dave",
        "Skrach Uglogwee": "Freeing Skrach Uglogwee", "Sir Amik Varze": "Freeing Sir Amik Varze",
        "King Awowogei": "Freeing King Awowogei", "Culinaromancer": "Defeating the Culinaromancer",
    }
    source = (ROOT / "data/quest-point-sources/Quest.java").read_text(encoding="utf-8")
    for enum, name in re.findall(r'^\s*([A-Z_0-9]+)\(\d+, "([^"]+)"\)', source, re.M):
        title = "Recipe for Disaster/" + part_names[name.split(" - ", 1)[1]] if name.startswith("Recipe for Disaster - ") else name
        record = lookup.get(normal(title))
        if record is None:
            raise ValueError("Unmapped RuneLite quest: " + name)
        record["aliases"] = sorted(set(record["aliases"] + [name, enum]))
    records.sort(key=lambda r: r["name"])
    if len({r["name"] for r in records}) != len(records) or sum(r["part"] for r in records) != 10:
        raise ValueError("Unexpected quest rows or Recipe for Disaster parts")
    result = {"version": "2026-11-21.1", "captured": "2026-11-21", "source": {
        "title": "Quests/List", "url": "https://oldschool.runescape.wiki/w/Quests/List",
        "revision": snapshot["parse"]["revid"]}, "note": "Rendered table snapshot; transcluded quest rewards reflect capture time, not the outer page revision alone.",
        "maximum": sum(r["points"] for r in records if not r["part"]), "quests": records}
    (ROOT / "data/quest-points.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(records)} quest/miniquest rows; {result['maximum']} maximum quest points.")


if __name__ == "__main__":
    build()
