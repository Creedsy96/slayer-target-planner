"""Build the location review index from retained primary sources and explicit rules.

No network I/O. Transport notes are attributed source extracts, not inferred
teleport ownership. Entrance gates below are reviewed separately from shortcuts,
supplies, quest encounters and nearby creatures outside a guild.
"""
import argparse
import csv
import json
import re
from pathlib import Path
from urllib.parse import quote
from capture_location_sources import retained_pages, titles
from guide_wikitext import plain, templates

ROOT = Path(__file__).resolve().parents[1]
ALIASES = {
    'Godwars Dungeon': 'God Wars Dungeon', 'Farming guild': 'Farming Guild',
    'Dwarven Mines': 'Dwarven Mine', 'Clock Tower Dungeon': 'Clock Tower dungeon',
    'Burgh De Rott': 'Burgh de Rott', 'Fremennik Slayer Cave': 'Fremennik Slayer Dungeon',
    'Stronghold Slayer Dungeon': 'Stronghold Slayer Cave',
    'Isle of Souls - Crumbling Tower basement': 'Crumbling Tower',
    'Black Knights\' Fortress': 'Black Knights\' Fortress (location)',
    "Legends'_Guild#Dungeon": "Legends' Guild", "Scorpia's Cave": 'Scorpia',
    'Legends\' Guild#Dungeon': "Legends' Guild",
    'Skotizo’s arena (Catacombs of Kourend; boss summon)': 'Skotizo',
    'Wilderness (Mage Arena II roaming encounter)': 'Mage Arena II',
    "Branda and Eldric's Lair (Asgarnian Ice Dungeon)": 'Asgarnian Ice Dungeon',
    'Shellbane Gryphon Cave (The Great Conch)': 'Shellbane Gryphon Cave',
    'Vet’ion’s Rest / Skeletal Tomb (boss summons)': "Vet'ion's Rest",
    'Ancient Pyramid (random spawns)': 'Ancient Pyramid',
    'Pyramid Plunder / Sophanem Dungeon (trap spawns)': 'Sophanem Dungeon',
    'TzHaar Fight Caves (final wave)': 'TzHaar Fight Cave',
    'Inferno (final wave)': 'Inferno',
    'Scorpia’s Cave (summoned guardians)': 'Scorpia',
    'Skeletal Tomb (level 21 Wilderness)': 'Skeletal Tomb',
    'Web Chasm (level 29 Wilderness)': 'Web Chasm',
    'Feldip Hills (baited chompy hunting)': 'Feldip Hills',
    'Ice Troll Caves (The Fremennik Isles quest encounter)': 'Ice Troll Caves',
    'Arceuus Dark Altar (reanimation area)': 'Dark Altar',
    'Canifis (transformed townsfolk)': 'Canifis',
}
REVIEWS = {}


def review(names, **rule):
    for name in names.split('|'):
        REVIEWS[name.casefold()] = dict(rule)


def quest(names, name, partial=False, **rule):
    review(names, quest=name, states=[0, None, 1] if partial else [0, 0, 1], **rule)


quest('Stalker Den', 'Shadows of Custodia', travel=['Kebos Lowlands, south of Mount Quidamortem', 'Follow Custodia Pass to the northern den entrance'], caveats=['The southern entrance needs 59 Agility; the northern entrance avoids that requirement.', 'Rooms differ between single and multi-combat; cannon use depends on the room.'])
quest('Tonali Cavern', 'The Final Dawn', travel=['Tlati Rainforest', 'Crypt of Tonali entrance', 'Descend to the requested chamber'], cannon=False, caveats=['This is not Neypotzli. The Moon and Sun chambers and the lift have their own positions.'])
quest('Crypt of Tonali', 'The Final Dawn', partial=True)
quest('Dragon Nest|Aldarin|Mistrock|Custodia Mountains|Custodia Pass|Avium Savannah|Colossal Wyrm Remains|Gloomthorn Trail|Mons Gratia|Ortus Farm|Outer Fortis|Ralos\' Rise|Ralos\' Rise mine|Salvager Overlook|Stonecutter Outpost|Tal Teklan|The Proudspire|Twilight Temple|Fortis Cothon', 'Children of the Sun')
quest('Apsul Hunting Ground|Virer Hunting Ground', 'The Blood Moon Rises', partial=True)
quest('The Great Conch|Abalone Cliffs|Gryphon Caves|Shellbane Gryphon Cave', 'Troubled Tortugans', partial=True,
      caveats=['Give Floopa the bandage during Troubled Tortugans. Charter ships/fairy ring CJQ avoid imposing the 45 Sailing mooring requirement on every route.'])
