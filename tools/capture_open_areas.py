"""Explicit, paced API capture for a fixed open-area review; never a crawler."""
import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

TITLES=['Asgarnian Ice Dungeon','Battlefront','Catacombs of Kourend','Chasm of Fire','Forthos Dungeon','Fremennik Slayer Dungeon',"Giants' Den",'Isle of Souls Dungeon','Kalphite Cave','Kalphite Lair','Kebos Swamp','Lava Maze Dungeon','Lizardman Canyon','Lizardman Settlement','Molch','Stronghold Slayer Dungeon','Stronghold of Security','Taverley Dungeon','Waterbirth Island','Wilderness Slayer Cave']
ROOT=Path(__file__).resolve().parents[1]

def capture(interval):
 folder=ROOT/'data/open-area-sources';folder.mkdir(exist_ok=True)
 existing={json.loads(p.read_text(encoding='utf-8-sig'))['title'] for f in ['sources','open-area-sources'] for p in (ROOT/'data'/f).glob('*.json')}
 needed=[name for name in TITLES if name not in existing]
 for start in range(0,len(needed),5):
  if start:time.sleep(interval)
  query=urllib.parse.urlencode(dict(action='query',redirects=1,titles='|'.join(needed[start:start+5]),prop='revisions',rvprop='ids|timestamp|content',rvslots='main',format='json',formatversion=2))
  request=urllib.request.Request('https://oldschool.runescape.wiki/api.php?'+query,headers={'User-Agent':'SlayerTargetPlanner/2.9 (bounded open-area access review)'})
  with urllib.request.urlopen(request,timeout=45) as response:data=response.read(3_000_001)
  if len(data)>3_000_000:raise ValueError('Response too large')
  for page in json.loads(data)['query']['pages']:
   if not page.get('revisions'):raise ValueError('Missing source '+page['title'])
   name=re.sub('[^a-z0-9]+','-',page['title'].lower()).strip('-')+'.json'
   (folder/name).write_text(json.dumps(page,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
   print('Captured',page['title'],page['revisions'][0]['revid'],flush=True)

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--fetch',action='store_true');parser.add_argument('--interval',type=float,default=8);args=parser.parse_args()
 if not args.fetch or args.interval<5:parser.error('Use --fetch and at least five seconds between requests')
 capture(args.interval)
