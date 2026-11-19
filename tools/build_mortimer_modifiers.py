"""Build explicit Mortimer ranges from the pinned Wiki table, with no legacy fallbacks."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def normal(value):
    return re.sub(r"[^a-z0-9]", "", value.lower()).rstrip("s")


def bounds(cell, quantity=False):
    text = cell.strip()
    if text == "{{NA}}":
        return None
    match = re.fullmatch(r"(-?\d+)%?\s*[-–]\s*(-?\d+)%?", text)
    if not match:
        raise ValueError(f"Unsupported modifier range: {text}")
    left, right = map(int, match.groups())
    # Jagex publishes two negative cells (-15 and -30); Wiki contracts these.
    if quantity and left < 0 < right:
        right = -right
    low, high = sorted((left, right))
    if (high - low) % 5 or low % 5:
        raise ValueError(f"Range is not on the published five-step lattice: {text}")
    return [low, high]


def build():
    page = json.loads((ROOT / "data/sources/mortimer.json").read_text(encoding="utf8"))
    catalogue = json.loads((ROOT / "data/catalogue.json").read_text(encoding="utf8"))
    aliases = {normal(a["name"]): a for a in catalogue["assignments"]}
    content = page["revisions"][0]["slots"]["main"]["content"]
    tasks = []
    for block in re.split(r"\n\|-\s*\r?\n", content):
        cells = re.findall(r"^\|(?![}|-])(.*)$", block, re.M)
        if len(cells) != 11 or "weight|" not in cells[3] or not cells[0].startswith("[["):
            continue
        label = re.search(r"\[\[(?:Slayer task/)?([^]|]+)(?:\|([^]]+))?\]\]", cells[0])
        name = label[2] or label[1]
        assignment = aliases[normal(name)]
        tasks.append({"id": assignment["id"], "name": assignment["name"],
                      "quantity": bounds(cells[5], True), "points": bounds(cells[6]),
                      "clue": bounds(cells[7]), "xp": bounds(cells[9]), "superior": bounds(cells[10])})
    expected = {t["id"] for m in catalogue["masters"] if m["id"] == "mortimer" for t in m["tasks"]}
    if len(tasks) != len(expected) or {t["id"] for t in tasks} != expected:
        raise ValueError("Mortimer source rows do not match every catalogue assignment")
    return {"schemaVersion": 1, "version": "2026-11-19.1", "step": 5,
            "guaranteedModifier": True, "typeDistribution": "uniform-unlocked",
            "valueDistribution": "uniform-discrete", "valueDistributionProvenance": "User-confirmed planning rule, 19 November 2026",
            "source": {"title": "Mortimer", "url": "https://oldschool.runescape.wiki/w/Mortimer", "revision": page["revisions"][0]["revid"]},
            "officialSource": {"title": "Meet Mortimer: Your Newest Slayer Master", "url": "https://secure.runescape.com/m=news/meet-mortimer-your-newest-slayer-master?oldschool=1", "revision": None},
            "categories": [{"kind": k, "tasks": n} for k, n in [("points", 0), ("quantity", 0), ("clue", 15), ("superior", 25), ("xp", 40)]],
            "thirdChoiceAt": 50, "tasks": tasks}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "data/mortimer-modifiers.json")
    output = parser.parse_args().output
    output.write_text(json.dumps(build(), indent=2) + "\n", encoding="utf8")
    print(f"Built Mortimer modifier rules: {output}")