quest('Ape Atoll|Ape Atoll Dungeon|Marim|Temple of Marimbo|Temple of Marimbo Dungeon', 'Monkey Madness I', partial=True,
      travel=['Grand Tree: Daero, then Waydar', 'Crash Island: speak to Lumdo', 'Ape Atoll: follow the relevant temple or tunnel entrance'], caveats=['A greegree and quest travel steps may still be needed. Monkey Madness II removes surface hostility, not all dungeon dangers.'])
quest('Kruk\'s Dungeon', 'Monkey Madness II', partial=True)
quest('Grand Tree mine', 'The Grand Tree')
quest('Combat Training Camp', 'Biohazard')
quest('Braindeath Island', 'Rum Deal', partial=True, travel=['North-east of Port Phasmatys', 'Speak to Pirate Pete', 'Enter the brewery basement'])
quest('Crabclaw Caves', 'The Depths of Despair', partial=True, caveats=['The Sand Snake quest room closes after the quest; the cave entrance does not prove repeatable access to that encounter.'])
quest('Crandor', 'Dragon Slayer I', partial=True, travel=['Musa Point or Brimhaven', 'Karamja Volcano dungeon', 'Unlocked false wall, then the rope up to Crandor'], caveats=['First access uses the repaired quest ship. Subsequent access needs the false wall unlocked from the Crandor side.'])
quest('Digsite Dungeon', 'The Dig Site', partial=True)
quest('Dorgesh-Kaan South Dungeon', 'Death to the Dorgeshuun', caveats=['Bring a safe light source. The Lumbridge Swamp Cave connection has a separate 36 Agility step.'])
quest('Dorgesh-Kaan mine', 'The Lost Tribe', partial=True)
quest('Heroes\' Guild', 'Heroes\' Quest')
quest('Iceberg', 'Cold War', partial=True)
quest('Ice Troll Caves|Jatizso mine', 'The Fremennik Isles', partial=True)
quest('Iorwerth Camp|Isafdar|Tyras Camp', 'Regicide', partial=True, caveats=['Forest obstacles and traps remain. The Arandar gate is a separate completed-quest route.'])
quest('Arandar', 'Regicide')
quest('Lletya', "Mourning's End Part I", partial=True)
quest('Kharazi Jungle|Shaman Caves|Viyeldi caves', "Legends' Quest", partial=True,
      travel=['South of Shilo Village', 'Cut into Kharazi Jungle with an axe and machete', 'Mossy rock in the north-west: Shaman Caves; winch leads deeper'], caveats=['These are Karamja caves, not Lizardman shaman caves. Deeper routes need the relevant quest steps, ropes and tools.'])
quest("Legends' Guild", "Legends' Quest", caveats=['The grounds can be entered during the quest; the listed Slayer creatures are in the post-quest basement.'])
quest('Killerwatt plane', 'Ernest the Chicken', travel=['Draynor Manor', 'Top floor: Professor Oddenstein', 'Enter the portal'], caveats=['Insulated boots or an applicable protective item are needed to fight killerwatts.'])
quest('Jiggig Dungeon', 'Zogre Flesh Eaters', partial=True)
quest('Lunar Isle', 'Lunar Diplomacy', partial=True, caveats=['Use the Lady Zay route via Pirates\' Cove. NPC interaction may require a seal of passage unless exempt.'])
quest('Pirates\' Cove|Lady Zay', 'Lunar Diplomacy', partial=True)
quest('Miscellania and Etceteria dungeon', 'Royal Trouble', partial=True, caveats=['Only the appropriate post-boss quest stage opens the full caves. The giant sea snake boss chamber closes after the fight.'])
quest('Piscatoris Fishing Colony', 'Swan Song', caveats=['During the quest the colony is instanced. Completed Swan Song proves the ordinary repeatable colony.'])
quest('Shilo Village (location)', 'Shilo Village')
quest('Necropolis|Scabaras Dungeon', 'Beneath Cursed Sands', partial=True)
quest('Shade Catacombs', "Shades of Mort'ton", caveats=['Bring a bronze shade key or better; higher doors require the appropriate key tier.'])
quest('Rat Pits', 'Ratcatchers', partial=True, caveats=['The four pits unlock at different quest steps. A started quest alone does not prove every pit.'])
quest('Red Rock', 'The Red Reef', partial=True)
quest('The Pandemonium|Pandemonium Cave', 'Pandemonium', partial=True)
quest('Weiss', 'Making Friends with My Arm', partial=True)
quest('West Ardougne', 'Plague City', partial=True)
quest('Troll arena', 'Troll Stronghold', partial=True)
quest('Trollweiss Mountain', 'Troll Romance', caveats=['Bring a waxed sled for descending. The passage through Trollweiss Dungeon is a different location.'])
quest('Tarn\'s Lair', 'Haunted Mine', caveats=['Bring a salve amulet for the Abandoned Mine entrance. A Slayer ring is an alternative approach.'])
quest('Barbarian Outpost Agility Course', "Alfred Grimhand's Barcrawl", skills={'agility':35})
review('Abyssal Nexus', confirmation='Confirm fairy ring DIP access, or the Enter the Abyss approach (Wilderness, skull and Prayer-drain risk).', proof=['Fairytale II - Cure a Queen','Enter the Abyss'])
review('Wilderness God Wars Dungeon', anySkills={'strength':60,'agility':60}, travel=['Level 28 Wilderness, east of the Forgotten Cemetery', 'Enter the cave', 'Pass the 60 Strength boulder or 60 Agility wall'], caveats=['This is not the main God Wars Dungeon. No faction boss-room kill count is required; carry god protection and plan for PvP risk.'])

