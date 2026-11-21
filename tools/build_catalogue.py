"""Generate the reviewed catalogue from captured data-only Wiki records."""
import hashlib
import json
import re
import argparse
from pathlib import Path
from urllib.parse import quote, unquote
from guide_wikitext import monster_forms, monster_locations, representative_form

ROOT = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--sources',type=Path,default=ROOT/'data/sources')
parser.add_argument('--output',type=Path,default=ROOT/'data/catalogue.json')
parser.add_argument('--version',default='2026-11-19.2')
args=parser.parse_args()
legacy = json.loads((ROOT / "data/legacy.json").read_text(encoding="utf-8"))
pages = {}
for path in args.sources.glob("*.json"):
    record = json.loads(path.read_text(encoding="utf-8-sig"))
    if record.get("revisions"):
        pages[record["title"].lower()] = record


def page(title):
    record = pages.get(title.replace("_", " ").lower())
    return record["revisions"][0]["slots"]["main"]["content"] if record else ""


def source(title):
    record = pages.get(title.replace("_", " ").lower())
    return {"title": title, "url": "https://oldschool.runescape.wiki/w/" + quote(title.replace(" ", "_"), safe="/:"),
            "revision": record["revisions"][0]["revid"] if record else None}


def normal(value):
    return re.sub(r"[^a-z0-9]", "", value.lower()).rstrip("s")


def plain(value):
    value = re.sub(r"\[\[([^]|]+)\|([^]]+)\]\]", r"\2", value)
    return re.sub(r"\[\[([^]]+)\]\]", r"\1", value).strip()


aliases = {}
for c in legacy["creatures"]:
    for name in [c["id"], c["name"], c["representative"], unquote(c["source"].split("/w/")[-1]).replace("_", " ")]:
        aliases[normal(name)] = c["id"]
aliases.update({"suqah": "suqahs", "custodia": "custodian stalker", "monkey": "monkeys", "waterfiend": "waterfiends", "kalphite": "kalphite"})


def balanced(text, start):
    depth, quoted, escaped = 0, None, False
    for i in range(start, len(text)):
        ch = text[i]
        if quoted:
            if ch == quoted and not escaped:
                quoted = None
            escaped = ch == "\\" and not escaped
            continue
        if ch in "\"'":
            quoted = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
    raise ValueError("Unbalanced source table")


def requirements(text):
    values = []
    for skill, minimum in re.findall(r"\{\{SCP\|([^|}]+)\|(\d+)", text, re.I):
        values.append({"kind": "skill", "key": skill.lower(), "min": int(minimum), "label": skill})
    # Quest stages are retained separately from bought reward unlocks.
    refs = re.findall(r"\[\[([^]|]+)(?:\|[^]]+)?\]\]", text.split("{{Cite")[0])
    known_quests = [t for t in refs if t.lower() in quest_names]
    quest_nodes = []
    for title in dict.fromkeys(known_quests):
        pos = text.find("[[" + title)
        stage = 1 if re.search(r"partial|start", text[max(0, pos-45):pos], re.I) else 2
        quest_nodes.append({"kind": "quest", "key": title, "min": stage, "label": title})
    if " or " in text and len(quest_nodes) > 1:
        values.append({"kind": "any", "items": quest_nodes, "label": " or ".join(n["key"] for n in quest_nodes)})
    else:
        values += quest_nodes
    for key, label in unlocks.items():
        if normal(label) in normal(text):
            values.append({"kind": "unlock", "key": key, "min": 0 if key == "stop-the-wyvern" else 1, "label": label})
    return values


