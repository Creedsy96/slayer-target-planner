const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
const file=(name,value)=>({name,text:JSON.stringify(value)}),stamp={session_id:'one',account_name:'Test Player',exported_at:'2026-11-21T09:00:00Z'};
const skills=Object.fromEntries('attack strength defence hitpoints ranged magic prayer slayer agility firemaking sailing'.split(' ').map(s=>[s,{real_level:80,boosted_level:99}]));
const bundle=()=>[file('character.json',{...stamp,stats:skills}),file('bank.json',{...stamp,kind:'bank',items:[{id:4151,quantity:1},{id:995,quantity:9999}]}),file('equipment.json',{...stamp,kind:'equipment',items:[{id:1127,quantity:1}]}),file('quests.json',{...stamp,quests:[{name:'The Fremennik Exiles',state:'FINISHED'},{name:'Recipe for Disaster - Sir Amik Varze',state:'FINISHED'}]}),file('diaries.json',{...stamp,diaries:{'Lumbridge & Draynor':{elite:{complete:true}},'Kourend & Kebos':{elite:{complete:true}},'Western Provinces':{elite:{complete:false}}}})];
test('new characters start with unknown facts, no purchased rewards, zero task streaks and opt-out setup',()=>{
 const p=c.newCharacter(d,'Fresh');assert.equal(p.assumeUnknown,false);assert.equal(p.levels.slayer,null);assert.equal(p.points,null);assert.ok(Object.values(p.unlocks).every(v=>v===0));assert.deepEqual(p.streaks,{normal:0,wilderness:0,mortimer:0});assert.equal(p.setup.step,0);assert.equal(c.newCharacter(d,'Manual',false).setup,undefined);
 c.acceptSetupDefaults(d,p,'combat');assert.deepEqual(p.diaries,{lumbridge:0,kourend:0,western:0});assert.equal(p.points,null);assert.equal(c.validateProfile(d,p).setup.complete,false);
});
test('account bundles import base levels, filter gear, derive quests and preserve manual choices atomically',()=>{
 const p=c.newCharacter(d,'Test');p.bank=c.emptyBank();p.bank.manual['4151']=0;p.questPoints=200;p.points=123;p.diaries.lumbridge=0;p.unlocks.basilocked=1;p.quests['The Fremennik Exiles']=0;p.access["location:Jormungand's Prison"]=0;
 const original=c.clone(p),preview=c.parseAccountExports(d,bundle()),q=c.applyAccountExports(d,p,preview,'2026-11-21T10:00:00Z');
 assert.deepEqual(p,original);assert.equal(q.levels.attack,80);assert.equal(q.levels.combat,102);assert.equal(q.bank.snapshots.bank.items['995'],undefined);assert.equal(q.bank.manual['4151'],0);assert.equal(q.bank.snapshots.equipment.items['1127'],1);assert.equal(q.combat.enabled,true);assert.equal(q.diaries.lumbridge,0);assert.equal(q.diaries.kourend,1);assert.equal(q.diaries.western,0);assert.equal(c.questState(q,'The Fremennik Exiles'),0);assert.equal(c.resolveAccess("location:Jormungand's Prison",q).value,0);assert.equal(q.points,123);assert.equal(q.questPoints,200);assert.equal(q.unlocks.basilocked,1);assert.equal(c.questState(q,'Recipe for Disaster - Sir Amik Varze'),2);
});
test('mixed characters, mixed sessions, duplicates, unsafe objects and invalid diary facts are rejected',()=>{
 const b=bundle();b[1]=file('bank.json',{...stamp,account_name:'Other',kind:'bank',items:[]});assert.throws(()=>c.parseAccountExports(d,b),/different accounts/);
 const sessions=bundle();sessions[1]=file('bank.json',{...stamp,session_id:'two',kind:'bank',items:[]});assert.throws(()=>c.parseAccountExports(d,sessions),/different RuneLite sessions/);
 assert.throws(()=>c.parseAccountExports(d,[bundle()[0],bundle()[0]]),/one character/);assert.throws(()=>c.parseAccountExports(d,[file('character.json',null)]),/JSON export object/);
 assert.throws(()=>c.parseAccountExports(d,[{name:'diaries.json',text:'{"__proto__":{}}'}]),/Unsafe/);assert.throws(()=>c.parseAccountExports(d,[file('diaries.json',{diaries:{'Kourend & Kebos':{elite:{complete:1}}}})]),/completion flag/);
 const p=c.newCharacter(d,'Existing');p.bank=c.emptyBank();p.bank.account='Other';const before=c.clone(p);assert.throws(()=>c.applyAccountExports(d,p,c.parseAccountExports(d,bundle()),'2026-11-21'),/another character/);assert.deepEqual(p,before);
});
test('shared storage identity is independent and irrelevant exports are reviewed without granting facts',()=>{
 const b=bundle();b.push(file('group_storage.json',{...stamp,account_name:'Teammate',session_id:'shared',kind:'group_storage',items:[{id:4151,quantity:1}]}));b.push(file('combat_achievements.json',{tasks:[{complete:true}]}),file('collection_log.json',{items:[4151]}),file('seed_vault.json',{items:[]}));
 const preview=c.parseAccountExports(d,b);assert.equal(preview.containers.length,3);assert.equal(preview.account,'Test Player');assert.ok(preview.notes.some(n=>n.includes('task-mapping')));assert.ok(preview.notes.some(n=>n.includes('past discoveries')));assert.equal(preview.files.includes('combat_achievements.json'),false);
});
test('character setup progress round-trips and previous area versions upgrade without resetting overrides',()=>{
 const p=c.newCharacter(d,'Saved');p.setup.step=4;p.setup.imports=['character.json'];p.setup.tutorial='skipped';p.areaDataVersion='2026-11-19.1';p.access['location:Fossil Island']=0;const q=c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0];assert.deepEqual(q.setup,p.setup);assert.equal(q.areaDataVersion,c.AREA_VERSION);assert.equal(q.access['location:Fossil Island'],0);q.setup.step=6;assert.throws(()=>c.validateProfile(d,q),/setup progress/);
});
test('ordinary locations default open, hard gates remain explicit and restricted accounts retain overrides',()=>{
 const p=c.newCharacter(d,'Level 3');for(const k of ['Brimhaven Dungeon','Karuulm Slayer Dungeon','Kraken Cove','Smoke Devil Dungeon','Witchaven Dungeon','Death Plateau (location)'])assert.equal(c.resolveAccess('location:'+k,p).value,1,k);
 p.access['location:Witchaven Dungeon']=0;assert.equal(c.resolveAccess('location:Witchaven Dungeon',p).value,1);p.restrictBasicAccess=true;assert.equal(c.resolveAccess('location:Witchaven Dungeon',p).value,0);
 assert.equal(c.resolveAccess('location:Charred Dungeon',p).value,null);p.levels.sailing=59;assert.equal(c.resolveAccess('location:Charred Dungeon',p).value,0);p.levels.sailing=60;assert.equal(c.resolveAccess('location:Charred Dungeon',p).value,1);
 p.quests['The Fremennik Trials']=2;assert.equal(c.resolveAccess('location:Fremennik Isles',p).value,1);p.quests['Desert Treasure I']=1;assert.equal(c.resolveAccess('location:Smoke Dungeon',p).value,null);p.quests['Desert Treasure I']=2;assert.equal(c.resolveAccess('location:Smoke Dungeon',p).value,1);
 p.levels.strength=59;p.levels.agility=59;p.quests['Troll Stronghold']=2;assert.equal(c.resolveAccess('location:God Wars Dungeon',p).value,0);p.levels.strength=60;assert.equal(c.resolveAccess('location:God Wars Dungeon',p).value,1);p.quests['Troll Stronghold']=0;assert.equal(c.resolveAccess('location:God Wars Dungeon',p).value,null);
 p.levels.firemaking=35;p.quests['Barbarian Training']=1;assert.equal(c.resolveAccess('location:Ancient Cavern',p).value,null);p.quests['Dragon Slayer II']=2;assert.equal(c.resolveAccess('location:Ancient Cavern',p).value,1);
});
test('practice Waterfiends belongs to the chosen master and is skipped without changing real character state',()=>{
 const real=c.newCharacter(d,'Real'),before=c.clone(real),practice=c.practiceCharacter(d),plans=c.practicePlans(d,practice),duradel=plans.find(p=>p.master.id==='duradel');assert.equal(practice.unlocks.basilocked,1);assert.ok(duradel.chance>0);assert.equal(duradel.rows.find(r=>r.id==='waterfiends').skip,1);assert.equal(c.practicePoints(5),500);assert.equal(c.practicePoints(6),470);assert.equal(c.practicePoints(6),470);assert.deepEqual(real,before);
 c.applyPracticeHunt(real);assert.deepEqual(real.goal.targets,[{assignmentId:'basilisks',variantId:'basilisk-knight',priority:1}]);assert.equal(real.strategy,'funded');assert.equal(real.points,null);assert.equal(real.unlocks.basilocked,0);
 for(const strategy of ['none','sustainable','funded','boost-turael','boost-mazchna','reset-turael']){practice.strategy=strategy;for(const plan of c.practicePlans(d,practice))assert.ok(plan.hours===null||Number.isFinite(plan.hours)&&plan.hours>=0,strategy);}
});
test('confirmed access hides on the next view reset and can always be revealed',()=>{
 const code=buildSync({entryPoints:['src/ui/account-import.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};new Function('module','exports',code)(m,m.exports);const ui=m.exports,p=c.newCharacter(d,'Checklist'),keys=['location:Fossil Island','location:Karuulm Slayer Dungeon'];
 let html=ui.renderAreaAccess(p,keys,'');assert.match(html,/data-key="location:Fossil Island"/);assert.doesNotMatch(html,/data-key="location:Karuulm Slayer Dungeon"/);p.access['location:Fossil Island']=1;assert.match(ui.renderAreaAccess(p,keys,''),/data-key="location:Fossil Island"/);ui.resetAccessChecklist();assert.doesNotMatch(ui.renderAreaAccess(p,keys,''),/data-key="location:Fossil Island"/);assert.match(ui.renderAreaAccess(p,keys,'',true),/data-key="location:Fossil Island"/);
});
test('practice guide shows real creature preparation without a permanently pending owned-gear search',()=>{
 const code=buildSync({stdin:{contents:'export {renderFirstHunt} from "./src/ui/first-hunt"; export {guideState} from "./src/ui/creature-guide";',resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};
 new Function('module','exports','localStorage',code)(m,m.exports,{getItem:()=>null});const ui=m.exports;
 Object.assign(ui.guideState,{variantId:'basilisk-knight',assignmentId:'basilisks',formId:'default',approach:'auto',priority:'balanced',onTask:true,fastTravel:false,location:''});const p=c.practiceCharacter(d),html=ui.renderFirstHunt(d,p,c.practicePlans(d,p),7,'funded','duradel');
 assert.match(html,/Mirror shield/);assert.match(html,/Jormungand/);assert.match(html,/no owned-gear search is running/);assert.doesNotMatch(html,/Calculating equipment in a background worker/);assert.doesNotMatch(html,/data-use-style=/);
});