for name, skill, level in [
    ('Ah Za Rhoon', 'agility', 32), ('Cairn Isle', 'agility', 15),
    ('Brimhaven Dungeon', 'woodcutting', 10), ('Chaos Druid Tower', 'thieving', 46),
    ('Magic axe hut', 'thieving', 32), ("Pirates' Hideout", 'thieving', 39),
    ('Moss Giant Island', 'agility', 10), ('Mining Guild', 'mining', 60),
    ("Wizards' Guild", 'magic', 66), ('Woodcutting Guild', 'woodcutting', 60),
    ('Fishing Guild', 'fishing', 68), ('Farming Guild', 'farming', 45),
    ("Buccaneers' Haven", 'sailing', 76), ("Buccaneers' Laboratory", 'sailing', 76),
    ('Charred Island', 'sailing', 60), ('Charred Dungeon', 'sailing', 60),
    ('Deepfin Mine', 'sailing', 67), ('Grimstone Dungeon', 'sailing', 87),
    ('Isle of Bones', 'sailing', 56), ('Laguna Aurorae', 'sailing', 58),
    ('Kurask Lair', 'sailing', 58), ('Port Roberts', 'sailing', 50),
    ('Shimmering Atoll', 'sailing', 49), ('Sunbleak Island', 'sailing', 72),
    ('Sunbleak Cave', 'sailing', 72), ('The Onyx Crest', 'sailing', 47),
    ('Wintumber Island', 'sailing', 63),
]:
    review(name, skills={skill: level})