constants = page("Module:SlayerConsts")
quest_names = {s.lower() for s in ["Priest in Peril", "Dragon Slayer I", "Dragon Slayer II", "Cabin Fever", "Horror from the Deep", "Mourning's End Part II", "Desert Treasure I", "Regicide", "Bone Voyage", "Lost City", "Elemental Workshop I", "Death Plateau", "Lunar Diplomacy", "Olaf's Quest", "Contact!", "Rum Deal", "Skippy and the Mogres", "Death to the Dorgeshuun", "Legends' Quest", "Ernest the Chicken", "Royal Trouble", "Haunted Mine", "A Porcine of Interest", "Secrets of the North", "Desert Treasure II - The Fallen Empire", "Perilous Moons", "Shadows of Custodia", "Troubled Tortugans", "The Blood Moon Rises", "Fairytale II - Cure a Queen", "The Fremennik Exiles", "Monkey Madness II", "While Guthix Sleeps", "Shilo Village"]}
unlocks = {k: v for k, v in [("like-a-boss", "Like a boss"), ("watch-the-birdie", "Watch the birdie"), ("seeing-red", "Seeing red"), ("hot-stuff", "Hot stuff"), ("reptile-got-ripped", "Reptile got ripped"), ("basilocked", "Basilocked"), ("stop-the-wyvern", "Stop the Wyvern"), ("vampyres", "Actual Vampyre Slayer"), ("wildy-more", "I Wildy More Slayer"), ("warped-reality", "Warped Reality"), ("wings-spread", "Wings Spread"), ("lured-in", "Lured In"), ("heavy-frost", "Chance of Heavy Frost")]}
module_text = page("Module:SlayerConsts/MasterTables")
names = ["Nieve", "Turael", "Spria", "Krystilia", "Mazchna", "Vannaka", "Chaeldar", "Konar quo Maten", "Duradel", "Mortimer"]
ids = ["nieve", "turael", "spria", "krystilia", "mazchna", "vannaka", "chaeldar", "konar", "duradel", "mortimer"]
oldmasters = legacy["masters"][:10]
masters, audit = [], []
variants = {}
assignments = {c["id"]: {"id": c["id"], "name": c["name"], "variantIds": [], "source": source("Slayer task/"+c["name"])} for c in legacy["creatures"]}

for c in legacy["creatures"]:
    title = unquote(c["source"].split("/w/")[-1]).replace("_", " ")
    variant_id = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    content = page(title)
    hp = re.search(r"\|\s*hitpoints\s*=\s*(\d+)\s*(?:\n|\r)", content)
    level = re.search(r"\|\s*slaylvl\s*=\s*(\d+)", content)
    variants[variant_id] = {"id": variant_id, "name": title, "assignmentIds": [c["id"]], "hp": int(hp[1]) if hp else c["hp"], "multiplier": c["multiplier"], "requirements": [{"kind": "skill", "key": "slayer", "min": int(level[1]) if level else c["level"], "label": "Slayer"}], "source": source(title), "status": "sourced-hp" if hp else "legacy-estimate", "drops": []}
    assignments[c["id"]]["variantIds"].append(variant_id)

curated = [
    ("basilisks", "Basilisk", 40, []), ("basilisks", "Basilisk Knight", 60, ["The Fremennik Exiles"]),
    ("black demons", "Black demon", 0, []), ("black demons", "Demonic gorilla", 0, ["Monkey Madness II"]),
    ("greater demons", "Greater demon", 0, []), ("greater demons", "Tormented demon", 0, ["While Guthix Sleeps"]),
    ("hellhounds", "Hellhound", 0, []), ("hellhounds", "Cerberus", 91, []),
    ("cave kraken", "Cave kraken", 87, []), ("cave kraken", "Kraken", 87, []),
    ("hydras", "Hydra", 95, []), ("hydras", "Alchemical Hydra", 95, [])]
for aid, title, level, quests in curated:
    vid = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    content = page(title)
    hp = re.search(r"\|\s*hitpoints\s*=\s*(\d+)", content)
    if not hp:
        raise ValueError(f"Missing verified HP: {title}")
    variants[vid] = {"id": vid, "name": title, "assignmentIds": [aid], "hp": int(hp[1]), "multiplier": 1, "requirements": [{"kind": "skill", "key": "slayer", "min": level, "label": "Slayer"}] + [{"kind": "quest", "key": q, "min": 2, "label": q} for q in quests], "source": source(title), "status": "reviewed-variant", "drops": []}
    if vid not in assignments[aid]["variantIds"]:
        assignments[aid]["variantIds"].append(vid)
variants["basilisk-knight"]["drops"] = [{"id": "basilisk-jaw", "name": "Basilisk jaw", "onTask": 1/1000, "offTask": 1/5000, "source": source("Slayer task/Basilisks")}]

