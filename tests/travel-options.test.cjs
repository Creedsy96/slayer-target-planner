const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
function ui(file){const code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};new Function('module','exports',code)(m,m.exports);return m.exports;}
const {renderTravelSettings}=ui('src/ui/travel.ts'),{renderCharacterSetup}=ui('src/ui/character-setup.ts');
const {locationTravel}=ui('src/guide/travel.ts');
const teleport=id=>c.TELEPORTS.find(t=>t.id===id);
const bank=items=>c.parseBankImport(JSON.stringify({kind:'bank',items:items.map(([id,quantity])=>({id,quantity}))}));
const fresh=()=>c.newCharacter(d,'Travel QA');

test('bank import preserves only allowlisted travel evidence separately from equipment and excludes placeholders',()=>{
 const parsed=c.parseBankImport(JSON.stringify({kind:'bank',items:[{id:19564,quantity:1},{id:6099,quantity:2},{id:4151,quantity:1},{id:995,quantity:999},{id:23946,quantity:0},{id:13249,quantity:5,placeholder:true}]}));
 assert.deepEqual(parsed.snapshot.items,{4151:1});assert.deepEqual(parsed.snapshot.travelItems,{19564:1,6099:2});assert.equal(parsed.snapshot.travelItems[995],undefined);
 const p=c.applyBankSnapshots(fresh(),[parsed],null,null,false),copy=c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0];assert.deepEqual(copy.bank,p.bank);
 assert.throws(()=>c.validateBank({...p.bank,snapshots:{bank:{...parsed.snapshot,travelItems:{995:1}}}}),/teleport/);
});
test('quest rewards grant reclaimable teleports while charged crystals require both the destination and stock',()=>{
 const p=fresh();p.quests['Monkey Madness II']=2;p.quests['Song of the Elves']=2;
 assert.ok(c.teleportState(p,teleport('seed-pod')).enabled);assert.equal(c.teleportState(p,teleport('crystal')).enabled,false);assert.equal(c.teleportState(p,teleport('eternal-crystal')).enabled,false);
 const q=c.applyBankSnapshots(p,[bank([[6103,1]])],null,null,false);assert.ok(c.teleportState(q,teleport('crystal')).enabled);assert.equal(c.teleportState(q,teleport('eternal-crystal')).enabled,false);
 q.quests['Song of the Elves']=0;assert.ok(c.teleportState(q,teleport('crystal')).blocked);assert.throws(()=>c.setTeleport(q,'crystal',true),/Song of the Elves/);q.quests['Song of the Elves']=1;assert.ok(c.teleportState(q,teleport('crystal')).blocked);q.quests['Fairytale II - Cure a Queen']=1;assert.equal(c.teleportState(q,teleport('fairy-rings')).blocked,false);
});
test('unlimited confirmations disappear, consumables stay visible and manual No overrides bank detection',()=>{
 const p=fresh();p.quests['Monkey Madness II']=2;let html=renderTravelSettings(p);
 assert.doesNotMatch(html,/data-teleport-toggle="seed-pod"/);assert.match(renderTravelSettings(p,true),/data-teleport-toggle="seed-pod"/);
 const q=c.applyBankSnapshots(p,[bank([[13249,10]])],null,null,false);assert.ok(c.teleportState(q,teleport('key-master')).enabled);assert.match(renderTravelSettings(q),/data-teleport-toggle="key-master"/);
 c.setTeleport(q,'key-master',false);assert.equal(c.teleportState(q,teleport('key-master')).enabled,false);delete q.travel.overrides['key-master'];assert.ok(c.teleportState(q,teleport('key-master')).enabled);
 c.setTeleport(q,'slayer-eternal',true);assert.doesNotMatch(renderTravelSettings(q),/data-teleport-toggle="slayer-eternal"/);
});
test('permanent imported evidence persists while consumed stock is replaced on the next import',()=>{
 const p=c.applyBankSnapshots(fresh(),[bank([[21268,1],[13249,10]])],null,null,false);assert.ok(c.teleportState(p,teleport('slayer-eternal')).enabled);
 const q=c.applyBankSnapshots(p,[bank([])],null,null,false);assert.ok(c.teleportState(q,teleport('slayer-eternal')).enabled);assert.equal(c.teleportState(q,teleport('key-master')).enabled,false);
 assert.ok(c.teleportState(c.importProfiles(d,c.exportProfiles([q],q.id)).profiles[0],teleport('slayer-eternal')).enabled);
});
test('group travel stock is optional and another account cannot overwrite personal travel evidence',()=>{
 const p=fresh(),preview=c.parseBankImport(JSON.stringify({kind:'group_storage',items:[{id:13249,quantity:2}]}));
 let q=c.applyBankSnapshots(p,[preview],null,null,false);assert.equal(c.teleportState(q,teleport('key-master')).enabled,false);q.bank.includeGroup=true;assert.ok(c.teleportState(q,teleport('key-master')).enabled);
 q.bank.account='One';assert.throws(()=>c.applyBankSnapshots(q,[{...bank([[13249,1]]),snapshot:{...bank([]).snapshot,account:'Two'}}],null,null,false),/different accounts/);
});
test('new travel quests survive quest imports and automatic detection respects manual quest overrides',()=>{
 const p=fresh(),preview=c.parseQuestImport(d,JSON.stringify({quests:[{name:'Tree Gnome Village',state:'FINISHED'},{name:'Monkey Madness II',state:'FINISHED'}]}));
 const q=c.applyQuestImport(d,p,preview,true,'2026-11-22');assert.ok(c.teleportState(q,teleport('spirit-trees')).enabled);assert.ok(c.teleportState(q,teleport('seed-pod')).enabled);
 q.quests['Monkey Madness II']=0;assert.equal(c.teleportState(q,teleport('seed-pod')).enabled,false);
});
test('location routes rank usable teleports first and preserve individual destination requirements',()=>{
 const p=fresh();p.quests['Song of the Elves']=2;let routes=locationTravel('Iorwerth Dungeon',p,['Walk to the entrance']);assert.equal(routes[0].name,'Ordinary approach');
 c.setTeleport(p,'eternal-crystal',true);routes=locationTravel('Iorwerth Dungeon',p,[]);assert.match(routes[0].name,/Eternal crystal/);assert.ok(routes[0].available);
 c.setTeleport(p,'xeric',true);let heart=locationTravel('Catacombs of Kourend',p,[]).find(r=>r.name==='Xeric’s Heart');assert.equal(heart.available,false);
 p.quests['Architectural Alliance']=2;heart=locationTravel('Catacombs of Kourend',p,[]).find(r=>r.name==='Xeric’s Heart');assert.ok(heart.available);
 p.quests['Song of the Elves']=0;assert.equal(locationTravel('Iorwerth Dungeon',p,[]).find(r=>/Eternal crystal/.test(r.name)).available,false);
});
test('Kalphite cards show multiple practical routes and only PvP locations carry red PvP labels',()=>{
 const p=c.maxedProfile(d),record=g.GUIDE.records['kalphite-worker'],state={...g.defaultGuideState(),variantId:record.id,assignmentId:'kalphite',formId:record.defaultForm},form=g.guideForm(record,state);
 const routes=g.rankLocations(record,form,state,p);const cave=routes.find(r=>/Kalphite Cave/.test(r.name));assert.ok(cave.travelOptions.some(r=>/Desert amulet/.test(r.name)));assert.equal(cave.cannon,true);assert.ok(cave.travelOptions.filter(r=>!r.methods.length).every(r=>r.source.endsWith('/Kalphite_Cave')));
 // Render with the same module instance so the chosen creature is retained.
 const page=ui('src/ui/creature-guide.ts');Object.assign(page.guideState,state);const html=page.renderCreatureGuide(d,p);
 assert.match(html,/Best ways to get here/);assert.doesNotMatch(html,/Non-Wilderness listing|No Wilderness PvP|PvP status unconfirmed/);assert.doesNotMatch(html,/class="badge pvp-warning"/);
 Object.assign(page.guideState,{variantId:'revenant-cyclops',assignmentId:'revenants',formId:g.GUIDE.records['revenant-cyclops'].defaultForm});assert.match(page.renderCreatureGuide(d,p),/class="badge pvp-warning"/);
});
test('the seven-step wizard places travel after access and hides known unmet area or teleport gates',()=>{
 const p=fresh();p.setup.step=4;p.quests['Song of the Elves']=0;p.quests['Sins of the Father']=0;p.quests['Monkey Madness II']=0;
 let html=renderCharacterSetup(d,p,null,true);assert.doesNotMatch(html,/data-key="location:Prifddinas"|data-key="location:Darkmeyer"/);
 p.setup.step=5;html=renderCharacterSetup(d,p,null);assert.match(html,/<h2>Travel options<\/h2>/);assert.doesNotMatch(html,/data-teleport-toggle="seed-pod"|data-teleport-toggle="crystal"/);assert.match(html,/Step 6 of 7/);
 assert.ok(!c.setupUnanswered(d,p).areas.includes('location:Prifddinas'));p.setup.step=6;assert.match(renderCharacterSetup(d,p,null),/Finish &amp;|Finish & start first hunt/);
});
test('hard quest and skill facts own access; restricted mode can deny but never grant a locked gate',()=>{
 const {accessFactFilter}=ui('src/rules/access.ts');assert.equal(accessFactFilter('location:Prifddinas'),'Song of the Elves');assert.equal(accessFactFilter('location:Charred Dungeon'),'');
 const p=fresh();p.access['location:Prifddinas']=1;p.quests['Song of the Elves']=0;assert.equal(c.resolveAccess('location:Prifddinas',p).value,0);
 p.quests['Song of the Elves']=2;p.access['location:Prifddinas']=0;assert.equal(c.resolveAccess('location:Prifddinas',p).value,1);
 p.restrictBasicAccess=true;assert.equal(c.resolveAccess('location:Prifddinas',p).value,0);c.setLocationAccess(p,'location:Prifddinas',true);assert.equal(c.resolveAccess('location:Prifddinas',p).value,1);
 p.quests['Song of the Elves']=0;assert.throws(()=>c.setLocationAccess(p,'location:Prifddinas',true),/quest or skill/);
 p.levels.sailing=59;p.access['location:Charred Dungeon']=1;assert.equal(c.resolveAccess('location:Charred Dungeon',p).value,0);p.levels.sailing=60;assert.equal(c.resolveAccess('location:Charred Dungeon',p).value,1);
 p.levels.agility=99;p.quests['Troll Stronghold']=0;assert.throws(()=>c.setLocationAccess(p,'location:Troll Stronghold (location)',true),/quest or skill/);assert.equal(accessFactFilter('location:Troll Stronghold (location)',p),'Troll Stronghold');p.quests['Troll Stronghold']=1;c.setLocationAccess(p,'location:Troll Stronghold (location)',true);assert.equal(c.resolveAccess('location:Troll Stronghold (location)',p).value,1);
});
test('old six-step setup progress migrates without losing character or account state',()=>{
 const p=fresh();p.setup={version:1,step:5,complete:false,imports:[],tutorial:'pending'};const q=c.validateProfile(d,p);assert.equal(q.setup.version,2);assert.equal(q.setup.step,5);
 p.setup.complete=true;assert.equal(c.validateProfile(d,p).setup.step,6);assert.deepEqual(c.validateProfile(d,p).bank,p.bank);
});
