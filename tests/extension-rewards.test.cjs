const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue,metadata=require('../data/slayer-extensions.json');
function ui(file){const code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};new Function('module','exports',code)(m,m.exports);return m.exports;}
const {renderExtensionRewards,extensionPurchaseState}=ui('src/ui/extension-rewards.ts');
const {renderCharacterSetup}=ui('src/ui/character-setup.ts');
test('the offline extension shop metadata reproduces every supported assignment once in source order',()=>{
 const output='.desktop-build/slayer-extensions-check.json';cp.execFileSync('python',['tools/build_slayer_extensions.py','--output',output]);
 assert.deepEqual(JSON.parse(fs.readFileSync(output,'utf8')),metadata);
 const supported=[...new Set(d.masters.flatMap(m=>m.tasks.filter(e=>e.extendedMin>0&&e.extendedMax>=e.extendedMin).map(e=>e.id)))];
 assert.equal(metadata.rewards.length,29);assert.deepEqual(metadata.rewards.map(r=>r.assignmentId).sort(),supported.sort());
 assert.deepEqual(metadata.rewards.slice(0,6).map(r=>r.name),['Need More Darkness','Ankou Very Much','Suq-a-nother One','Fire & Darkness','Pedal to the Metals','Spiritual Fervour']);
 assert.equal(metadata.rewards.at(-1).name,'I see Dragons');assert.equal(metadata.source.revision,require('../data/sources/slayer-rewards.json').revisions[0].revid);
 const art=require('../src/ui/creature-art.json');for(const r of metadata.rewards){assert.ok(art.entries[r.iconVariant],r.name);assert.ok(r.points>0);}
});
test('new characters and Maxed see all extension purchases off in the shared two-column reward list',()=>{
 for(const p of [c.newCharacter(d,'Fresh'),c.maxedProfile(d)]){
  const before=c.clone(p),html=renderExtensionRewards(d,p);
  assert.equal((html.match(/data-extension-toggle=/g)||[]).length,29);assert.equal((html.match(/aria-pressed="false"/g)||[]).length,29);
  assert.match(html,/class="fact-grid reward-grid"/);assert.match(html,/Basilonger/);assert.match(html,/100 points/);assert.match(html,/No Slayer points are spent here/);
  assert.equal((html.match(/class="creature-icon"/g)||[]).length,29);assert.deepEqual(p,before);
 }
});
test('the wizard rewards step lists every extension independently of the selected hunt',()=>{
 const p=c.newCharacter(d,'Setup');p.setup.step=3;p.goal.targets=[{assignmentId:'rats',variantId:'rat',priority:1}];
 const html=renderCharacterSetup(d,p,null);assert.match(html,/Purchased task unlocks/);assert.match(html,/Purchased task extensions/);
 assert.equal((html.match(/data-extension-toggle=/g)||[]).length,29);assert.match(html,/Need More Darkness/);assert.match(html,/Gryphon and on/);
});
test('recording a purchase highlights the same state in setup and account lists and updates every method',()=>{
 const p=c.newCharacter(d,'State');p.setup.step=3;p.points=500;p.unlocks.basilocked=0;
 p.methods['basilisks::basilisk']={...c.defaultMethod(d,p,'basilisks'),variantId:'basilisk',extended:false};
 p.methods['basilisks::basilisk-knight']={...c.defaultMethod(d,p,'basilisks'),variantId:'basilisk-knight',extended:false};
 c.setTaskExtension(p,'basilisks',true);
 for(const html of [renderExtensionRewards(d,p),renderCharacterSetup(d,p,null)])assert.match(html,/class="fact-card enabled" data-extension-toggle="basilisks" data-extension-enabled="false" aria-pressed="true"/);
 assert.ok(Object.values(p.methods).every(m=>m.extended));assert.equal(p.points,500);assert.equal(p.unlocks.basilocked,0);
 c.setTaskExtension(p,'basilisks',false);assert.ok(Object.values(p.methods).every(m=>!m.extended));assert.equal(extensionPurchaseState(p,'basilisks').enabled,false);
});
test('legacy method settings stay intact and request explicit assignment confirmation rather than inferred ownership',()=>{
 const p=c.newCharacter(d,'Legacy');p.methods.basilisks={...c.defaultMethod(d,p,'basilisks'),extended:true};const before=c.clone(p);
 assert.deepEqual(extensionPurchaseState(p,'basilisks'),{enabled:false,legacy:true});
 const html=renderExtensionRewards(d,p,'Basilonger');assert.match(html,/data-extension-enabled="true" aria-pressed="mixed"/);assert.match(html,/Saved methods use this extension/);assert.deepEqual(p,before);
 c.setTaskExtension(p,'basilisks',true);assert.deepEqual(extensionPurchaseState(p,'basilisks'),{enabled:true,legacy:false});
 p.extensions.basilisks=false;p.methods.basilisks.extended=true;assert.deepEqual(extensionPurchaseState(p,'basilisks'),{enabled:false,legacy:false});
});
test('account filtering accepts reward names and creature names without changing shop order or hidden purchases',()=>{
 const p=c.newCharacter(d,'Filter');c.setTaskExtension(p,'dust devils',true);const before=c.clone(p);
 for(const query of ['basilonger','BASILISKS']){const html=renderExtensionRewards(d,p,query);assert.equal((html.match(/data-extension-toggle=/g)||[]).length,1);assert.match(html,/Basilonger/);}
 assert.match(renderExtensionRewards(d,p,'missing-reward'),/No task extensions match this filter/);assert.deepEqual(p,before);
 const html=renderExtensionRewards(d,p,'black');assert.ok(html.indexOf('Fire &amp; Darkness')<html.indexOf("It&#39;s Dark in Here"));
});
test('fixed extended quantities, additive gryphon quantities and source links retain their distinct meaning',()=>{
 const p=c.newCharacter(d,'Amounts');assert.match(renderExtensionRewards(d,p,'Basilonger'),/200–250 assigned kills/);
 assert.match(renderExtensionRewards(d,p,'Gryphon and on'),/\+80 assigned kills/);assert.match(renderExtensionRewards(d,p,'Revenenenenenants'),/Record whether enabled in game/);
 assert.match(renderExtensionRewards(d,p),/Slayer_Rewards\?oldid=15373095#Extend/);
});
test('an account-list Basilonger purchase survives exports and changes the real hunt quantities and KPH',()=>{
 const p=c.maxedProfile(d);p.assumeAllGear=false;p.combat.enabled=false;p.unlocks.basilocked=1;p.strategy='none';p.blockLimit=0;
 const master=d.masters.find(m=>m.id==='nieve'),normal=c.evaluate(d,master,p,[]);
 c.setTaskExtension(p,'basilisks',true);const restored=c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0],extended=c.evaluate(d,master,restored,[]);
 assert.equal(restored.extensions.basilisks,true);assert.ok(extended.rows.find(r=>r.id==='basilisks').meanKills>normal.rows.find(r=>r.id==='basilisks').meanKills);
 assert.ok(extended.targetKillsPerHour>normal.targetKillsPerHour);assert.match(renderExtensionRewards(d,restored,'Basilonger'),/aria-pressed="true"/);
});