# The workbook's fast-task representative is not the full creature selection.
# Keep these ordinary forms even when master tables list only alternatives.
for aid, title in [('blue dragons', 'Blue dragon'), ('red dragons', 'Red dragon'),
                   ('bears', 'Black bear'), ('rats', 'Rat'), ('spiders', 'Spider'),
                   ('metal dragons', 'Steel dragon')]:
    form = representative_form(monster_forms(page(title)), monster_locations(page(title)))
    if form is None:
        raise ValueError('Missing baseline combat form: ' + title)
    vid = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    variants[vid] = {'id': vid, 'name': title, 'assignmentIds': [aid], 'hp': int(form['hitpoints']),
        'multiplier': 1, 'requirements': [{'kind': 'skill', 'key': 'slayer', 'min': int(form['slaylvl'] or 0), 'label': 'Slayer'}],
        'source': source(title), 'status': 'reviewed-variant', 'drops': []}
    if vid not in assignments[aid]['variantIds']:
        assignments[aid]['variantIds'].append(vid)

for index, name in enumerate(names):
    old = oldmasters[index]
    task_rows = []
    content = page(name + "/Slayer assignments") or page(name)
    for block in re.split(r"\n\|-\s*\r?\n", content):
        cells = re.findall(r"^\|(?![}|-])(.*)$", block, re.M)
        if cells:
            cells[0] = re.sub(r'^\s*rowspan="[^"]*"\s*\|', '', cells[0])
        if not cells or not cells[0].lstrip().startswith("[["):
            continue
        label = re.match(r"\[\[([^]|]+)(?:\|([^]]+))?\]\]([^<{\n]*)", cells[0].strip())
        if not label:
            continue
        display = (label[2] or label[1].split("/")[-1]) + label[3]
        aid = 'boss' if label[1].lower().startswith(('boss', 'wilderness boss')) else aliases.get(normal(display)) or aliases.get(normal(label[1].split("/")[-1]))
        weight = re.search(r"\{\{\+=\|weight\|(\d+)", block)
        if not aid or not weight or len(cells) < 3:
            continue
        offset = 1 if name == 'Konar quo Maten' else 0
        amount = re.sub(r'^\s*(?:data-sort-value="[^"]*"|rowspan="[^"]*")\s*\|', '', cells[1+offset])
        bounds = re.search(r"(\d+)\s*[-–]\s*(\d+)", amount)
        if not bounds and re.fullmatch(r'\s*\d+\s*',amount):
            bounds = re.match(r'(\d+)-(\d+)',amount.strip()+'-'+amount.strip())
        if not bounds:
            continue
        ext_cell = cells[2+offset] if name not in ["Turael", "Spria", "Mazchna"] else ""
        ext = re.search(r"(\d+)\s*[-–]\s*(\d+)", ext_cell)
        req = cells[0] + ' ' + next((c for c in cells[2+offset:] if "SCP|" in c or "nlocked" in c or "completion" in c or "start" in c), "")
        locations = []
        if offset:
            location_text = re.split(r'^\|',block,flags=re.M)[2]
            locations = re.findall(r'^\*\[\[([^]|]+)',location_text,re.M)
        task_rows.append({"id": aid, "weight": int(weight[1]), "minimum": int(bounds[1]), "maximum": int(bounds[2]), "extendedMin": int(ext[1]) if ext else 0, "extendedMax": int(ext[2]) if ext else 0, "requirements": requirements(req), "requirementsText": plain(req), "alternativeTitles":re.findall(r"\[\[([^]|#]+)",cells[-2]) if name not in ["Konar quo Maten","Krystilia","Mortimer"] else [], "locations":locations, "source": source(name+"/Slayer assignments") if page(name+"/Slayer assignments") else source(name)})
    if name == "Mortimer":
        for row in task_rows:
            oldrow = next(t for t in old["tasks"] if t["id"] == row["id"])
            # Original workbook supplies the modifier ranges; task page is captured.
            c = next(c for c in legacy["creatures"] if c["id"] == row["id"])
            original_block = next((b for b in re.split(r"\n\|-\s*\r?\n",content) if re.search(r'\[\[(?:Slayer task/)?'+re.escape(row['id'])+r'(?:\||\]\])',b,re.I)), '')
            modifier_cells=re.findall(r'^\|(?![}|-])(.*)$',original_block,re.M)
            point_range=re.search(r'(\d+)\s*-\s*(\d+)',modifier_cells[6]) if len(modifier_cells)>6 else None
            quantity_range=re.search(r'(-?\d+)\s*-\s*(-?\d+)',modifier_cells[5]) if len(modifier_cells)>5 else None
            row["pointsRange"] = [int(point_range[1]),int(point_range[2])] if point_range else [c["pointsMin"], c["pointsMax"]]
            row["quantityModifier"] = [int(quantity_range[1]),int(quantity_range[2])] if quantity_range else [-30,-15] if row["minimum"] < 90 else [50,100]
            row["modifierValuesStatus"] = "range-estimate"
    # Fallback is explicit and audit-visible, never represented as a reviewed row.
    found = {r["id"] for r in task_rows}
    for t in old["tasks"]:
        if t["id"] not in found:
            c = next(c for c in legacy["creatures"] if c["id"] == t["id"])
            task_rows.append({**t, "requirements": [{"kind": "skill", "key": "slayer", "min": c["level"], "label": "Slayer"}, {"kind": "access", "key": name+":"+t["id"], "min": 1, "label": name+" assignment access: "+c["name"]}], "source": source("Slayer task/"+c["name"]), "status": "legacy-estimate"})
            audit.append({"master": ids[index], "assignment": t["id"], "issue": "Master table row not extracted; explicit access confirmation required"})
    # MasterTables provides independent skill/weight and exceptional-unlock checks.
    module_name = {"Konar quo Maten":"konar", "Spria":"turael"}.get(name, name.lower())
    match = re.search(r"local " + module_name + r" = \{", module_text)
    if match:
        section = balanced(module_text, module_text.index("{", match.start()))
        for symbol, record in re.findall(r"\[SlayerConsts\.(TASK_[A-Z_]+)\]\s*=\s*(\{[^\n]+)", section):
            aid = aliases.get(normal(symbol[5:].replace("_", " ")))
            row = next((r for r in task_rows if r["id"] == aid), None)
            if not row:
                continue
            for key, minimum in re.findall(r"(Slayer|Combat|Defence|Sailing|Magic|Strength|Ranged|Hitpoints|Agility)\s*=\s*(\d+)", record):
                if not any(r.get("kind")=="skill" and r.get("key")==key.lower() for r in row["requirements"]):
                    row["requirements"].append({"kind":"skill", "key":key.lower(), "min":int(minimum), "label":key})
            unlock_map={'UNLOCK_SEEING_RED':'seeing-red','UNLOCK_WATCH_THE_BIRDIE':'watch-the-birdie','UNLOCK_HOT_STUFF':'hot-stuff','UNLOCK_REPTILE_GOT_RIPPED':'reptile-got-ripped','UNLOCK_LIKE_A_BOSS':'like-a-boss','UNLOCK_STOP_THE_WYVERN':'stop-the-wyvern','UNLOCK_BASILOCKED':'basilocked','UNLOCK_VAMPYRES':'vampyres','UNLOCK_I_WILDY_MORE_SLAYER':'wildy-more','UNLOCK_WARPED_REALITY':'warped-reality','UNLOCK_WINGS_SPREAD':'wings-spread','UNLOCK_LURED_IN':'lured-in'}
            for const in re.findall(r'Unlock\s*=\s*SlayerConsts\.([A-Z_]+)',record):
                key=unlock_map.get(const)
                if key and not any(r.get('kind')=='unlock' and r.get('key')==key for r in row['requirements']):
                    row['requirements'].append({'kind':'unlock','key':key,'min':0 if key=='stop-the-wyvern' else 1,'label':unlocks[key]})
            if row['id']=='frost dragons':
                row['unlockWeight']={'key':'heavy-frost','weight':8}
    task_rows = list({r["id"]: r for r in task_rows}.values())
    combat = {"nieve":85,"turael":0,"spria":0,"krystilia":0,"mazchna":20,"vannaka":40,"chaeldar":70,"konar":75,"duradel":100,"mortimer":100}[ids[index]]
    reqs = [{"kind":"skill","key":"combat","min":combat,"label":"Combat"}]
    if name in ["Duradel", "Mortimer"]:
        reqs += [{"kind":"skill","key":"slayer","min":70 if name=="Mortimer" else 50,"label":"Slayer"}]
    master_quest = {"Mazchna":"Priest in Peril","Chaeldar":"Lost City","Duradel":"Shilo Village","Mortimer":"Fallen From Grace","Spria":"A Porcine of Interest"}.get(name)
    if master_quest:
        reqs += [{"kind":"quest","key":master_quest,"min":1 if name=="Mortimer" else 2,"label":master_quest}]
    masters.append({"id":ids[index],"name":old["name"].replace(" (2 choices)",""),"legacyIds":[old["id"]],"group":"beginner" if name in ["Turael","Spria"] else ids[index],"blockCost": [90,40,40,100,50,60,70,80,100,120][index],"basePoints":old["basePoints"],"skipCost":old["skipCost"],"streakGroup":"mortimer" if name=="Mortimer" else "wilderness" if name=="Krystilia" else "normal","requirements":reqs,"tasks":task_rows,"source":source(name)})

