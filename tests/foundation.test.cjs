const test=require('node:test');
const assert=require('node:assert/strict');
const c=require('../.desktop-build/core.cjs');
const d=c.catalogue;
const profile=()=>{const p=c.newProfile(d);p.blockLimit=1;return p;};
test('regression: beginner and Wilderness masters can use blocks',()=>{
 for(const id of ['turael','spria','krystilia','mazchna']){
 const m=d.masters.find(m=>m.id===id),p=profile();p.goal.targets=[{assignmentId:'bats',variantId:d.assignments.find(a=>a.id==='bats').variantIds[0],priority:1}];
 assert.equal(c.optimise(d,m,p,10).blocks.length,1,id);
 }
});
test('regression: assignment eligibility does not grant Basilisk Knight access',()=>{
 const m=d.masters.find(m=>m.id==='nieve'),p=profile();p.levels.slayer=40;p.quests['The Fremennik Exiles']=0;
 const row=c.prepareRows(d,m,p).find(r=>r.id==='basilisks');
 assert.equal(row.reason,'');assert.match(row.methodReason,/Slayer|Fremennik/);assert.equal(row.targetFraction,0);
 assert.equal(c.evaluate(d,m,p,[]).chance,null);
});
test('beginner lists are shared only within their group',()=>{
 assert.equal(d.masters.find(m=>m.id==='turael').group,d.masters.find(m=>m.id==='spria').group);
 assert.notEqual(d.masters.find(m=>m.id==='krystilia').group,'beginner');
});
test('zero override, quest-point thresholds and Mortimer cap',()=>{
 const p=profile(),m=d.masters[0];p.blockLimit=0;assert.equal(c.blockSlots(m,p).slots,0);
 p.blockLimit=null;p.questPoints=300;p.diaries.lumbridge=1;assert.equal(c.blockSlots(m,p).slots,7);
 assert.equal(c.blockSlots(d.masters.find(m=>m.id==='mortimer'),p).slots,2);
});
