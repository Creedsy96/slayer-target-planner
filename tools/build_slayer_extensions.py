"""Build the ordered Extend reward list from the retained shop source, offline."""
import argparse
import json
import re
from pathlib import Path
from guide_wikitext import plain

ROOT = Path(__file__).resolve().parents[1]
ICONS = {'black dragons': 'black-dragon', 'metal dragons': 'steel-dragon',
         'spiritual creatures': 'spiritual-mage', 'basilisks': 'basilisk',
         'fossil island wyverns': 'spitting-wyvern',
         'custodian stalker': 'mature-custodian-stalker'}


def key(text):
    return re.sub('[^a-z0-9]', '', text.lower()).rstrip('s')


def build():
    page = json.loads((ROOT / 'data/sources/slayer-rewards.json').read_text(encoding='utf-8'))
    catalogue = json.loads((ROOT / 'data/catalogue.json').read_text(encoding='utf-8'))
    variants = catalogue['variants'] + json.loads((ROOT / 'data/variant-additions.json').read_text(encoding='utf-8'))['variants']
    assignments = {key(a['id']): a for a in catalogue['assignments']}
    text = page['revisions'][0]['slots']['main']['content'].split('==Extend===', 1)[1].split('\n===', 1)[0]
    rewards = []
    for block in text.split('\n|-\n')[1:]:
        cells = re.split(r'^\|(?![}|-])', block, flags=re.M)
        if len(cells) < 6:
            continue
        creature = re.search(r'\[\[([^]|]+)', cells[5])[1]
        assignment = assignments[key(creature)]
        quantity = re.search(r'increased (?:to (\d+)-(\d+)|by (\d+))', cells[5])
        icon = ICONS.get(assignment['id'], assignment['variantIds'][0])
        if not any(v['id'] == icon for v in variants):
            raise ValueError('Missing creature icon: ' + icon)
        rewards.append({'assignmentId': assignment['id'], 'name': plain(cells[2]),
                        'points': int(cells[3].strip()), 'iconVariant': icon,
                        'quantity': {'extra': int(quantity[3])} if quantity[3] else {'minimum': int(quantity[1]), 'maximum': int(quantity[2])},
                        'toggleable': '{{Yes}}' in cells[4]})
    expected = {e['id'] for m in catalogue['masters'] for e in m['tasks']
                if e['extendedMin'] > 0 and e['extendedMax'] >= e['extendedMin']}
    if {r['assignmentId'] for r in rewards} != expected or len(rewards) != len(expected):
        raise ValueError('Reward list must cover each supported extendable assignment exactly once')
    return {'version': '2026-11-21.1', 'source': {'title': page['title'],
            'url': 'https://oldschool.runescape.wiki/w/Slayer_Rewards#Extend',
            'revision': page['revisions'][0]['revid']}, 'rewards': rewards}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'data/slayer-extensions.json')
    output = parser.parse_args().output
    data = build()
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Built', len(data['rewards']), 'Slayer extension rewards; live requests: 0.')
