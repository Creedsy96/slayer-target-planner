"""Generate the complete Konar location audit offline from retained sources."""
import json
import re
from pathlib import Path
from guide_wikitext import plain

ROOT = Path(__file__).resolve().parents[1]
ALIASES = {
    'Abyssal Area': ['Abyss', 'Abyssal Nexus'],
    "Jormungand's Prison": ['Isle of Stone'],
    'Stronghold Slayer Dungeon': ['Stronghold Slayer Cave'],
    "Myths' Guild Dungeon": ["Myths' Guild", "Myths' Guild Basement", 'Corsair Cove Dungeon'],
    'Waterbirth Island': ['Waterbirth Island Dungeon'],
    'Fremennik Isles': ['Jatizso', 'Neitiznot'],
    'Lizardman Settlement': ['Lizardman Caves'],
    'Molch': ['Lizardman Temple'],
    'South of Mount Quidamortem': ['Mount Quidamortem'],
    'Troll Stronghold (location)': ['Troll Stronghold'],
    'Death Plateau (location)': ['Death Plateau'],
}
def normal(text):
    return re.sub(r'[^a-z0-9]', '', text.lower())

def canonical(text):
    clean = re.sub(r'\s*\([^)]*\)', '', text).strip()
    return next((key for key, aliases in ALIASES.items() if normal(text) in map(normal, [key]+aliases) or normal(clean) in map(normal, [key]+aliases)), clean)

def build():
    data = json.loads((ROOT/'data/catalogue.json').read_text(encoding='utf-8'))
    additions = json.loads((ROOT/'data/variant-additions.json').read_text(encoding='utf-8'))['variants']
    guide = json.loads((ROOT/'data/creature-guide.json').read_text(encoding='utf-8'))['records']
    page = json.loads((ROOT/'data/konar-sources/konar-quo-maten.json').read_text(encoding='utf-8'))
    text = page['revisions'][0]['slots']['main']['content']
    source = {'title': page['title'], 'url': 'https://oldschool.runescape.wiki/w/Konar_quo_Maten', 'revision': page['revisions'][0]['revid']}
    master = next(m for m in data['masters'] if m['id']=='konar')
    by_name = {('boss' if t['id']=='boss' else normal(t['id']).rstrip('s')): t for t in master['tasks']}
    result = {}
    for block in re.split(r'\n\|-\s*\r?\n', text):
        if '{{+=|weight|' not in block:
            continue
        cells = re.split(r'^\|(?![}|-])', block, flags=re.M)[1:]
        if len(cells)<7:
            continue
        label = plain(cells[0]); key = 'boss' if label=='Bosses' else normal(label).rstrip('s')
        if key not in by_name:
            raise ValueError('Unmatched Konar assignment: '+label)
        task = by_name[key]; pool=[]
        for line in cells[1].splitlines():
            if not line.startswith('*'):
                continue
            links = re.findall(r'\[\[([^]|]+)(?:\|[^]]+)?\]\]', line)
            location = 'South of Mount Quidamortem' if line.startswith('*South of') else canonical(links[0])
            if location not in pool:
                pool.append(location)
        variants = [v for v in data['variants']+additions if task['id'] in v['assignmentIds']]
        location_variants = {name: set() for name in pool}
        for variant in variants:
            for loc in guide.get(variant['id'], {}).get('locations', []):
                if loc.get('limited'):
                    continue
                matches = {canonical(loc['name']), canonical(loc.get('page') or '')}
                for name in pool:
                    if name in matches:
                        location_variants[name].add(variant['id'])
        # Konar's explicit alternatives establish assignment groups, including
        # nested boss chambers such as Abyssal Nexus under the Abyss roll.
        for line in cells[-2].splitlines():
            if not line.startswith('*'):
                continue
            before, separator, after = line.partition(':')
            locations = [canonical(title) for title in re.findall(r'\[\[([^]|]+)(?:\|[^]]+)?\]\]', before)] if separator else pool
            monster_links = re.findall(r'\[\[([^]|]+)(?:\|([^]]+))?\]\]', after if separator else line)
            names = {normal(name) for pair in monster_links for name in pair if name}
            for variant in variants:
                if normal(variant['name']) not in names and normal(variant['source']['title']) not in names:
                    continue
                for name in locations:
                    if name in location_variants:
                        location_variants[name].add(variant['id'])
        for ids in location_variants.values():
            ids.difference_update({'dad', 'ice-troll-king', 'arrg', 'black-dragon-wilderness-slayer-cave'})
        reviewed = [{'id': v['id'], 'name': v['name'], 'locations': [name for name in pool if v['id'] in location_variants[name]], 'source': v['source']} for v in variants]
        for row in reviewed:
            if not row['locations']:
                row['note'] = 'No reviewed repeatable method within this assignment location pool; quest-only, reanimation and outside-area encounters are not assumed compatible.'
        requirements = {}
        if task['id'] in ['black dragons', 'blue dragons', 'red dragons']:
            requirements['Catacombs of Kourend'] = [{'kind':'skill', 'key':'combat', 'min':100, 'label':'Combat'}]
            if task['id']=='black dragons':
                requirements['Catacombs of Kourend'].append({'kind':'skill', 'key':'slayer', 'min':77, 'label':'Slayer'})
        result[task['id']] = {'locations': pool, 'requirements': requirements, 'variants': reviewed, 'source': source,
                              'mode': 'uniform' if pool else 'specific-boss', 'note': '' if pool else 'Boss task locations depend on the specific boss; the aggregate boss timing scenario is not a uniform creature/location target.'}
    if set(result) != {t['id'] for t in master['tasks']}:
        raise ValueError('Konar audit does not cover every assignment')
    for task, record in result.items():
        for name in record['locations']:
            if not any(name in v['locations'] for v in record['variants']):
                raise ValueError('No modelled completion creature: '+task+' / '+name)
    output = {'version':'2026-11-21.1', 'source':source, 'aliases':ALIASES, 'assignments':result}
    (ROOT/'data/konar-locations.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    lines=['Assignment,Variant,Matching locations,Total locations,Locations']
    import csv,io
    buffer=io.StringIO(); writer=csv.writer(buffer);writer.writerow(['Assignment','Variant','Matching locations','Total locations','Locations'])
    for task, record in result.items():
        for variant in record['variants']:
            writer.writerow([task,variant['name'],len(variant['locations']),len(record['locations']),'; '.join(variant['locations']) or variant['note']])
    (ROOT/'docs/reference/konar-location-audit.csv').write_text(buffer.getvalue(),encoding='utf-8',newline='')
    print('Audited',len(result),'assignments;',sum(len(r['variants']) for r in result.values()),'assignment/variant pairs.')

if __name__=='__main__':
    build()
