"""Fill missing location references with cached, sequential MediaWiki API batches.

Explicit opt-in only. Existing captures are reused; batches contain ten titles
and are spaced at least five seconds apart. No browser/page scraping is used.
"""
import argparse
import hashlib
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def retained_pages():
    pages = {}
    redirects = {}
    for file in sorted((ROOT / 'data').rglob('*.json')):
        data = json.loads(file.read_text(encoding='utf-8-sig'))
        if isinstance(data,list):
            redirects.update({r['from']:r['to'] for r in data if isinstance(r,dict) and 'from' in r and 'to' in r})
        if not isinstance(data, dict):
            continue
        records = [data] if data.get('revisions') else data.get('query', {}).get('pages', [])
        for record in records.values() if isinstance(records, dict) else records:
            if record.get('revisions'):
                pages[record['title'].casefold()] = record
    for _ in range(5):
        for source,target in redirects.items():
            if target.casefold() in pages:pages[source.casefold()]=pages[target.casefold()]
    return pages


def titles():
    guide = json.loads((ROOT / 'data/creature-guide.json').read_text(encoding='utf-8'))
    names = {l['page'] or l['name'] for r in guide['records'].values() for l in r['locations']}
    # These are catalogue/guide additions without ordinary monster-location rows.
    names.update(['Stalker Den', 'Canifis', 'TzHaar Fight Cave', 'Inferno',
                  'The Great Conch', 'Shellbane Gryphon Cave', 'Scorpia\'s Cave',
                  'Skeletal Tomb', 'Web Chasm', 'Skotizo', 'Mage Arena II',
                  'Ynysdail', 'Grimstone', 'Deepfin Point'])
    aliases = {'Godwars Dungeon': 'God Wars Dungeon', 'Farming guild': 'Farming Guild',
               'Dwarven Mines': 'Dwarven Mine', 'Gnome maze': 'Gnome Maze',
               'Clock Tower Dungeon': 'Clock Tower dungeon', 'Burgh De Rott': 'Burgh de Rott',
               "Shayziens' Wall": "Shayzien's Wall", 'Troll arena': 'Troll Arena',
               'Stronghold Slayer Dungeon': 'Stronghold Slayer Cave',
               'Fremennik Slayer Cave': 'Fremennik Slayer Dungeon',
               'Isle of Souls - Crumbling Tower basement': 'Crumbling Tower'}
    aliases["Scorpia's Cave"]='Scorpia'
    return sorted({aliases.get(n, n).split('#')[0].replace('_', ' ') for n in names})


def capture(fetch):
    pages = retained_pages()
    missing = [n for n in titles() if n.casefold() not in pages]
    print(f'{len(titles())} location references; {len(missing)} missing captures', flush=True)
    if not fetch:
        return
    destination = ROOT / 'data/location-sources'
    destination.mkdir(exist_ok=True)
    for offset in range(0, len(missing), 10):
        if offset:
            time.sleep(5)
        params = dict(action='query', format='json', formatversion=2, redirects=1,
                      prop='revisions', rvprop='ids|timestamp|content', rvslots='main',
                      titles='|'.join(missing[offset:offset + 10]))
        url = 'https://oldschool.runescape.wiki/api.php?' + urllib.parse.urlencode(params)
        request = urllib.request.Request(url, headers={
            'User-Agent': 'SlayerTargetPlanner/4.1.0 (cached location review; sequential batches)'})
        with urllib.request.urlopen(request, timeout=45) as response:
            result = json.load(response)
        if 'error' in result:
            raise ValueError(result['error'])
        for page in result['query']['pages']:
            # Keep absent references too: their review must not invent an entrance.
            name = hashlib.sha256(page['title'].encode()).hexdigest()[:16] + '.json'
            (destination / name).write_text(json.dumps(page, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        if result['query'].get('redirects'):
            name = f'redirects-{offset:03d}.json'
            (destination / name).write_text(json.dumps(result['query']['redirects'], indent=2) + '\n', encoding='utf-8')
        print(f'Captured batch {offset // 10 + 1}: {len(result["query"]["pages"])} pages', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fetch-missing', action='store_true')
    capture(parser.parse_args().fetch_missing)