# Alternative links are sourced per master, not inferred from a creature name.
# New alternatives retain an explicit access/method confirmation until their
# full unlock/location rules have been individually reviewed.
for master in masters:
    for row in master['tasks']:
        for title in row.get('alternativeTitles', []):
            record = pages.get(title.replace('_', ' ').lower())
            if not record:
                continue
            title = record['title']
            content=page(title)
            form=representative_form(monster_forms(content), monster_locations(content))
            if form is None:
                continue
            if re.search(r"\|\s*superior\s*=\s*(?:yes|true)",content,re.I):
                continue
            vid=re.sub(r'[^a-z0-9]+','-',title.lower()).strip('-')
            if vid not in variants:
                level=re.search(r"\|\s*slaylvl\s*=\s*(\d+)",content)
                variants[vid]={'id':vid,'name':title,'assignmentIds':[],'hp':int(form['hitpoints']),'multiplier':1,'requirements':[{'kind':'skill','key':'slayer','min':int(level[1]) if level else int(form['slaylvl'] or 0),'label':'Slayer'},{'kind':'access','key':'variant:'+vid,'min':1,'label':'Confirm access and repeatable method for '+title}],'source':source(title),'status':'sourced-alternative-access-unreviewed','drops':[],'masterAssignments':{}}
            v=variants[vid]
            if row['id'] not in v['assignmentIds']:v['assignmentIds'].append(row['id'])
            if vid not in assignments[row['id']]['variantIds']:assignments[row['id']]['variantIds'].append(vid)
            if 'masterAssignments' in v:v['masterAssignments'].setdefault(master['id'],[]).append(row['id'])

