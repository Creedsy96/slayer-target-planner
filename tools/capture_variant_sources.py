"""Capture only the missing baseline creature pages, with bounded Wiki load."""
import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

TITLES = ['Blue dragon', 'Red dragon', 'Black bear', 'Rat', 'Spider']
ROOT = Path(__file__).resolve().parents[1]


def capture():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--interval', type=float, default=8)
    args = parser.parse_args()
    if not args.fetch or args.interval < 5:
        parser.error('Use --fetch and an interval of at least five seconds')
    folder = ROOT / 'data/sources'
    existing = {json.loads(p.read_text(encoding='utf-8-sig'))['title'].casefold()
                for name in ['sources', 'variant-sources'] for p in (ROOT / 'data' / name).glob('*.json')}
    needed = [title for title in TITLES if title.casefold() not in existing]
    for start in range(0, len(needed), 3):
        if start:
            time.sleep(args.interval)
        query = urllib.parse.urlencode(dict(action='query', redirects=1, titles='|'.join(needed[start:start+3]),
            prop='revisions', rvprop='ids|timestamp|content', rvslots='main', format='json', formatversion=2))
        request = urllib.request.Request('https://oldschool.runescape.wiki/api.php?' + query,
            headers={'User-Agent': 'SlayerTargetPlanner/3.0.4 (bounded baseline coverage repair; no crawling)'})
        with urllib.request.urlopen(request, timeout=45) as response:
            content = response.read(5_000_001)
        if len(content) > 5_000_000:
            raise ValueError('Capture response exceeds five MB')
        for page in json.loads(content)['query']['pages']:
            if not page.get('revisions'):
                raise ValueError('Missing source: ' + page['title'])
            name = re.sub(r'[^a-z0-9]+', '-', page['title'].lower()).strip('-')
            (folder / (name + '.json')).write_text(json.dumps(page, ensure_ascii=False, indent=2), encoding='utf-8')
            print('Captured', page['title'], 'revision', page['revisions'][0]['revid'], flush=True)


if __name__ == '__main__':
    capture()
