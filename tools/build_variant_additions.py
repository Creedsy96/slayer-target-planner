"""Build reviewed additive variants without rewriting the base catalogue."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build():
    page = json.loads((ROOT / 'data/variant-sources/black-dragon.json').read_text(encoding='utf-8-sig'))
    content = page['revisions'][0]['slots']['main']['content']
    hp = [int(re.search(r'^\|\s*hitpoints'+str(i)+r'\s*=\s*(\d+)\s*$', content, re.M)[1]) for i in [1, 2]]
    assigned = re.search(r'^\|assignedby\s*=\s*([^\n]+)', content, re.M)[1].strip().split(',')
    for location in ['Lava Maze Dungeon', 'Wilderness Slayer Cave']:
        if '[['+location+']]' not in content:
            raise ValueError('Black dragon location source changed: '+location)
    source = {'title': 'Black dragon', 'url': 'https://oldschool.runescape.wiki/w/Black_dragon', 'revision': page['revisions'][0]['revid']}
    variants = []
    for index, (vid, name, location) in enumerate([
        ('black-dragon', 'Black dragon (level 227)', 'Lava Maze Dungeon'),
        ('black-dragon-wilderness-slayer-cave', 'Black dragon (Wilderness Slayer Cave)', 'Wilderness Slayer Cave'),
    ]):
        masters = [master.strip() for master in assigned if not (index == 1 and master.strip() == 'konar')]
        variants.append({'id': vid, 'name': name, 'assignmentIds': ['black dragons'], 'hp': hp[index], 'multiplier': 1,
                         'requirements': [{'kind': 'skill', 'key': 'slayer', 'min': 0, 'label': 'Slayer'}],
                         'source': source, 'status': 'reviewed-variant', 'drops': [],
                         'masterAssignments': {master: ['black dragons'] for master in masters},
                         'masterLocations': {'krystilia': [location]}})
    for title in ['Frost Nagua', 'Earthen Nagua']:
        record = json.loads((ROOT / ('data/variant-sources/'+title.lower().replace(' ', '-')+'.json')).read_text(encoding='utf-8'))
        text = record['revisions'][0]['slots']['main']['content']
        def number(field):
            return int(re.search(r'^\|\s*'+field+r'\s*=\s*(\d+)\s*$', text, re.M)[1])
        variants.append({'id': title.lower().replace(' ', '-'), 'name': title, 'assignmentIds': ['lesser nagua'],
                         'hp': number('hitpoints'), 'multiplier': 1, 'requirements': [{'kind': 'skill', 'key': 'slayer', 'min': number('slaylvl'), 'label': 'Slayer'}],
                         'source': {'title': title, 'url': 'https://oldschool.runescape.wiki/w/'+title.replace(' ', '_'), 'revision': record['revisions'][0]['revid']},
                         'status': 'reviewed-variant', 'drops': [], 'masterAssignments': {'chaeldar': ['lesser nagua'], 'konar': ['lesser nagua']}})
    record = json.loads((ROOT / 'data/variant-sources/ice-troll-runt.json').read_text(encoding='utf-8'))
    variants.append({'id': 'ice-troll-runt', 'name': 'Ice troll runt', 'assignmentIds': ['trolls'],
                     'hp': 60, 'multiplier': 1, 'requirements': [],
                     'source': {'title': record['title'], 'url': 'https://oldschool.runescape.wiki/w/Ice_troll_runt', 'revision': record['revisions'][0]['revid']},
                     'status': 'reviewed-variant', 'drops': [],
                     'masterAssignments': {m: ['trolls'] for m in ['vannaka', 'chaeldar', 'konar', 'nieve', 'duradel']}})
    record = json.loads((ROOT / 'data/variant-sources/dagannoth-waterbirth-island.json').read_text(encoding='utf-8'))
    variants.append({'id': 'dagannoth-waterbirth-island', 'name': 'Dagannoth (Waterbirth Island)', 'assignmentIds': ['dagannoth'],
                     'hp': 85, 'multiplier': 1, 'requirements': [],
                     'source': {'title': record['title'], 'url': 'https://oldschool.runescape.wiki/w/Dagannoth_(Waterbirth_Island)', 'revision': record['revisions'][0]['revid']},
                     'status': 'reviewed-variant', 'drops': [],
                     'masterAssignments': {m: ['dagannoth'] for m in ['vannaka', 'chaeldar', 'konar', 'nieve', 'duradel']}})
    return {'schemaVersion': 1, 'version': '2026-11-21.2', 'variants': variants}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT / 'data/variant-additions.json')
    output = parser.parse_args().output
    output.write_text(json.dumps(build(), indent=2)+'\n', encoding='utf8')
    print('Built reviewed variant additions: '+str(output))
