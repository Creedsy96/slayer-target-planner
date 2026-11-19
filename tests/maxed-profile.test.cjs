const test=require('node:test');
const assert=require('node:assert/strict');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;

test('Maxed leaves Slayer rewards unpurchased and creature assignments require opting in',()=>{
  const p=c.maxedProfile(d),master=d.masters.find(m=>m.id==='nieve');
  assert.ok(Object.values(p.unlocks).every(value=>value===0));
  let row=c.prepareRows(d,master,p).find(r=>r.id==='basilisks');
  assert.match(row.reason,/Basilocked/);
  p.unlocks.basilocked=1;
  row=c.prepareRows(d,master,p).find(r=>r.id==='basilisks');
  assert.equal(row.reason,'');
});

test('previous Maxed rewards are corrected once, preserving other facts and later purchases',()=>{
  const old=c.maxedProfile(d);delete old.maxedPresetVersion;
  old.unlocks=Object.fromEntries(Object.keys(d.unlocks).map(key=>[key,1]));
  old.points=123;old.levels.slayer=95;
  const custom=c.newProfile(d);custom.unlocks.basilocked=1;
  const before=JSON.stringify(custom),legacy=JSON.stringify(old);
  const updated=c.withDefaultMaxedProfile(d,[custom,old],old.id);
  assert.notEqual(updated.profiles[1],old);assert.equal(JSON.stringify(old),legacy);
  assert.ok(Object.values(updated.profiles[1].unlocks).every(value=>value===0));
  assert.equal(updated.profiles[1].points,123);assert.equal(updated.profiles[1].levels.slayer,95);
  assert.equal(updated.activeId,old.id);assert.equal(JSON.stringify(custom),before);
  updated.profiles[1].unlocks.basilocked=1;
  const saved=c.importProfiles(d,c.exportProfiles(updated.profiles,updated.activeId));
  const again=c.withDefaultMaxedProfile(d,saved.profiles,saved.activeId);
  assert.equal(again.profiles,saved.profiles);assert.equal(again.profiles[1].unlocks.basilocked,1);
});

test('Maxed grants account access while leaving optional Slayer rewards off',()=>{
  const p=c.maxedProfile(d);
  assert.equal(p.name,'Maxed');assert.equal(p.levels.combat,126);
  for(const [skill,level]of Object.entries(p.levels))if(skill!=='combat')assert.equal(level,99,skill);
  assert.equal(p.assumeUnknown,false);
  for(const quest of c.relevantQuests(d))assert.equal(c.questState(p,quest),2,quest);
  for(const key of c.knownAccessKeys(d))assert.equal(c.resolveAccess(key,p).value,1,key);
  for(const m of d.masters){
    assert.deepEqual(c.masterEligibility(m,p),{eligible:true,unknown:[],failed:[]},m.name);
    const purchased={...p,unlocks:Object.fromEntries(Object.keys(p.unlocks).map(key=>[key,key==='stop-the-wyvern'?0:1]))};
    for(const t of m.tasks)assert.deepEqual(c.check(t.requirements,purchased),{eligible:true,unknown:[],failed:[]},m.name+'/'+t.id);
    assert.equal(c.blockSlots(m,p).slots,m.id==='mortimer'?2:7);
  }
  for(const v of d.variants)assert.deepEqual(c.check(v.requirements,p),{eligible:true,unknown:[],failed:[]},v.name);
  assert.equal(p.unlocks['stop-the-wyvern'],0);assert.equal(c.choices(p),3);
  assert.deepEqual(c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0],p);
});

test('fresh setups select Maxed; upgrades retain the selected profile and add it only once',()=>{
  const fresh=c.withDefaultMaxedProfile(d);
  assert.equal(fresh.activeId,c.MAXED_PROFILE_ID);assert.equal(fresh.profiles.length,1);
  const custom=c.newProfile(d,'My hunt'),before=JSON.stringify(custom);
  const upgraded=c.withDefaultMaxedProfile(d,[custom],custom.id);
  assert.equal(upgraded.activeId,custom.id);assert.equal(JSON.stringify(custom),before);
  const builtIn=upgraded.profiles.find(p=>p.id===c.MAXED_PROFILE_ID);
  builtIn.name='Edited Maxed';builtIn.levels.slayer=95;
  const again=c.withDefaultMaxedProfile(d,upgraded.profiles,upgraded.activeId);
  assert.equal(again.profiles.length,2);assert.equal(again.profiles[1],builtIn);
  assert.equal(again.profiles[1].levels.slayer,95);
});

test('full legacy profile lists gain Maxed without losing profiles or breaking round trips',()=>{
  const original=Array.from({length:50},(_,i)=>({...c.newProfile(d),id:'custom-'+i}));
  const seeded=c.withDefaultMaxedProfile(d,original,original[49].id);
  assert.equal(seeded.profiles.length,51);assert.equal(c.customProfileCount(seeded.profiles),50);
  assert.equal(seeded.activeId,original[49].id);
  assert.equal(c.importProfiles(d,c.exportProfiles(seeded.profiles,seeded.activeId)).profiles.length,51);
  const invalid=[...original,{...c.newProfile(d),id:'custom-51'}];
  assert.throws(()=>c.importProfiles(d,c.exportProfiles(invalid,invalid[0].id)),/50 custom/);
  assert.throws(()=>c.withDefaultMaxedProfile(d,invalid),/50 custom/);
});
