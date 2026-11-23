const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
function moduleAt(file,globals={}){const m={exports:{}},code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;new Function('module','exports',...Object.keys(globals),code)(m,m.exports,...Object.values(globals));return m.exports;}
const profile=()=>{const p=c.maxedProfile(d);p.id='import-test';p.assumeAllGear=false;p.bank=c.emptyBank();p.bank.manual[c.itemForLabel('Abyssal whip').id]=1;p.combat={...c.defaultCombat(),enabled:true};p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];return p;};
const questText=rows=>JSON.stringify({quests:rows,exported_at:'2026-11-23T12:00:00Z'});

test('the Elemental amulet has only the 59 Magic equip requirement',()=>{
 const item=c.itemForLabel('Elemental amulet'),p=profile();assert.equal(item.id,34428);assert.deepEqual(c.itemRequirements(item),{magic:59});
 for(const key of Object.keys(p.levels))p.levels[key]=1;p.levels.magic=58;assert.equal(c.canEquip(item,p),false);p.levels.magic=59;assert.equal(c.canEquip(item,p),true);
});

test('hunt emblem selection updates one native hunt target and preserves unrelated hunt settings',()=>{
 const {setHuntCreature,renderHuntPicker}=moduleAt('src/ui/hunt-picker.ts'),p=profile(),before=structuredClone(p);
 const html=renderHuntPicker(d,p);assert.match(html,/data-hunt-picker="0"/);assert.match(html,/data-picker-source="hunt-emblem:0"/);assert.match(html,/data-creature-id="basilisk-knight"/);
 setHuntCreature(d,p,0,'basilisks::basilisk-knight');assert.deepEqual(p.goal.targets,[{assignmentId:'basilisks',variantId:'basilisk-knight',priority:1}]);
 const changed=structuredClone(p);changed.goal.targets=before.goal.targets;assert.deepEqual(changed,before);
 p.goal.targets.push({assignmentId:'hellhounds',variantId:'hellhound',priority:2});assert.throws(()=>setHuntCreature(d,p,0,'hellhounds::hellhound'),/different hunt assignment/);
 assert.throws(()=>setHuntCreature(d,p,0,'dogs::basilisk-knight'));
});

test('omitted imported quests are not started and Konar excludes Tonali without blocking other tasks',()=>{
 const p=profile();p.combat.enabled=false;delete p.quests['The Final Dawn'];
 const q=c.applyQuestImport(d,p,c.parseQuestImport(d,questText([{name:'Bone Voyage',state:'FINISHED'}])),true,'2026-11-23');
 assert.equal(c.questState(q,'The Final Dawn'),0);assert.equal(c.resolveAccess('location:Tonali Cavern',q).value,0);
 const master=d.masters.find(m=>m.id==='konar'),plan=c.evaluate(d,master,q,[]);assert.equal(plan.reason,'',plan.reason);assert.ok(plan.chance>0);
 for(const row of plan.rows)assert.ok(!row.locationOutcomes?.some(o=>/Tonali/i.test(o.location)));
 q.quests['The Final Dawn']=2;assert.equal(c.resolveAccess('location:Tonali Cavern',q).value,1);
 const {konarPool}=moduleAt('src/rules/konar-locations.ts');q.levels.combat=null;
 assert.ok(!konarPool(master.tasks.find(row=>row.id==='blue dragons'),q).locations.includes('Catacombs of Kourend'),'an unimported level cannot admit a skill-gated Konar location');
});

test('an empty valid quest snapshot means no completed quests while a missing quest file stays distinct',()=>{
 const p=c.newCharacter(d,'No quests'),q=c.applyQuestImport(d,p,c.parseQuestImport(d,questText([])),true,'2026-11-23');
 assert.equal(c.questState(p,'The Final Dawn'),null);assert.equal(c.questState(q,'The Final Dawn'),0);assert.deepEqual(c.derivedQuestPoints(q),{minimum:0,complete:true,missing:0,unmapped:[]});
 assert.notEqual(c.combatIdentity(p),c.combatIdentity(q),'changing unknown requirements to negative is a real calculation input change');
});

test('complete account import defaults unexported facts off and preserves confirmed manual facts',()=>{
 const p=c.newCharacter(d,'Import');p.quests['The Final Dawn']=2;p.diaries.kourend=1;p.unlocks.basilocked=1;
 const levels=Object.fromEntries(Object.keys(c.maxedProfile(d).levels).filter(k=>k!=='combat').map(k=>[k,{real_level:80}]));
 const preview=c.parseAccountExports(d,[{name:'character.json',text:JSON.stringify({stats:levels})},{name:'bank.json',text:JSON.stringify({kind:'bank',items:[{id:4151,quantity:1}]})},{name:'quests.json',text:questText([{name:'Bone Voyage',state:'FINISHED'}])}]);
 const q=c.applyAccountExports(d,p,preview,'2026-11-23');assert.equal(q.negativeUnknowns,true);assert.equal(q.assumeUnknown,false);assert.equal(q.diaries.western,0);assert.equal(q.diaries.kourend,1);assert.equal(q.unlocks.basilocked,1);assert.equal(q.points,0);assert.equal(c.questState(q,'The Final Dawn'),2);
 assert.equal(c.setupUnanswered(d,q).quests.length,0);assert.equal(c.setupUnanswered(d,q).areas.length,0);assert.equal(c.setupUnanswered(d,q).skills.length,0);assert.equal(c.setupUnanswered(d,q).points,false);
 assert.deepEqual(c.importProfiles(d,c.exportProfiles([q],q.id)).profiles[0],q);
});

