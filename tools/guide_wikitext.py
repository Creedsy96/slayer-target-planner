"""Small data-only parser for cached monster infoboxes and location rows."""
import html
import re


def templates(text, name):
    pattern = re.compile(r"\{\{\s*" + re.escape(name) + r"(?=\s*[|\n}])", re.I)
    for match in pattern.finditer(text):
        depth, cursor = 1, match.end()
        while cursor < len(text) - 1 and depth:
            token = text[cursor:cursor + 2]
            if token == "{{":
                depth += 1
                cursor += 2
            elif token == "}}":
                depth -= 1
                cursor += 2
            else:
                cursor += 1
        if depth == 0:
            yield text[match.end():cursor - 2]


def fields(body):
    values, parts, start, braces, links, cursor = {}, [], 0, 0, 0, 0
    while cursor < len(body):
        token = body[cursor:cursor + 2]
        if token in ("{{", "[["):
            braces += token == "{{"
            links += token == "[["
            cursor += 2
        elif token == "}}":
            braces = max(0, braces - 1)
            cursor += 2
        elif token == "]]":
            links = max(0, links - 1)
            cursor += 2
        elif body[cursor] == "|" and not braces and not links:
            parts.append(body[start:cursor])
            start, cursor = cursor + 1, cursor + 1
        else:
            cursor += 1
    parts.append(body[start:])
    for part in parts:
        if "=" in part:
            key, value = part.split("=", 1)
            values[key.strip().lower()] = value.strip()
    return values


def plain(value):
    value = re.sub(r"<!--.*?-->", "", value, flags=re.S)
    value = re.sub(r"<ref\b[^>]*>.*?</ref>|<ref\b[^>]*/>", "", value, flags=re.S | re.I)
    # Only a few display templates carry useful data; citations are not stats.
    for _ in range(12):
        previous = value
        value = re.sub(r"\{\{([^{}]*)\}\}", lambda m: display_template(m[1]), value)
        if value == previous:
            break
    value = re.sub(r"\[\[([^]|]+)(?:\|([^]]+))?\]\]", lambda m: m[2] or m[1], value)
    value = re.sub(r"<br\s*/?>", "; ", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    return re.sub(r"\s+", " ", html.unescape(value).replace("'''", "").replace("''", "")).strip()


def display_template(body):
    parts = body.split("|")
    name = parts[0].strip().lower()
    if name in ("na", "n/a"):
        return "N/A"
    if name in ("fairycode", "fairy ring") and len(parts) > 1:
        return "Fairy ring " + parts[1].upper()
    if name == "scp" and len(parts) > 2:
        return parts[2] + " " + parts[1]
    if name == "floornumber":
        return next((p[3:] for p in parts if p.startswith("uk=")), "")
    return ""


def number(value):
    text = plain(value).replace(",", "")
    return float(text) if re.fullmatch(r"[+-]?\d+(?:\.\d+)?", text) else None


NUMBERS = ["combat", "hitpoints", "att", "str", "def", "mage", "range", "slaylvl", "size",
           "dstab", "dslash", "dcrush", "dmagic", "dlight", "dstandard", "dheavy", "attack speed",
           "elementalweaknesspercent"]
TEXT = ["name", "max hit", "attack style", "poisonous", "aggressive", "attributes",
        "elementalweaknesstype", "immunecannon", "poisonresistance", "venomresistance"]


def monster_forms(text):
    box = next(templates(text, "Infobox Monster"), None)
    if box is None:
        return []
    values = fields(box)
    versions = sorted({int(m[1]) for key in values if (m := re.search(r"(\d+)$", key))}) or [0]
    forms = []
    for version in versions:
        suffix = str(version) if version else ""
        field = lambda key: values.get(key + suffix, values.get(key, ""))
        form = {key: number(field(key)) for key in NUMBERS}
        form.update({key: plain(field(key)) or None for key in TEXT})
        form.update(id="form-" + suffix if suffix else "base", label=plain(field("version")) or field("name") or "Standard")
        form.update(combatText=plain(field("combat")), attackSpeedText=plain(field("attack speed")))
        # Inactive whirlpools/eggs are not fighting-stat presets.
        if not re.search(r"\b(?:whirlpool|egg|cocoon|inactive|dormant|dead|unused|removed|unreleased)\b", (form["label"] or ""), re.I) and (form["combat"] is not None or form["hitpoints"] is not None):
            forms.append(form)
    return forms


def monster_locations(text):
    result = []
    for block in templates(text.split("==Drops")[0].split("== Drops")[0], "LocLine"):
        row = fields(block)
        raw = row.get("location", "")
        label = plain(raw)
        if not label:
            continue
        refs = re.findall(r"\[\[([^]|]+)(?:\|[^]]+)?\]\]", raw)
        result.append(dict(name=label, page=refs[0] if refs else None,
            region=plain(row.get('leagueregion', '')) or None,
            levels=plain(row.get("levels", "")), creature=plain(row.get("name", "")),
            caveat=plain(" ".join(re.findall(r"<ref[^>]*>(.*?)</ref>", raw, flags=re.S))),
            taskOnly=bool(re.search(r"task.only|slayer task", raw, re.I)),
            limited=bool(re.search(r"unreachable|cannot actually|cutscene|during \[\[|quest only", raw, re.I))))
    return result
