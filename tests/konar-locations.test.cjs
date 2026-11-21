const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue,m=d.masters.find(m=>m.id==='konar');
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function profile(assignment='basilisks',variant='basilisk-knight'){
 const p=c.maxedProfile(d);p.assumeAllGear=false;p.combat.enabled=false;p.unlocks.basilocked=1;
 p.goal.targets=[{assignmentId:assignment,variantId:variant,priority:1}];p.blockLimit=0;p.requestMinutes=1;p.strategy='none';
 return p;
}
function small(){
 const p=profile(),entry={...m.tasks.find(e=>e.id==='basilisks'),minimum:10,maximum:10,extendedMin:20,extendedMax:20};
 const master={...m,tasks:[entry]},data={...d,masters:d.masters.map(m=>m.id==='konar'?master:m)};
 for(const [id,rate]of [['basilisk-knight',10],['basilisk',4]])p.methods['basilisks::'+id]={...c.defaultMethod(d,p,'basilisks'),variantId:id,timing:'task-minutes',rate};
 p.simulation.trials=10000;p.simulation.horizonOffers=1000;p.simulation.sessionHours=100;p.points=1e9;
 return {p,master,data};
}
test('offline audit reproduces all 39 assignments and every fixed area has a completion creature',()=>{
 const before=fs.readFileSync('data/konar-locations.json','utf8');cp.execFileSync('python',['tools/build_konar_locations.py']);
 assert.equal(fs.readFileSync('data/konar-locations.json','utf8'),before);
 assert.deepEqual(Object.keys(c.KONAR_AUDIT).sort(),m.tasks.map(e=>e.id).sort());assert.equal(m.tasks.length,39);
 assert.equal(c.KONAR_AUDIT.boss.mode,'specific-boss');
 for(const [id,audit]of Object.entries(c.KONAR_AUDIT))for(const location of audit.locations)assert.ok(audit.variants.some(v=>v.locations.includes(location)),id+': '+location);
 assert.ok(c.KONAR_AUDIT.trolls.locations.includes('South of Mount Quidamortem'));
});
test('all reviewed variant fractions use the full location pool, including areas with only alternatives',()=>{
 const p=profile();
 for(const entry of m.tasks){
  const audit=c.KONAR_AUDIT[entry.id];if(audit.mode!=='uniform')continue;
  for(const reviewed of audit.variants){
   const v=d.variants.find(v=>v.id===reviewed.id),method={...c.defaultMethod(d,p,entry.id),variantId:v.id};
   close(c.locationFraction(entry,v,method,m,p).fraction,reviewed.locations.length/audit.locations.length);
   assert.equal(c.variantEligibility(v,p,m,entry.id).eligible,reviewed.locations.length>0,entry.id+'/'+v.id);
  }
 }
});
test('representative split cases have explicit audited fractions instead of an assumed 100%',()=>{
 const p=profile();
 for(const [id,variant,n,total]of [
  ['basilisks','basilisk-knight',1,2],['basilisks','basilisk',2,2],['hellhounds','cerberus',1,5],
  ['aberrant spectres','deviant-spectre',1,3],['jellies','chilled-jelly',1,3],['blue dragons','blue-dragon',5,6],
  ['black dragons','baby-black-dragon',3,4],['metal dragons','rune-dragon',1,4],['metal dragons','iron-dragon',3,4],
  ['lesser nagua','frost-nagua',1,3],['lesser nagua','earthen-nagua',1,3],['dagannoth','dagannoth-waterbirth-island',1,4],
  ['trolls','ice-troll-runt',1,6],['vampyres','vyrewatch-sentinel',1,4],['wyrms','wyrmling',2,4]
 ]){
  p.goal.targets=[{assignmentId:id,variantId:variant,priority:1}];
  close(c.prepareRows(d,{...m,tasks:m.tasks.filter(e=>e.id===id)},p)[0].targetFraction,n/total);
 }
});
test('location names and chambers are matched by reviewed aliases, including Isle of Stone',()=>{
 const {p,master,data}=small();p.methods['basilisks::basilisk-knight'].location='Isle of Stone';
 const plan=c.evaluate(data,master,p,[]);assert.equal(plan.reason,'');close(plan.chance,.5);
 assert.equal(c.sameKonarLocation('Waterbirth Island Dungeon (Entrance Hall)','Waterbirth Island'),true);
 assert.equal(c.sameKonarLocation("Corsair Cove Dungeon/Myths' Guild (basement)","Myths' Guild Dungeon"),true);
 assert.equal(c.sameKonarLocation('Wilderness God Wars Dungeon','God Wars Dungeon'),false);
});
test('multiple acceptable variants form a location union without double-counting the assignment',()=>{
 const {p,master,data}=small();p.goal.targets.push({assignmentId:'basilisks',variantId:'basilisk',priority:0});
 const plan=c.evaluate(data,master,p,[]);close(plan.chance,1);assert.equal(plan.rows.length,1);
 assert.deepEqual(plan.rows[0].locationOutcomes.map(o=>o.row.variant.id),['basilisk','basilisk-knight']);
 close(plan.rows[0].locationOutcomes.reduce((s,o)=>s+o.row.probability,0),1);
});
test('locked assignment locations change the denominator while unknown access stays conditional',()=>{
 const {p,master,data}=small();p.restrictBasicAccess=true;p.access['location:Fremennik Slayer Dungeon']=0;
 let plan=c.evaluate(data,master,p,[]);close(plan.chance,1);assert.deepEqual(plan.rows[0].locationExcluded,['Fremennik Slayer Dungeon']);
 delete p.access['location:Fremennik Slayer Dungeon'];p.access["location:Jormungand's Prison"]=null;p.quests['The Fremennik Exiles']=null;delete p.questImport;
 plan=c.evaluate(data,master,p,[]);close(plan.rows[0].targetFraction,.5);assert.equal(plan.chance,null);assert.match(plan.reason,/Incomplete/);
});
test('brutal-dragon assignment gates exclude impossible locations, not the whole metal/colour task',()=>{
 const p=profile('black dragons','black-dragon');p.levels.combat=99;p.levels.slayer=76;
 const entry=m.tasks.find(e=>e.id==='black dragons'),v=d.variants.find(v=>v.id==='black-dragon');
 close(c.locationFraction(entry,v,{...c.defaultMethod(d,p,entry.id),variantId:v.id},m,p).fraction,1);
 assert.deepEqual(c.konarPool(entry,p).excluded,['Catacombs of Kourend']);
});
test('waiting time, target KPH and completion rewards include the real wrong-location method',()=>{
 const {p,master,data}=small(),plan=c.evaluate(data,master,p,[]),row=plan.rows[0];
 assert.equal(plan.reason,'');close(plan.chance,.5);close(plan.hours*60,6);
 close(plan.targetKillsPerHour,5*60/8);close(plan.pointsEarned,c.basePoints(master,p)*1.775*60/8);
 assert.deepEqual(row.locationOutcomes.map(o=>[o.location,o.row.variant.id,o.row.minutes,o.row.isTarget]),[
  ['Fremennik Slayer Dungeon','basilisk',4,false],["Jormungand's Prison",'basilisk-knight',10,true]
 ]);
 const sim=c.simulate(data,plan,p);assert.equal(sim.unresolved,0);close(sim.meanHours*60,6,.2);
});
test('funded skips apply only to incompatible rolls and match simulation',()=>{
 const {p,master,data}=small();p.strategy='funded';
 const plan=c.evaluate(data,master,p,[]);close(plan.hours*60,2.5);close(plan.skipRate,.5);close(plan.targetKillsPerHour,5*60/6.25);
 assert.deepEqual(plan.rows[0].locationOutcomes.map(o=>o.row.skip),[1,0]);
 const sim=c.simulate(data,plan,p);assert.equal(sim.unresolved,0);close(sim.meanHours*60,2.5,.1);
 p.preferences.basilisks='protect';close(c.evaluate(data,master,p,[]).hours*60,6);
});
test('wrong-location Turael resets use replacement time rather than knight combat',()=>{
 const {p,master,data}=small();p.strategy='reset-turael';
 const plan=c.evaluate(data,master,p,[]);close(plan.reset.directChance,.5);close(plan.reset.rate,.5);
 p.methods['basilisks::basilisk'].rate=10000;close(c.evaluate(data,master,p,[]).hours,plan.hours);
 const sim=c.simulate(data,plan,p);assert.equal(sim.unresolved,0);close(sim.meanHours,plan.hours,.015);
});
test('boosting carries the location split through milestone time, KPH and point rewards',()=>{
 const {p,master,data}=small();p.strategy='boost-turael';p.streaks.normal=0;
 const original=data.masters.find(m=>m.id==='turael'),entry=original.tasks[0],filler={...original,tasks:[entry]};
 data.masters=data.masters.map(m=>m.id==='turael'?filler:m);
 p.methods[entry.id]={...c.defaultMethod(data,p,entry.id),timing:'task-minutes',rate:2};
 const plan=c.evaluate(data,master,p,[]);
 assert.equal(plan.reason,'');close(plan.boost.mainChance,.5);close(plan.hours*60,60);
 close(plan.targetKillsPerHour,300/35);
 const sim=c.simulate(data,plan,p);assert.equal(sim.unresolved,0);close(sim.meanHours*60,60,1.5);
});
test('extension comparison retimes every location and uses the full location cycle',()=>{
 const {p,master,data}=small();
 for(const v of ['basilisk','basilisk-knight'])p.methods['basilisks::'+v]={...p.methods['basilisks::'+v],timing:'kills-hour',rate:60,delay:0};
 const plan=c.evaluate(data,master,p,[]),comparison=c.compareTargetExtensions(data,plan,p)[0];
 close(comparison.normalRate,5*60/11);close(comparison.extendedRate,10*60/21);
 assert.ok(comparison.extendedRate>comparison.normalRate);
});
test('custom probabilities stay explicit and cannot create compatibility outside the audited pool',()=>{
 const {p,master,data}=small();p.assumeUnknown=true;p.methods['basilisks::basilisk-knight'].locationChance=.2;
 let plan=c.evaluate(data,master,p,[]);close(plan.chance,.2);assert.ok(plan.unknown.includes('Custom Konar location probability'));
 p.goal.targets=[{assignmentId:'black demons',variantId:'demonic-gorilla',priority:1}];
 p.methods['black demons::demonic-gorilla']={...c.defaultMethod(d,p,'black demons'),variantId:'demonic-gorilla',locationChance:1};
 plan=c.evaluate(d,m,p,[]);assert.equal(plan.chance,null);assert.equal(plan.rows.find(r=>r.id==='black demons').targetFraction,0);
});
test('non-target tasks use a legal method at each location; no global fast variant leaks across areas',()=>{
 const p=profile('hellhounds','hellhound'),plan=c.evaluate(d,m,p,[]);
 assert.equal(plan.reason,'');
 for(const parent of plan.rows.filter(r=>!r.reason))for(const o of parent.locationOutcomes||[]){
  assert.equal(o.row.methodReason,'',parent.id+'/'+o.location);
  assert.ok(c.konarVariantLocations(parent.entry,o.row.variant).some(l=>c.sameKonarLocation(l,o.location)),parent.id+'/'+o.location);
 }
 const dragons=plan.rows.find(r=>r.id==='metal dragons').locationOutcomes;
 assert.equal(dragons.find(o=>o.location==='Lithkren Vault').row.variant.id,'adamant-dragon');
});
test('location-specific timing distinguishes the Dust devil barrage pod from the Smoke Dungeon',()=>{
 const p=profile('dust devils','dust-devil');p.methods['dust devils::dust-devil']={...c.defaultMethod(d,p,'dust devils'),variantId:'dust-devil'};
 const row=c.prepareRows(d,{...m,tasks:m.tasks.filter(e=>e.id==='dust devils')},p)[0];
 assert.ok(row.locationOutcomes.every(o=>c.sameKonarLocation(o.row.method.location,o.location)));
 assert.equal(new Set(row.locationOutcomes.map(o=>o.row.method.location)).size,2);
});
test('Konar location explanation names matching and failing areas with their actual actions',()=>{
 const {buildSync}=require('esbuild'),code=buildSync({entryPoints:['src/ui/konar-locations.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
 const mod={exports:{}};new Function('module','exports',code)(mod,mod.exports);
 const {p,master,data}=small();p.strategy='funded';const plan=c.evaluate(data,master,p,[]),html=mod.exports.renderKonarLocations(data,plan,p);
 assert.match(html,/1\/2 compatible locations · 50\.0%/);assert.match(html,/Fremennik Slayer Dungeon/);assert.match(html,/Skip/);assert.match(html,/✓ Target/);
 assert.equal(mod.exports.renderKonarLocations(data,{...plan,master:{...master,id:'nieve'}},p),'');
});
