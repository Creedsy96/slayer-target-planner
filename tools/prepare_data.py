"""Convert the inspected source snapshot to the app's data catalogue."""
import json
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
book = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
def val(sheet, cell):
    return book[sheet].get(cell, {}).get("v")

creatures = []
by_row = {}
for row in range(6, 123):
    key = val("Task inputs", f"A{row}")
    by_row[row] = key
    creatures.append(dict(id=key, name=key[0].upper()+key[1:], representative=val("Task inputs", f"B{row}"),
        level=val("Task inputs", f"C{row}"), excluded=bool(val("Task inputs", f"D{row}")),
        hp=val("Task inputs", f"F{row}"), multiplier=val("Task inputs", f"G{row}"),
        source=val("Task inputs", f"J{row}"), pointsMin=val("Task inputs", f"K{row}"), pointsMax=val("Task inputs", f"L{row}")))
masters = []
for index, sheet in enumerate(list(book)[:10]):
    rows = []
    for cell, content in book[sheet].items():
        if not re.fullmatch(r"C\d+", cell) or int(cell[1:]) < 10:
            continue
        r = int(cell[1:])
        weight = val(sheet, f"F{r}")
        if not isinstance(weight, (int, float)) or not content["v"]:
            continue
        formula = book[sheet][f"J{r}"]["f"]
        input_row = int(re.search(r"!I(\d+)", formula)[1])
        rows.append(dict(id=by_row[input_row], weight=weight, minimum=val(sheet,f"V{r}"), maximum=val(sheet,f"W{r}"),
            extendedMin=val(sheet,f"X{r}"), extendedMax=val(sheet,f"Y{r}")))
    masters.append(dict(id=f"master-{index}", name=val("Basilisk comparison",f"A{index+6}"),
        choices=2 if index==9 else 1, blockKind="mortimer" if index==9 else "none" if index in [1,2,3,4] else "regular",
        basePoints=val("Points budget", f"N{index+6}"), skipCost=val("Points budget",f"L{index+6}"), tasks=rows))
masters.append({**masters[-1], "id":"master-10", "name":"Mortimer (3 choices)", "choices":3, "scenario":True})
data = dict(source="https://docs.google.com/spreadsheets/d/1HYeSbsbNKqZ2PO_eWPsYV0MXg46q9M6FnC8Ff75a_F4/edit", snapshot="2026-11-19",
    defaults=dict(target="basilisks", level=87, blocks=6, mortimerBlocks=2, skipSeconds=30, extended=False, overhead=0,
        delay=3, dps=5, modifierChance=0.2, streak=True, threeChoices=False, sustainable=True), creatures=creatures, masters=masters)
(root/"dist").mkdir(exist_ok=True)
(root/"dist"/"data.js").write_text("globalThis.SLAYER_DATA = "+json.dumps(data,ensure_ascii=False)+";\n",encoding="utf-8")
baseline=[]
for r in range(6,17):
    baseline.append({"id":f"master-{r-6}",**{field:val("Basilisk comparison",f"{col}{r}") for field,col in
        [("chance","C"),("average","D"),("afterSkips","E"),("hours","F"),("sustainableHours","G"),("fullSkips","O"),("boundary","Q") ]}})
(root/"tests").mkdir(exist_ok=True)
(root/"tests"/"baseline.json").write_text(json.dumps(baseline),encoding="utf-8")
print(f"Extracted {len(creatures)} task types and {len(masters)} master scenarios")
