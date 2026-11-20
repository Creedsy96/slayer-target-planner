"""Regenerate reviewed ordinary-entrance defaults from local source captures."""
import json
from pathlib import Path
from urllib.parse import quote
ROOT=Path(__file__).resolve().parents[1]
AREAS={
 'Asgarnian Ice Dungeon':'Wyverns, Royal Titans and shortcuts retain their own requirements.',
 'Battlefront':'Ordinary Kourend travel; fast teleports remain separate.',
 'Catacombs of Kourend':'Use the main statue entrance. Other entrances need their vines unlocked.',
 'Chasm of Fire':'Normal demon floors; Yama and shortcuts are separate encounters/access.',
 'Forthos Dungeon':'Ordinary stairs; altar/door unlocks and shortcuts are separate.',
 'Fremennik Slayer Dungeon':'Entrance is open; each monster retains its Slayer/equipment requirements.',
 "Giants' Den":'Ordinary entrance; no Slayer task needed for the giants.',
 'Isle of Souls Dungeon':'Travel to the island is separate from Soul Wars activity eligibility.',
 'Kalphite Cave':'Entry is open, but killing the monsters requires a matching task.',
 'Kalphite Lair':'Bring entrance ropes; the Queen and deeper room need separate preparation.',
 'Kebos Swamp':'Ordinary overland access; creatures/activities retain separate requirements.',
 'Lava Maze Dungeon':'Wilderness danger; specific entrances and tools still matter.',
 'Lizardman Canyon':'No Kourend favour requirement; shaman protection and western access route still matter.',
 'Lizardman Settlement':'Area entry is open; shaman equipment and movement remain separate.',
 'Molch':'Area entry is open; aerial fishing and individual cave methods have separate rules.',
 'Stronghold Slayer Cave':'Anyone can enter; attacks require an appropriate current Slayer task.',
 'Stronghold of Security':'Door/security questions and dangerous floors still apply.',
 'Taverley Dungeon':'Ordinary entrance only. Deeper gates require keys, combat actions or shortcuts.',
 'Waterbirth Island':'Jarvald costs 1,000 coins without Fremennik Trials; deeper dungeon doors/rooms remain separate.',
 'Wilderness Slayer Cave':'Open entry does not imply safety or meeting a creature/task requirement.',
}

def build():
 pages={v['title']:v for folder in ['sources','open-area-sources'] for p in (ROOT/'data'/folder).glob('*.json') for v in [json.loads(p.read_text(encoding='utf-8-sig'))]}
 rows=[]
 for name,note in AREAS.items():
  page=pages[name];revision=page['revisions'][0]
  rows.append(dict(key='location:'+name,name=name,note=note,source=dict(title=name,url='https://oldschool.runescape.wiki/w/'+quote(name.replace(' ','_'),safe='/:'),revision=revision['revid'])))
 cave=next(row for row in rows if row['name']=='Stronghold Slayer Cave')
 rows.append({**cave,'key':'location:Stronghold Slayer Dungeon','name':'Stronghold Slayer Dungeon'})
 (ROOT/'data/open-areas.json').write_text(json.dumps(dict(version='2026-11-20.1',scope='Ordinary entrance on a normal members world; not every wing, activity, creature or teleport.',areas=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':build()
