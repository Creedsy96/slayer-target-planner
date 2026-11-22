"""Audit generated creature confirmations against retained, revisioned sources.

No network I/O. Unreviewed routes and special spawn methods stay explicit; ordinary
creatures use their skills and physical area requirements instead of a purchase.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def quest(name):
    return {"kind": "quest", "key": name, "min": 2, "label": name}


# Supplies, wave progression and quest-only/summoned encounters are not proved
# by a level/quest export. These are method checks, not invented game unlocks.
SPECIAL = {
    **dict.fromkeys("skotizo bryophyta".split(), "Confirm the required boss-entry item and a repeatable completion method; stock is not inferred from a gear-only bank import."),
    "obor": "Confirm the lair gate has been opened with a giant key. The retained source describes repeat fights after this one-time entry unlock.",
    "cyclops": "Confirm Warriors' Guild entry, available tokens or the permanent diary exemption, and the defender requirement for the selected floor.",
    **dict.fromkeys("tztok-jad tzkal-zuk".split(), "Confirm entry/progression and a full-wave completion method. The boss's HP alone does not represent the whole encounter."),
    **dict.fromkeys("phrin-shade riyl-shade asyn-shade fiyr-shade urium-shade".split(), "Confirm the key/door access needed for this Shade Catacombs section; current exports do not identify it."),
    **dict.fromkeys("dad ice-troll-king arrg eldric-the-ice-king undead-one pit-scorpion".split(), "Confirm a repeatable, task-crediting encounter. A quest-stage or limited spawn is not assumed repeatable."),
    **dict.fromkeys("callisto artio scorpia vet-ion calvar-ion venenatis spindel".split(), "Confirm the selected Wilderness lair's entry, diary/level and fee requirements; the relevant diary/entry facts are not fully imported."),
    "chompy-bird": "Confirm the quest method, ogre bow/ammunition and bait supplies needed to spawn and kill Chompy birds.",
    "vampyre-juvinate": "Confirm the special weapon/potion method needed to finish this vampyre rather than letting it escape.",
    "vyrewatch": "Confirm an effective vampyre weapon and repeatable method for the chosen location; ordinary weapons cannot be assumed effective.",
    "zombie-rat": "Confirm the key and repeatable Melzar's Maze route for this creature.",
    "ice-troll": "Confirm the relevant Ice Path or Trollweiss Dungeon quest-stage route; a generic area name does not prove that stage.",
}

# A completed quest proves access, while partial stages retain a manual check.
PROOFS = {
    **dict.fromkeys("monkey-guard monkey-archer monkey-zombie".split(), "Monkey Madness I"),
    "grizzly-bear-cub": "Regicide", "death-wing": "Legends' Quest",
    "cave-goblin-guard": "The Lost Tribe", "icelord": "Cold War",
    "jungle-wolf": "Legends' Quest", "skogre": "Zogre Flesh Eaters", "zogre": "Zogre Flesh Eaters",
    "mourner": "Mourning's End Part II", "abyssal-sire": "Fairytale II - Cure a Queen",
    "sea-snake-young": "Royal Trouble", "iorwerth-warrior": "Regicide",
}

HARD_QUESTS = {"tortured-gorilla": "Monkey Madness II", "vorkath": "Dragon Slayer II", "albino-bat": "Cabin Fever", "amoxliatl": "The Heart of Darkness"}
AREA_ALIASES = {"Godwars Dungeon": "God Wars Dungeon", "Fossil Island Volcano": "Fossil Island", "Mushroom Forest": "Fossil Island", "Underwater": "Fossil Island"}
MORYTANIA = {"Haunted Woods", "Burgh De Rott", "Burgh de Rott", "Barrows", "Alice's farm", "Ectofuntus", "Port Phasmatys", "Morytania Spider Cave"}


def build():
    catalogue = json.loads((ROOT / "data/catalogue.json").read_text(encoding="utf-8"))
    guide = json.loads((ROOT / "data/creature-guide.json").read_text(encoding="utf-8"))["records"]
    rules = {}
    for v in catalogue["variants"]:
        if not any(r.get("key") == "variant:" + v["id"] for r in v["requirements"]):
            continue
        vid = v["id"]
        requirements = [r for r in v["requirements"] if r.get("key") != "variant:" + vid]
        if vid in HARD_QUESTS:
            requirements.append(quest(HARD_QUESTS[vid]))
        if vid in {"kree-arra", "flight-kilisa", "flockleader-geerin", "wingman-skree"}:
            requirements.append({"kind": "skill", "key": "ranged", "min": 70, "label": "Ranged"})
        if vid in {"k-ril-tsutsaroth", "balfrug-kreeyath", "tstanon-karlak"}:
            requirements.append({"kind": "skill", "key": "hitpoints", "min": 70, "label": "Hitpoints"})
        if vid in {"sergeant-strongstack", "sergeant-steelwill", "sergeant-grimspike"}:
            requirements.append({"kind": "skill", "key": "strength", "min": 70, "label": "Strength"})
        locations = []
        for loc in guide.get(vid, {}).get("locations", []):
            if loc["limited"]:
                continue
            area = loc["page"] or loc["name"]
            entry = {"name": loc["name"], "area": AREA_ALIASES.get(area, area), "requirements": []}
            if 'Guild' in area and loc['name'].lower().startswith(('outside ', 'east of ', 'west of ', 'north of ', 'south of ', 'south-east of ', 'south-west of ', 'north-east of ', 'north-west of ')):
                entry['area']=loc['name']
            if area in MORYTANIA:
                entry["requirements"].append(quest("Priest in Peril"))
            if area == "Neypotzli":
                entry["requirements"].append({"kind": "skill", "key": "slayer", "min": 48, "label": "Slayer"})
            if area == "Wilderness God Wars Dungeon":
                entry["requirements"].append({"kind": "any", "label": "60 Strength or Agility", "items": [{"kind": "skill", "key": s, "min": 60, "label": s.title()} for s in ["strength", "agility"]]})
            if entry not in locations:
                locations.append(entry)
        mode = "derived"
        note = "Access follows recorded skills, quests and at least one listed area. Required combat gear and travel supplies remain part of the chosen method."
        if vid.startswith("reanimated-"):
            mode, note = "confirmation", "Confirm the reanimation spellbook/spell, heads and rune supplies, and a task-compatible casting location. Gear imports do not prove these consumables."
        elif vid in SPECIAL:
            mode, note = "confirmation", SPECIAL[vid]
        elif vid in PROOFS:
            mode, note = "confirmation", "Completed " + PROOFS[vid] + " proves the route; otherwise confirm the applicable partial quest stage and repeatable method."
        elif not locations:
            mode, note = "confirmation", "No repeatable spawn location was reviewed in the retained source. Confirm the creature's location and task-compatible completion method."
        rules[vid] = dict(name=v["name"], mode=mode, requirements=requirements, locations=locations,
                          proofAreas=["Fossil Island"] if vid == "ancient-zygomite" else [],
                          proof=[quest(PROOFS[vid])] if vid in PROOFS else [], note=note, source=v["source"])
    assignment_requirements = {
        "aberrant spectres": dict(requirements=[quest("Priest in Peril")], source=rules["deviant-spectre"]["source"]),
        "nechryael": dict(requirements=[quest("Priest in Peril")], source=rules["greater-nechryael"]["source"]),
    }
    return dict(schemaVersion=1, version="2026-11-22.2", rules=rules, assignmentRequirements=assignment_requirements)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "data/creature-access.json")
    output = parser.parse_args().output
    data = build()
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if output.resolve() == (ROOT / "data/creature-access.json").resolve():
        import csv
        with (ROOT / "docs/reference/creature-access-audit.csv").open("w", encoding="utf-8", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(["Creature", "Mode", "Locations", "Completed quest proof", "Remaining method check", "Source", "Revision"])
            for rule in data["rules"].values():
                writer.writerow([rule["name"], rule["mode"], "; ".join(dict.fromkeys(l["area"] for l in rule["locations"])) or "Location not reviewed", "; ".join(r["key"] for r in rule["proof"]), rule["note"], rule["source"]["url"], rule["source"]["revision"]])
    print(f"Audited {len(data['rules'])} creature gates: " + ", ".join(f"{sum(r['mode'] == mode for r in data['rules'].values())} {mode}" for mode in ["derived", "confirmation"]) + "; live requests: 0")