# Generic boss assignments are a separate secondary roll. Never pretend every
# boss assignment is the workbook's Giant Mole example.
assignments['boss']['variantIds'] = ['boss-pool']
variants.pop('giant-mole', None)
variants['boss-pool'] = {'id':'boss-pool','name':'Mixed boss assignment (timing scenario)','assignmentIds':['boss'],'hp':200,'multiplier':0.7,'requirements':[{'kind':'access','key':'boss-pool-method','min':1,'label':'Confirm a representative mixed-boss completion method'}],'source':source('Module:SlayerConsts/MasterTables'),'status':'mixed-pool-estimate','drops':[]}
audit.append({'master':'all','assignment':'boss','issue':'Boss secondary rolls are not mapped to individual creatures. Specific boss hunts through the generic Boss assignment are unavailable; its completion timing is a conditional mixed-pool estimate.'})
def flatten(nodes):
    for node in nodes:
        yield node
        yield from flatten(node.get('items', []))
quests = sorted({r['key'] for m in masters for r in m['requirements'] if r['kind']=='quest'} | {r['key'] for m in masters for t in m['tasks'] for r in flatten(t['requirements']) if r['kind']=='quest'} | {r["key"] for m in masters for t in m["tasks"] for r in t["requirements"] if r["kind"]=="quest"} | {q for _,_,_,qs in curated for q in qs} | {"Shilo Village","Lost City","Priest in Peril"})
catalogue = {"schemaVersion":2,"version":args.version,"captured":"2026-11-19","assignments":list(assignments.values()),"variants":list(variants.values()),"masters":masters,"quests":quests,"unlocks":unlocks,"sources":[source(p["title"]) for p in pages.values()],"audit":audit,"attribution":"Game rules and data: Old School RuneScape Wiki, CC BY-NC-SA 3.0. Original planning estimates: supplied workbook. No Wiki scripts are executed."}
encoded = json.dumps(catalogue, ensure_ascii=False, indent=2)
args.output.write_text(encoded, encoding='utf-8')
print(f"Generated {len(masters)} masters, {sum(len(m['tasks']) for m in masters)} assignment entries, {len(variants)} variants. {len(audit)} explicitly flagged legacy rows. SHA256 {hashlib.sha256(encoded.encode()).hexdigest()}")
