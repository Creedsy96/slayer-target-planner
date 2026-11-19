"""Read the supplied XLSX as data, without evaluating workbook content."""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def read_workbook(path):
    with ZipFile(path) as archive:
        strings = ["".join(x.itertext()) for x in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("s:si", NS)]
        names = [s.attrib["name"] for s in ET.fromstring(archive.read("xl/workbook.xml")).findall("s:sheets/s:sheet", NS)]
        result = {}
        for i, name in enumerate(names, 1):
            cells = {}
            for c in ET.fromstring(archive.read(f"xl/worksheets/sheet{i}.xml")).findall("s:sheetData/s:row/s:c", NS):
                value = c.find("s:v", NS)
                formula = c.find("s:f", NS)
                v = value.text if value is not None else None
                if c.attrib.get("t") == "s" and v is not None:
                    v = strings[int(v)]
                elif v is not None and c.attrib.get("t") not in ("str", "e"):
                    v = float(v)
                cells[c.attrib["r"]] = {"v": v, "f": formula.text if formula is not None else None}
            result[name] = cells
        return result


if __name__ == "__main__":
    data = read_workbook(sys.argv[1])
    Path(sys.argv[2]).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    for name, cells in data.items():
        print(name, len(cells), "cells")