review('Tear of the Soul', caveats=['Sailing 61 and an inoculation station for mooring; alternatively use the rowboat from the Isle of Souls. Do not apply the Sailing requirement to the rowboat route.'], travel=['Edgeville Soul Wars portal', 'Isle of Souls: south-east shore', 'Take the unlocked rowboat to Tear of the Soul'], confirmation='The rowboat must first be built, or use the 61 Sailing mooring route with an inoculation station.')
quest('Vatrachos Island', 'Children of the Sun', caveats=['The 46 Sailing mooring route has a built-rowboat alternative from Stonecutter Outpost.'], confirmation='Confirm the built rowboat from Stonecutter Outpost, or the 46 Sailing mooring route.')
review('Wyrmscraig', caveats=['62 Sailing for first mooring; necklace of passage/Slayer ring destinations unlock through Fallen From Grace.'], confirmation='Confirm the first 62 Sailing visit or the unlocked Fallen From Grace teleport route.', proof=['Fallen From Grace'])
review('Ynysdail|Ynysdail Cavern', confirmation='Confirm 73 Sailing mooring with an adamant keel, or the built Gwenith rowboat after Song of the Elves.', caveats=['The Gwenith rowboat avoids a Sailing requirement, but needs Song of the Elves and prior construction. The cavern prohibits cannons.'], cannon=False)
review('Grimstone', skills={'sailing':87}, caveats=['An eternal brazier is needed for the icy-seas approach. Fairy ring DLP only becomes available after first mooring.'])
review('Deepfin Point', skills={'sailing':67})
review('Champions\' Guild', questPoints=32)
review('Warriors\' Guild', combinedMelee=130, caveats=['99 Attack or 99 Strength also permits entry. Temporary boosts do not count. Cyclopes still need tokens or the cape exemption and the correct defender tier.'])
review('Crafting Guild', travel=['South-west of Falador', 'Use the external cow pen beside the guild'], caveats=['The listed cows and calves are outside the guild. The interior\'s 40 Crafting/apron requirement does not gate these creatures.'])
review('The Node', unsupported=True, caveats=['Group Ironman formation area; not a normal repeatable Slayer route for arbitrary characters.'])
review('Limbo', unsupported=True, caveats=['No standard mooring route; requires the special world-hop/other-player boat behaviour. Excluded from ordinary recommendations.'])
review('Glarial\'s Tomb', confirmation='Requires Glarial\'s pebble and an unarmed, unarmoured, rune-free entry method.', caveats=['Waterfall Quest completion does not waive the pebble and equipment restrictions.'])
review('Ardougne Sewers', confirmation='Confirm the relevant sewer section: Clock Tower valve, Hazeel Cult route or Ratcatchers basement; they are not interchangeable.', caveats=['Three disconnected sewer sections have different entrances and quest steps.'])
review('Shadow Dungeon', confirmation='Requires an equipped ring of visibility or ring of shadows for the ladder.', travel=['East of Baxtorian Falls, near Rasolo', 'Wear the required visibility ring', 'Descend the visible ladder'])
review('Skavid caves', confirmation='Bring the skavid map and a light source; the map is obtained during Watchtower.', caveats=['Without the map, entry moves you to another exit instead of the chosen cave.'])
review('Melzar\'s Maze', confirmation='Requires the maze key from Dragon Slayer I and the correct coloured-door route.')
review('Sunbleak Island', skills={'sailing':72}, caveats=['An adamant helm is required for the tangled kelp on the approach.'])
review('Sunbleak Cave', skills={'sailing':72}, caveats=['The island approach needs an adamant helm. The skeleton behind the barred door cannot be attacked.'])
review('Entrana|Entrana Dungeon', caveats=['Entrana forbids ordinary weapons and armour. The dungeon is one-way, drains Prayer and needs an exit teleport or the Wilderness exit.'])
review('Entrana', travel=['Port Sarim monks\' ship', 'Pass the equipment inspection', 'Entrana'])
review('Revenant Caves', caveats=['100,000 coin entry fee and singles-plus PvP risk; protect only equipment you are prepared to lose.'], cannon=False)
for name, boss, diary in [("Callisto's Den", 'Callisto', 'medium'), ("Vet'ion's Rest", "Vet'ion", 'medium'), ('Silk Chasm', 'Venenatis', 'medium'), ("Hunter's End", 'Callisto', 'hard'), ('Skeletal Tomb', "Vet'ion", 'hard'), ('Web Chasm', 'Venenatis', 'hard')]:
    review(name, confirmation=f'Requires {diary} Wilderness diary OR a specific {boss} boss task, plus the shared 50,000 coin entry fee.', caveats=['A generic bear, skeleton or spider assignment does not bypass the diary gate. PvP risk applies.'])
review('Scorpia', travel=['Deep Wilderness: Scorpion Pit', 'Descend the cave entrance', 'Scorpia chamber'], caveats=['Wilderness PvP risk; Scorpia does not inherit the other Wilderness bosses\' diary/50,000 coin entry rule.'])
review('Brimhaven Dungeon', caveats=['The ordinary entrance is open with its fee. Bring an axe and 10 Woodcutting for the vine routes; deeper stepping stones have their own Agility requirements.'])
review('TzHaar Fight Cave', cannon=False, caveats=['TzTok-Jad is reached through the full wave sequence, not by walking directly to a normal spawn.'])
review('Inferno', cannon=False, confirmation='Requires showing a fire cape for Mor Ul Rek and sacrificing one to unlock the Inferno; use a full-wave method.', caveats=['TzKal-Zuk is the final wave, not a repeatable ordinary room spawn.'])
review('Shaman Caves', **REVIEWS['shaman caves'], cannon=False)
REVIEWS['gryphon caves']['cannon']=True


def without_media(text):
    while match:=re.search(r'\[\[(?:File|Image|Category):',text,re.I):
        depth,cursor=1,match.end()
        while cursor<len(text)-1 and depth:
            token=text[cursor:cursor+2]
            if token=='[[':depth+=1;cursor+=2
            elif token==']]':depth-=1;cursor+=2
            else:cursor+=1
        text=text[:match.start()]+text[cursor:]
    return text


