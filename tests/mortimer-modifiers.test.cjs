const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),cp=require('node:child_process');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;

test('Mortimer quantity reductions have four negative outcomes and Dark beasts increase quantity',()=>{
  const tasks=d.masters.find(m=>m.id==='mortimer').tasks;
  for(const id of ['crawling hands','cave crawlers','banshees','rockslugs','cockatrice','pyrefiends','infernal mages']){
    assert.deepEqual(c.rangeValues(tasks.find(t=>t.id===id).quantityModifier),[-30,-25,-20,-15],id);
  }
  assert.deepEqual(tasks.find(t=>t.id==='dark beasts').quantityModifier,[30,80]);
});

test('every Mortimer offer has one unlocked modifier with equal categorical probability',()=>{
  for(const [tasks,count]of [[0,2],[14,2],[15,3],[24,3],[25,4],[39,4],[40,5],[50,5]]){
    const kinds=c.modifierKinds(tasks);assert.equal(kinds.length,count);
    for(let i=0;i<count;i++){
      const draws=[(i+.5)/count,0],roll=c.rollMortimer('crawling hands',tasks,()=>draws.shift());
      assert.equal(roll.kind,kinds[i]);assert.notEqual(roll.kind,'none');
    }
  }
});

test('each valid five-step value has one equal interval and all ranges include both endpoints',()=>{
  for(const task of c.MORTIMER_RULES.tasks)for(const kind of ['points','quantity','clue','superior','xp']){
    const bounds=task[kind];if(bounds===null)continue;
    const values=c.rangeValues(bounds),kinds=c.modifierKinds(50),typeIndex=kinds.indexOf(kind);
    assert.equal(values[0],bounds[0]);assert.equal(values.at(-1),bounds[1]);
    for(let j=0;j<values.length;j++){
      const draws=[(typeIndex+.5)/kinds.length,(j+.5)/values.length];
      const roll=c.rollMortimer(task.id,50,()=>draws.shift());assert.equal(roll.value,values[j]);
    }
  }
  assert.deepEqual(c.rangeValues([5,15]),[5,10,15]);
  assert.deepEqual(c.mortimerRule('venators').superior,[200,300]);
});

test('source rules cover every Mortimer task and overlay no other masters or eligibility rules',()=>{
  const raw=require('../data/catalogue.json'),expected=raw.masters.find(m=>m.id==='mortimer').tasks;
  assert.equal(c.MORTIMER_RULES.tasks.length,expected.length);
  for(const master of raw.masters)if(master.id!=='mortimer')assert.deepEqual(d.masters.find(m=>m.id===master.id),master);
  for(const entry of expected){const actual=d.masters.find(m=>m.id==='mortimer').tasks.find(t=>t.id===entry.id);assert.deepEqual(actual.requirements,entry.requirements);assert.equal(actual.weight,entry.weight);}
  assert.deepEqual(raw.masters.find(m=>m.id==='mortimer').tasks.find(t=>t.id==='crawling hands').quantityModifier,[-15,30]);
});

test('Maxed Mortimer no longer has a speculative modifier-distribution blocker',()=>{
  const p=c.maxedProfile(d);p.goal.targets=[{assignmentId:'crawling hands',variantId:d.assignments.find(a=>a.id==='crawling hands').variantIds[0],priority:1}];
  const plan=c.evaluate(d,d.masters.find(m=>m.id==='mortimer'),p,[]);
  assert.equal(plan.reason,'');assert.ok(plan.chance>0);assert.deepEqual(plan.unknown,[]);
});

test('Mortimer rules reproduce from pinned source rows without workbook fallbacks',()=>{
  const output='.desktop-build/mortimer-rules-check.json';
  cp.execFileSync('python',['tools/build_mortimer_modifiers.py','--output',output]);
  assert.deepEqual(JSON.parse(fs.readFileSync(output,'utf8')),require('../data/mortimer-modifiers.json'));
});

test('quantity modifiers are flat kill adjustments before bracelet effects, including extensions',()=>{
  const p=c.maxedProfile(d),m=d.masters.find(m=>m.id==='mortimer');
  const hands=m.tasks.find(t=>t.id==='crawling hands'),method=c.defaultMethod(d,p,hands.id);
  assert.equal(c.sampleQuantity(hands,method,()=>0,-30),5);
  assert.equal(c.sampleQuantity(hands,method,()=>.999,-15),35);
  const dark=m.tasks.find(t=>t.id==='dark beasts');
  assert.equal(c.sampleQuantity(dark,{...method,extended:true},()=>0,30),140);
  assert.equal(c.sampleQuantity(dark,{...method,extended:true},()=>.999,80),215);
});

test('manual Mortimer tasks and offers cannot simulate a missing modifier',()=>{
  const p=c.maxedProfile(d),master=d.masters.find(m=>m.id==='mortimer');
  p.goal.targets=[{assignmentId:'crawling hands',variantId:d.assignments.find(a=>a.id==='crawling hands').variantIds[0],priority:1}];
  p.current={kind:'task',masterId:master.id,assignmentId:'crawling hands',remaining:10,modifier:'none'};
  const plan=c.evaluate(d,master,p,[]);assert.throws(()=>c.simulate(d,plan,p),/Every Mortimer task has a modifier/);
  p.current.kind='offer';p.current.options=[{assignmentId:'crawling hands',modifier:'none',points:0,quantity:0,target:true}];
  assert.throws(()=>c.simulate(d,plan,p),/Every Mortimer offer has a modifier/);
});
