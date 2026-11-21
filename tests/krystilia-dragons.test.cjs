// These fixtures exercise recorded equipment/manual timing rather than the all-gear preset.
function ownedScenario(data){const p=c.maxedProfile(data);p.assumeAllGear=false;p.combat.enabled=false;return p;}
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue,m=d.masters.find(m=>m.id==='krystilia');
function profile(variant='cerberus'){
  const p=ownedScenario(d);p.goal.targets=[{assignmentId:'hellhounds',variantId:variant,priority:1}];return p;
}

test('Krystilia Cerberus diagnostics do not invent a default Black dragons completion problem',()=>{
  const p=profile(),plan=c.evaluate(d,m,p,[]),row=plan.rows.find(r=>r.id==='black dragons');
  assert.match(plan.reason,/outside the Wilderness/);
  assert.equal(row.reason,'');assert.equal(row.methodReason,'');assert.equal(row.variant.id,'black-dragon');
  const issues=c.explainPlanIssues(d,plan,p);
  assert.ok(issues.some(i=>i.assignmentId==='hellhounds'&&i.detail.includes('outside the Wilderness')));
  assert.ok(!issues.some(i=>i.assignmentId==='black dragons'));
});

test('ordinary hellhounds remain calculable with Black dragons in the Wilderness offer pool',()=>{
  const p=profile('hellhound'),plan=c.evaluate(d,m,p,[]);
  assert.equal(plan.reason,'');assert.ok(plan.chance>0);
  const black=plan.rows.find(r=>r.id==='black dragons');assert.equal(black.weight,4);assert.ok(black.probability>0);
});

test('regular and Wilderness Cave black dragons retain their sourced HP and valid master mapping',()=>{
  const regular=d.variants.find(v=>v.id==='black-dragon'),cave=d.variants.find(v=>v.id==='black-dragon-wilderness-slayer-cave');
  assert.equal(regular.hp,190);assert.equal(cave.hp,250);
  for(const v of [regular,cave])assert.equal(c.variantEligibility(v,profile(),m,'black dragons').eligible,true);
  for(const id of ['baby-black-dragon','king-black-dragon','brutal-black-dragon','cerberus'])assert.equal(c.variantEligibility(d.variants.find(v=>v.id===id),profile(),m).eligible,false,id);
});

test('explicit non-Wilderness locations cannot become valid by choosing the regular dragon',()=>{
  const p=profile('hellhound');
  p.methods['black dragons']={...c.defaultMethod(d,p,'black dragons'),variantId:'black-dragon',location:'Taverley Dungeon'};
  assert.match(c.prepareRows(d,m,p).find(r=>r.id==='black dragons').methodReason,/Lava Maze Dungeon/);
  p.methods['black dragons'].location='Lava Maze Dungeon';
  assert.equal(c.prepareRows(d,m,p).find(r=>r.id==='black dragons').methodReason,'');
  p.methods['black dragons'].variantId='black-dragon-wilderness-slayer-cave';
  assert.match(c.prepareRows(d,m,p).find(r=>r.id==='black dragons').methodReason,/Wilderness Slayer Cave/);
});

test('explicit incompatible saved methods are preserved and labelled as non-target completion issues',()=>{
  const p=profile();p.methods['black dragons']=c.defaultMethod(d,p,'black dragons');
  const original=JSON.stringify(p),plan=c.evaluate(d,m,p,[]),issues=c.explainPlanIssues(d,plan,p);
  assert.equal(JSON.stringify(p),original);
  const target=issues.findIndex(i=>i.assignmentId==='hellhounds'),other=issues.findIndex(i=>i.assignmentId==='black dragons');
  assert.ok(target>=0&&other>target);assert.match(issues[other].title,/Non-target method/);
  assert.match(issues[other].detail,/assignment can still be offered/);assert.equal(issues[other].route,'methods');
});

test('variant additions reproduce from a pinned source without changing the base catalogue',()=>{
  const output='.desktop-build/variant-additions-check.json';cp.execFileSync('python',['tools/build_variant_additions.py','--output',output]);
  assert.deepEqual(JSON.parse(fs.readFileSync(output,'utf8')),require('../data/variant-additions.json'));
  const base=require('../data/catalogue.json');assert.equal(d.variants.length,base.variants.length+c.VARIANT_ADDITIONS.length);
  assert.deepEqual(d.masters,base.masters.map(master=>['mortimer','konar'].includes(master.id)?d.masters.find(m=>m.id===master.id):master));
});

test('fully skipped non-target assignments do not need a completion-method issue',()=>{
  const p=profile();p.strategy='funded';p.methods['black dragons']=c.defaultMethod(d,p,'black dragons');
  const plan=c.evaluate(d,m,p,[]),row=plan.rows.find(r=>r.id==='black dragons');
  assert.equal(row.skip,1);assert.match(row.methodReason,/outside the Wilderness/);
  assert.ok(!c.explainPlanIssues(d,plan,p).some(i=>i.assignmentId==='black dragons'));
});
