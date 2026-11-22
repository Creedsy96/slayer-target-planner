import type {Profile} from '../domain/types';
import {TELEPORTS,teleportState} from '../state/travel';
import {questState} from '../rules/access';

export interface TravelRoute {name:string;steps:string[];available:boolean;reason:string;methods:string[];rank:number;source:string}
interface Rule {match:RegExp;methods:string[];name:string;steps:string[];rank:number;quest?:string;magic?:number}
const rules:Rule[]=[];
function add(match:RegExp,methods:string[],name:string,steps:string[],rank=10,quest?:string,magic?:number):void{rules.push({match,methods,name,steps,rank,quest,magic});}
add(/Kalphite Cave/i,['desert-amulet'],'Desert amulet 4',['Use the Kalphite Cave teleport','Enter the task-only cave'],1);
add(/Kalphite Cave/i,['fairy-rings'],'Fairy ring BIQ to the cave',['Fairy ring BIQ','Run north-east to the Kalphite Cave'],5);
add(/Ancient Cavern/i,['fairy-rings','fairy-bjq'],'Fairy ring BJQ',['Fairy ring BJQ','Enter the target chamber'],1);
add(/Grimstone/i,['fairy-rings','fairy-dlp'],'Fairy ring DLP',['Fairy ring DLP','Walk to Grimstone Dungeon'],1);
add(/Dark Altar|Arceuus.*Altar/i,['fairy-rings','fairy-cis'],'Fairy ring CIS',['Fairy ring CIS','Walk to the Dark Altar'],1);
add(/Kalphite Cave/i,['glory'],'Glory to Al Kharid',['Teleport to Al Kharid','Pass Shantay','Run east to the task-only Kalphite Cave'],8);
add(/Kalphite Lair/i,['fairy-rings'],'Fairy ring BIQ',['Fairy ring BIQ','Run north-west to the lair entrance','Bring ropes if the entrance is not unlocked'],2);
add(/Kalphite Lair|Kalphite Cave/i,[],'Walk from Shantay Pass',['Al Kharid / Shantay Pass','Cross into the desert','Follow the named cave or lair entrance'],30);
add(/Jormungand|Island of Stone|Isle of Stone|Fremennik Slayer Dungeon|Waterbirth/i,['lyre-infinite'],'Unlimited lyre to Rellekka',['Teleport to Rellekka','Continue to the named dungeon or boat'],2);
add(/Jormungand|Island of Stone|Isle of Stone|Fremennik Slayer Dungeon|Waterbirth/i,['lyre'],'Charged lyre to Rellekka',['Teleport to Rellekka','Continue to the named dungeon or boat'],3);
add(/Jormungand|Island of Stone|Isle of Stone/i,[],'Rellekka docks and Haskell',['Reach Rellekka','Take Haskell’s boat','Enter Jormungand’s Prison'],25,'The Fremennik Exiles');
add(/Fremennik Slayer Dungeon/i,['fairy-rings'],'Fairy ring AJR',['Fairy ring AJR','Walk to the nearby dungeon entrance'],1);
for(const [match,name]of [[/Fremennik Slayer Dungeon/i,'Fremennik Slayer Dungeon'],[/Slayer Tower/i,'Slayer Tower'],[/Stronghold Slayer (?:Cave|Dungeon)/i,'Stronghold Slayer Cave'],[/Mourner Tunnels/i,'Dark beasts']] as [RegExp,string][]){
 add(match,['slayer-eternal'],'Eternal Slayer ring: '+name,['Ring destination: '+name,'Enter the task room'],1);
 add(match,['slayer-ring'],'Slayer ring: '+name,['Ring destination: '+name,'Enter the task room'],2);
}
add(/Stronghold Slayer|Crash Site Cavern/i,['seed-pod'],'Royal seed pod to the Grand Tree',['Grand Tree teleport','Run to the named cave entrance'],1);
add(/Stronghold Slayer|Crash Site Cavern/i,['spirit-trees'],'Spirit tree to the Gnome Stronghold',['Spirit tree network','Tree Gnome Stronghold','Run to the cave'],6);
add(/Iorwerth|Prifddinas/i,['eternal-crystal'],'Eternal crystal to Prifddinas',['Prifddinas centre','Iorwerth district','Dungeon entrance'],1,'Song of the Elves');
add(/Iorwerth|Prifddinas/i,['crystal'],'Charged crystal to Prifddinas',['Recharge the crystal seed if needed','Prifddinas centre','Iorwerth district entrance'],2,'Song of the Elves');
add(/Iorwerth|Prifddinas/i,['spirit-trees'],'Spirit tree to Prifddinas',['Spirit tree to Prifddinas','Walk to the Iorwerth district'],8,'Song of the Elves');
add(/Catacombs of Kourend/i,['xeric','xeric-heart'],'Xeric’s Heart',['Xeric’s Heart to Kourend Castle','Enter the statue','Run to the monster chamber'],1);
add(/Catacombs of Kourend/i,['mounted-xeric','xeric-heart'],'Mounted talisman: Xeric’s Heart',['Visit your POH','Xeric’s Heart','Enter the castle statue'],2);
add(/Catacombs of Kourend/i,['kourend'],'Kourend Castle tablet',['Teleport to Kourend Castle','Enter the statue','Run to the monster chamber'],3);
add(/Cerberus/i,['key-master'],'Key master teleport',['Use a key master teleport','Enter the matching Cerberus lair'],1);
add(/Taverley Dungeon|Cerberus/i,['falador'],'Falador tablet',['Teleport to Falador','Run to Taverley Dungeon','Use your unlocked shortcut or dusty-key route'],12);
add(/Kraken Cove/i,['fairy-rings'],'Fairy ring AKQ',['Fairy ring AKQ','Run west to Kraken Cove'],2);
add(/Kraken Cove/i,['piscatoris'],'Piscatoris scroll',['Use a Piscatoris teleport','Run south to the cove'],5);
add(/Karuulm|Mount Karuulm/i,['fairy-rings'],'Fairy ring CIR',['Fairy ring CIR','Run north-west to Mount Karuulm','Enter the dungeon with hazard protection'],5);
add(/Lithkren/i,['digsite','digsite-lithkren'],'Digsite pendant: Lithkren',['Lithkren pendant destination','Enter the post-quest vault'],1,'Dragon Slayer II');
add(/Myths|Corsair Cove.*Myths/i,['mythical-cape'],'Mythical cape',['Teleport to the Myths’ Guild','Enter the basement dragon section'],1,'Dragon Slayer II');
add(/Brimhaven/i,[],'Boat or charter to Brimhaven',['Travel by boat/charter to Brimhaven','Walk south to the dungeon','Bring the entrance fee and an axe'],25);
add(/Chasm of Fire/i,['fairy-rings'],'Fairy ring DJR',['Fairy ring DJR','Walk north to the Chasm of Fire'],2);
add(/Darkmeyer|Meiyerditch Laboratories/i,['drakan'],'Drakan’s medallion',['Teleport to Darkmeyer','Follow the unlocked laboratory or Vyrewatch route'],2,'Sins of the Father');
add(/Canifis|Slayer Tower|Morytania Spider Cave/i,['salve'],'Salve graveyard tablet',['Salve graveyard teleport','Walk to Canifis or your unlocked Morytania route'],10);
add(/Slayer Tower|Canifis/i,['fairy-rings'],'Fairy ring CKS',['Fairy ring CKS','Walk to Canifis or the Slayer Tower'],7);
add(/Smoke Devil Dungeon/i,['dueling'],'Ring of dueling to Castle Wars',['Castle Wars teleport','Run south-east to the Smoke Devil Dungeon'],3);
add(/Smoke Dungeon/i,['nardah'],'Nardah scroll and desert route',['Nardah teleport','Travel north-west towards Pollnivneach','Enter the Smoke Dungeon well with protection'],15);
add(/Asgarnian Ice Dungeon|Branda and Eldric/i,['fairy-rings'],'Fairy ring AIQ',['Fairy ring AIQ','Enter the dungeon trapdoor','Use the appropriate monster wing'],3);
add(/Ancient Guthixian Temple/i,['guthixian'],'Guthixian temple teleport',['Use a Guthixian temple teleport','Enter the unlocked demon chamber'],1,'While Guthix Sleeps');
add(/Lizardman|Molch|Shaman Caves/i,['xeric'],'Xeric’s Lookout',['Xeric’s Lookout','Run to the canyon, settlement or Molch entrance','Enter the correct shaman room with protection'],4);
add(/Lizardman|Molch|Shaman Caves/i,['fairy-rings'],'Fairy ring DJR and Shayzien route',['Fairy ring DJR','Travel to the named Shayzien/Molch location'],12);
add(/Wyvern Cave|Fossil Island|Mushroom Forest|Ammonite/i,['digsite','digsite-island'],'Digsite pendant: Fossil Island',['House on the Hill destination','Use unlocked mushroom routes or walk','Enter the creature’s section'],2,'Bone Voyage');
add(/Wyvern Cave|Fossil Island|Ammonite/i,[],'Digsite boat to Fossil Island',['Reach the Digsite','Take the Fossil Island boat','Walk to the creature’s section'],25,'Bone Voyage');
add(/Lighthouse/i,['fairy-rings'],'Fairy ring ALP',['Fairy ring ALP','Enter the Lighthouse basement'],2);
add(/Lighthouse/i,['games'],'Games necklace to Barbarian Outpost',['Barbarian Outpost teleport','Cross the northern route to the Lighthouse'],8);
add(/Mos Le.Harmless/i,['mos-le-harmless'],'Mos le’harmless scroll',['Use the teleport scroll','Run to the cave with a light source and protection'],2,'Cabin Fever');
add(/Neypotzli|Cam Torum/i,['moth'],'Calcified moth to Cam Torum',['Use a calcified moth','Enter Cam Torum and follow the Neypotzli route'],2);
add(/Lumbridge Swamp Caves/i,['lumbridge'],'Lumbridge tablet',['Lumbridge teleport','Walk to the swamp cave entrance','Bring a safe light source'],5);
add(/Wilderness Slayer Cave|Revenant|Lava Maze/i,['dueling'],'Ferox Enclave and Wilderness approach',['Teleport to Ferox Enclave','Enter the Wilderness deliberately','Follow the route to the correct cave'],15);