def clean(text):
    text = without_media(text)
    text = re.sub(r'\{\{(?:Icon|Teleport|Transport|Slayer icon)\|([^{}]+)\}\}', lambda m: m[1].split('|')[0], text, flags=re.I)
    return plain(text).replace('__NOTOC__', '').strip()


def build():
    pages = retained_pages()
    redirects = dict(ALIASES)
    for file in sorted((ROOT / 'data/location-sources').glob('redirects*.json')):
        redirects.update({r['from']:r['to'] for r in json.loads(file.read_text())})
    aliases = {k.casefold():v for k,v in redirects.items()}
    def canonical(name):
        name = name.replace('_',' ').split('#')[0]
        for _ in range(5):
            target = aliases.get(name.casefold())
            if not target or target.casefold()==name.casefold():break
            name=target
        return name
    records = {}
    for name in titles():
        title = canonical(name)
        page = pages.get(title.casefold())
        if not page:raise ValueError('Missing reviewed source: '+name+' -> '+title)
        revision = page['revisions'][0]
        text = without_media(revision['slots']['main']['content'])
        rule = dict(REVIEWS.get(title.casefold(), {}))
        lead = re.split(r'(?m)^==',text)[0]
        summary = clean(lead)
        summary = re.sub(r'^(?:left|right|thumb|\d+px)(?:\|[^ ]*)?\s*','',summary)
        # Retain bounded, attributed entrance/transport notes, not arbitrary tables
        # or later lore. Missing transport headings do not invent a teleport.
        sections = re.split(r'(?m)^==([^=\n]+)==\s*\n',text)
        transport = [sections[i+1] for i in range(1,len(sections)-1,2) if re.search(r'transport|getting there|accessing|travel|entrance', sections[i], re.I)]
        notes=[]
        for section in transport:
            for line in section.splitlines():
                if not line.strip() or line.startswith(('|','!','{','}','==')):continue
                value=clean(line.lstrip('*#: '))
                if len(value)>30 and value not in notes and not re.search(r'^(?:thumb|left\||right\||Category:)',value):notes.append(value)
        notes = [n[:800] for n in notes[:8]]
        approach=rule.pop('travel', None)
        if not approach:
            # The lead is location-specific source wording. It is shown as source
            # context, not a made-up series of walking or teleport instructions.
            sentences=re.split(r'(?<=[.!?])\s+',summary)
            approach=[s for s in sentences if re.search(r'entrance|access|located|found|north|south|east|west|trapdoor|stair|speak|travel|boat|bridge|climb',s,re.I)][:2] or [sentences[0]]
        record=dict(name=title,source=dict(title=page['title'],url='https://oldschool.runescape.wiki/w/'+quote(page['title'].replace(' ','_'),safe='/:'),revision=revision['revid'],timestamp=revision['timestamp']),
                    summary=summary[:1500],transportNotes=notes,travel=approach,**rule)
        records[title.casefold()]=record
    return dict(schemaVersion=1,version='2026-11-22.2',reviewedOn='2026-11-22',
                scope='Listed entrances and published transport; stock, charges, quest stages and encounter supplies are separate.',
                aliases={**redirects, 'Godwars Dungeon':'God Wars Dungeon'},records=records)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'data/location-reviews.json')
    args=parser.parse_args();data=build()
    args.output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if args.output.resolve()==(ROOT/'data/location-reviews.json').resolve():
        # Presentation/source excerpts are not calculation inputs. Keep them out
        # of the worker and its persistent calculation fingerprint.
        access=dict(schemaVersion=data['schemaVersion'],version=data['version'],aliases=data['aliases'],records={k:{field:value for field,value in r.items() if field not in ['summary','transportNotes','travel','caveats']} for k,r in data['records'].items()})
        (ROOT/'data/location-access-reviews.json').write_text(json.dumps(access,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        with (ROOT/'docs/reference/location-route-audit.csv').open('w',encoding='utf-8',newline='') as stream:
            writer=csv.writer(stream);writer.writerow(['Location','Reviewed scope','Quest','Skills','Remaining method check','Source','Revision'])
            for r in data['records'].values():writer.writerow([r['name'],data['scope'],r.get('quest',''),json.dumps(r.get('skills',{})),r.get('confirmation',''),r['source']['url'],r['source']['revision']])
    print(f'Reviewed {len(data["records"])} canonical locations; live requests: 0')