test('unknown imported entrance facts warn, default unavailable and do not block a valid hunt',()=>{
 const p=profile();p.negativeUnknowns=true;p.combat.enabled=false;p.access['location:Ancient Cavern']=null;p.quests['Barbarian Training']=1;p.quests['Dragon Slayer II']=0;
 const access=c.resolveAccess('location:Ancient Cavern',p);assert.equal(access.value,0);assert.match(access.reason,/Unconfirmed.*assumed unavailable/);
 const plan=c.evaluate(d,d.masters.find(m=>m.id==='konar'),p,[]);assert.equal(plan.reason,'',plan.reason);assert.ok(plan.unknown.some(w=>/Unconfirmed account facts/.test(w)));
 p.access['location:Ancient Cavern']=1;assert.equal(c.resolveAccess('location:Ancient Cavern',p).value,1);
 delete p.access['variant:bryophyta'];const ui=moduleAt('src/ui/account-import.ts');ui.resetAccessChecklist();
 assert.doesNotMatch(ui.renderSpecialAccess(d,p,c.knownAccessKeys(d),'Bryophyta'),/data-key="variant:bryophyta" disabled/,'a conservative No must still let the user confirm an unimported boss-entry item');
 p.access['variant:bryophyta']=1;assert.equal(c.resolveAccess('variant:bryophyta',p).value,1);
});

const workerSource=buildSync({entryPoints:['src/worker.ts'],bundle:true,write:false,format:'iife',platform:'browser',define:{LOCATION_REVIEW_DETAILS:'false'}}).outputFiles[0].text;
function workerRun(p,kind,combatCache){const messages=[],self={postMessage:m=>messages.push(structuredClone(m))};vm.runInNewContext(workerSource,{self,structuredClone,console});self.onmessage({data:{id:1,kind,profile:p,combatCache,provisionalCombat:kind==='plans'}});assert.equal(messages.some(m=>m.kind==='error'),false,JSON.stringify(messages.find(m=>m.kind==='error')));return messages;}

test('interactive plans finish without running a cold gear search and use labelled 5 DPS',()=>{
 const p=profile(),messages=workerRun(p,'plans');assert.equal(messages.filter(m=>m.kind==='combat-cache').length,0);
 const result=messages.find(m=>m.kind==='plans');assert.ok(result);assert.equal(messages.filter(m=>m.kind==='plan-ready').length,d.masters.length);
 const row=result.plans.find(plan=>plan.master.id==='konar').rows.find(row=>row.id==='hellhounds');assert.equal(row.method.dps,5);assert.match(row.method.combatNote,/Provisional 5 DPS/);
});

test('background combat publishes priority target results, and subsequent provisional tables use them',()=>{
 const p=profile(),warm=workerRun(p,'combat-warmup'),entries=warm.filter(m=>m.kind==='combat-cache').map(m=>[m.key,m.result]);assert.ok(entries.length);assert.equal(JSON.parse(entries[0][0])[0],'hellhound');assert.ok(warm.some(m=>m.kind==='combat-warmup'));
 const plans=workerRun(p,'plans',{identity:c.combatIdentity(p),entries}),final=plans.find(m=>m.kind==='plans');assert.equal(plans.filter(m=>m.kind==='combat-cache').length,0);
 const row=final.plans.find(plan=>plan.master.id==='konar').rows.find(row=>row.id==='hellhounds');assert.ok(row.method.calculated);assert.doesNotMatch(row.method.combatNote,/Provisional 5 DPS/);assert.ok(row.method.calculated.dps>0);
});

test('provisional requests skip final-result reuse and cannot overwrite durable finished tables',async()=>{
 let loaded=0,saved=0;const workers=[],cache={available:true,load:async()=>{loaded++;return [{kind:'plans',plans:[]}];},combat:async()=>undefined,save:async()=>saved++,saveCombat:async()=>{}};
 class Worker{constructor(){workers.push(this);}postMessage(request){this.request=request;}terminate(){}}
 const {CalculationWorker}=moduleAt('src/ui/calculation-worker.ts',{Worker,URL:{createObjectURL:()=> 'fixture',revokeObjectURL(){}}});const proxy=new CalculationWorker('source',cache,100),received=[];proxy.onmessage=e=>received.push(e.data);
 proxy.postMessage({id:2,kind:'plans',profile:profile(),provisionalCombat:true});for(let i=0;i<10&&!workers.length;i++)await new Promise(r=>setTimeout(r,5));assert.equal(loaded,0);assert.equal(workers.length,1);
 await workers[0].onmessage({data:{id:2,kind:'plans',plans:[]}});assert.equal(saved,0);assert.equal(received.at(-1).kind,'plans');proxy.terminate();
});

test('setup and tutorial retain real-character background combat independently of the practice character',()=>{
 const source=fs.readFileSync('src/ui/app.ts','utf8');const tutorial=source.slice(source.indexOf('function startTutorial()'),source.indexOf('function endTutorial('));
 assert.match(tutorial,/channel!=='combat'/);assert.match(tutorial,/state\.warmCombat\(\)/);assert.match(source,/renderShell\(\);this\.warmCombat\(\)/);assert.match(source,/Background DPS is running/);
});
