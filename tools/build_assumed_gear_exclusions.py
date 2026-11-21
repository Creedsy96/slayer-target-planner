"""Build ordinary-game availability exclusions from four retained Wiki pages.

No network requests. Only the echo-equipment overview's item links and the ID
columns of explicitly unobtainable sections are interpreted, never page prose.
"""
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]


def build():
    items = json.loads((ROOT / 'vendor/osrs-dps/source/cdn/json/equipment.json').read_text(encoding='utf-8'))
    excluded, sources = {}, []
    for path in sorted((ROOT / 'data/gear-sources').glob('*.json')):
        page = json.loads(path.read_text(encoding='utf-8'))
        revision = page['revisions'][0]
        text = revision['slots']['main']['content']
        sources.append(dict(title=page['title'], revision=revision['revid'],
            url='https://oldschool.runescape.wiki/w/' + quote(page['title'].replace(' ', '_'), safe='/:'), timestamp=revision['timestamp']))
        ids = set()
        if 'Echo bosses and echo equipment' in page['title']:
            overview = text.split('|}</onlyinclude>')[0]
            names = {name.casefold() for name in re.findall(r'\{\{plink\|([^|}]+)', overview, re.I)}
            ids = {item['id'] for item in items if item['name'].casefold() in names}
            reason = 'Temporary Leagues equipment'
        elif page['title'] == 'Wilderness champion amulet':
            ids = {int(re.search(r'^\|id\s*=\s*(\d+)', text, re.M)[1])}
            reason = 'Discontinued Wilderness Wars event equipment'
        elif page['title'] == 'Unobtainable items':
            parts = re.split(r'^==([^=\n]+)==\s*$', text, flags=re.M)
            for heading, body in zip(parts[1::2], parts[2::2]):
                if heading not in ['Never released', 'Discontinued before 2007', 'Discontinued after 2013', 'Can be seen ingame but not taken', 'Jagex Moderator Items', 'Joke items']:
                    continue
                for row in re.split(r'^\|-.*$', body, flags=re.M):
                    cells = re.findall(r'^\|(?![}|-])(.*)$', row, re.M)
                    if len(cells) < 3 or not cells[0].strip().isdigit():
                        continue
                    links = re.findall(r'\[\[([^]#|]+)(?:#[^]|]+)?(?:\|([^]]+))?\]\]', cells[2])
                    names = {name.casefold() for pair in links for name in pair if name}
                    # Old IDs can be reused. An ID alone must never exclude a
                    # different current item (e.g. Rogue boots versus old Gear).
                    ids.update(item['id'] for item in items if item['id'] == int(cells[0]) and item['name'].casefold() in names)
            reason = 'Unobtainable, discontinued or moderator-only equipment'
        else:
            raise ValueError('Unexpected gear-status source: ' + page['title'])
        for item in items:
            if item['id'] in ids:
                excluded[str(item['id'])] = dict(name=item['name'], reason=reason, source=page['title'])
    return dict(version='2026-11-21.1', sources=sources, items=excluded)


if __name__ == '__main__':
    result = build()
    (ROOT / 'data/assumed-gear-exclusions.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Built', len(result['items']), 'sourced assumed-gear exclusions; Wiki requests: 0.')
