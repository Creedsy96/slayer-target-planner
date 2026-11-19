"""Build offline item artwork from pinned RuneLite cache assets, never the Wiki.

Run with --fetch only to populate missing cached originals. Ordinary app builds
copy the generated sheet and never perform network requests. Requires Pillow.
"""
import argparse
import hashlib
import io
import json
import math
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.desktop-build/item-art-cache'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def build(fetch=False):
    config = read(ROOT / 'data/item-references.json')
    commit = config['sourceCommit']
    base = f'https://raw.githubusercontent.com/runelite/static.runelite.net/{commit}/cache/item/'
    CACHE.mkdir(parents=True, exist_ok=True)

    def cached(name):
        path = CACHE / (commit + '-' + name.replace('/', '-'))
        if not path.exists():
            if not fetch:
                raise ValueError('Missing cached asset; explicitly use --fetch: ' + name)
            request = urllib.request.Request(base + name, headers={'User-Agent': 'SlayerTargetPlanner/2.8.1 (offline item art)'})
            with urllib.request.urlopen(request, timeout=45) as response:
                content = response.read(2_000_001)
            if len(content) > 2_000_000:
                raise ValueError('Oversized item asset: ' + name)
            path.write_bytes(content)
            time.sleep(.15)  # Sequential, bounded static-file downloads; no Wiki I/O.
        return path.read_bytes()

    names = json.loads(cached('names.json'))
    index = {}
    for item_id, name in sorted(names.items(), key=lambda pair: int(pair[0])):
        index.setdefault(name.casefold(), int(item_id))
    references = config['references']
    ids = sorted({index[r['item'].casefold()] for r in references.values() if 'item' in r})
    columns, cell = 16, 40
    sheet = Image.new('RGBA', (columns * cell, math.ceil(len(ids) / columns) * cell))
    entries = {}
    for frame, item_id in enumerate(ids):
        content = cached(f'icon/{item_id}.png')
        image = Image.open(io.BytesIO(content)).convert('RGBA')
        if max(image.size) > 38:
            image.thumbnail((38, 38), Image.Resampling.LANCZOS)
        sheet.alpha_composite(image, (frame % columns * cell + (cell - image.width) // 2,
                                     frame // columns * cell + (cell - image.height) // 2))
        entries[item_id] = dict(frame=frame, name=names[str(item_id)], source=base + f'icon/{item_id}.png',
                                sha256=hashlib.sha256(content).hexdigest())
        if (frame + 1) % 40 == 0:
            print('Prepared', frame + 1, '/', len(ids), 'item icons', flush=True)
    aliases = {label: dict(page=r['page'], itemId=index[r['item'].casefold()] if 'item' in r else None)
               for label, r in references.items()}
    sheet.save(ROOT / 'assets/items.png', optimize=True)
    output = dict(sourceCommit=commit, columns=columns, rows=math.ceil(len(ids) / columns), cell=cell,
                  entries=entries, aliases=aliases)
    (ROOT / 'src/ui/item-art.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Built', len(entries), 'item icons and', len(aliases), 'linked labels. Wiki requests: 0.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fetch', action='store_true')
    build(parser.parse_args().fetch)