export function locationTravel(name:string,p:Profile,fallback:string[],sourcePage=name):TravelRoute[]{
 const matched=rules.filter(r=>r.match.test(name));
 const result=matched.map(rule=>{
  const states=rule.methods.map(id=>teleportState(p,TELEPORTS.find(t=>t.id===id)!));
  const gate=rule.quest&&questState(p,rule.quest)!==2?'Requires '+rule.quest+'.':rule.magic&&(p.levels.magic??0)<rule.magic?'Requires '+rule.magic+' Magic.':'';
  const available=!gate&&states.every(s=>s.enabled);
  return {name:rule.name,steps:rule.steps,methods:rule.methods,rank:rule.rank,available,reason:gate||states.filter(s=>!s.enabled).map(s=>s.reason).join(' '),source:'https://oldschool.runescape.wiki/w/'+encodeURIComponent((TELEPORTS.find(t=>t.id===rule.methods[0])?.source||sourcePage).replaceAll(' ','_'))};
 });
 if(!result.some(r=>r.methods.length===0))result.push({name:'Ordinary approach',steps:fallback,methods:[],rank:40,available:true,reason:'Follow the entrance route; fees, tools and local restrictions still apply.',source:'https://oldschool.runescape.wiki/w/'+encodeURIComponent(sourcePage.replaceAll(' ','_'))});
 return result.sort((a,b)=>Number(b.available)-Number(a.available)||a.rank-b.rank||a.name.localeCompare(b.name));
}
