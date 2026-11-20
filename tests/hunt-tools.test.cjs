const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
const {buildSync}=require('esbuild'),vm=require('node:vm');
function profile(){const p=c.maxedProfile(d);p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];return p;}
const master=d.masters.find(m=>m.id==='nieve');
const at='2026-11-19T15:00:00.000Z';
function input(action='complete'){return {masterId:'nieve',assignmentId:'dust devils',action,modifier:'none',modifierPoints:0,kills:150,combatMinutes:30};}

test('manual paid skips agree across estimates, lookup and simulation policy, and consume the sustainable budget first',()=>{
  const p=profile();p.preferences['dust devils']='skip';
  const plan=c.evaluate(d,master,p,[]),row=plan.rows.find(r=>r.id==='dust devils');
  assert.equal(row.skip,1);assert.equal(c.paidSkipFraction(row,p),1);assert.equal(c.taskAdvice(d,plan,p,row).action,'Skip');
  assert.match(c.taskAdvice(d,plan,p,row).detail,/costs 30 points/);
  assert.ok(Math.abs(plan.skipRate-plan.rows.reduce((s,r)=>s+r.probability*c.paidSkipFraction(r,p),0))<1e-10);
  p.current={kind:'offer',masterId:'nieve',assignmentId:row.id,remaining:0,options:[{assignmentId:row.id,modifier:'none',points:0,quantity:0,target:false}]};
  assert.match(c.simulate(d,plan,p).trace[0],/Skipped Dust devils/);
  p.strategy='none';assert.equal(c.evaluate(d,master,p,[]).rows.find(r=>r.id===row.id).skip,0);
});
test('targets, keep and protect cannot be paid-skipped or reset',()=>{
  const p=profile(),plan=c.evaluate(d,master,p,[]),filler=d.masters.find(m=>m.id==='turael');p.strategy='reset-turael';
  for(const id of ['hellhounds','dust devils']){
    const row=plan.rows.find(r=>r.id===id);p.preferences[id]=id==='hellhounds'?'skip':'protect';row.skip=1;
    assert.equal(c.paidSkipFraction(row,p),0);assert.equal(c.shouldReset(master,row,p,filler),false);
  }
  p.preferences['dust devils']='keep';assert.equal(c.shouldReset(master,plan.rows.find(r=>r.id==='dust devils'),p,filler),false);
});
test('unaffordable forced skip falls back without spending future rewards',()=>{
  const p=profile();p.points=p.reserve;p.preferences['dust devils']='skip';
  p.current={kind:'offer',masterId:'nieve',assignmentId:'dust devils',remaining:0,options:[{assignmentId:'dust devils',modifier:'none',points:0,quantity:0,target:false}]};
  const result=c.simulate(d,c.evaluate(d,master,p,[]),p);assert.match(result.trace[0],/Skip unaffordable/);assert.ok(result.meanRemaining>=p.reserve);
});
test('forecast subtracts setup and reserve and block preview compares actual and proposed lists',()=>{
  const p=profile();p.points=500;p.reserve=50;p.applySetup=true;p.blocks[master.group]=['bloodveld'];
  const plan=c.evaluate(d,master,p,['dust devils']),f=c.fundingForecast(plan,p),b=c.blockPreview(d,plan,p);
  assert.equal(f.setup,90);assert.equal(f.spendable,360);assert.equal(f.affordable,12);
  assert.deepEqual(b.added,['dust devils']);assert.deepEqual(b.removed,['bloodveld']);assert.equal(b.cost,90);
  assert.ok(Number.isFinite(b.minutesSaved));p.points=null;assert.equal(c.fundingForecast(plan,p).affordable,null);
});
test('funded worker simulates the displayed block list rather than silently reoptimising',()=>{
  const p=profile();p.simulation.trials=100;p.simulation.horizonOffers=100;
  const blocks=['dust devils'],expected=c.simulate(d,c.evaluate(d,master,p,blocks),p),messages=[];
  const code=buildSync({entryPoints:['src/worker.ts'],bundle:true,write:false,format:'iife',platform:'browser'}).outputFiles[0].text;
  const self={postMessage:m=>messages.push(m)};vm.runInNewContext(code,{self,structuredClone});
  self.onmessage({data:{id:1,kind:'simulation',profile:p,masterId:master.id,blocks}});
  assert.ok(messages.some(m=>m.kind==='progress'&&m.current.includes('Gear / ')));
  const actual=messages.at(-1);assert.equal(actual.kind,'simulation');assert.equal(actual.result.meanRemaining,expected.meanRemaining);assert.equal(actual.result.meanHours,expected.meanHours);
});
test('bounded history coalesces one field with an explicit clock, branches after undo and keeps copies',()=>{
  const h=new c.History(3),v={points:1};h.record(v,'',0);v.points=2;h.record(v,'points',100);v.points=3;h.record(v,'points',200);
  assert.deepEqual(h.undo(),{points:1});assert.deepEqual(h.redo(),{points:3});h.undo();h.record({points:4},'',1000);assert.equal(h.canRedo,false);
  h.record({points:5},'',1100);h.record({points:6},'',1200);assert.deepEqual(h.undo(),{points:5});assert.deepEqual(h.undo(),{points:4});assert.equal(h.undo(),null);
});
test('hunt presets preserve account balance, facts, actual blocks and logs across round trips',()=>{
  const p=profile();p.proposed[master.group]=['dust devils'];let q=c.saveHunt(p,'Cerberus hunt','nieve','hunt-1');
  q.points=123;q.levels.combat=120;q.blocks[master.group]=['bloodveld'];q.goal.targets=[{assignmentId:'bloodveld',variantId:d.assignments.find(a=>a.id==='bloodveld').variantIds[0],priority:1}];
  const loaded=c.loadHunt(d,q,'hunt-1');assert.equal(loaded.profile.points,123);assert.equal(loaded.profile.levels.combat,120);assert.deepEqual(loaded.profile.blocks[master.group],['bloodveld']);assert.deepEqual(loaded.profile.goal,p.goal);
  const restored=c.importProfiles(d,c.exportProfiles([loaded.profile],loaded.profile.id)).profiles[0];assert.equal(restored.huntPresets[0].name,'Cerberus hunt');
  assert.equal(c.saveHunt(restored,'CERBERUS HUNT','konar','hunt-2').huntPresets.length,1);
  const bad=c.clone(restored);bad.huntPresets[0].goal.targets[0].variantId='missing';assert.throws(()=>c.validateProfile(d,bad),/variant/);
});
test('actual completions apply real milestone rewards and timing samples without mutating the input',()=>{
  const p=profile();p.streaks.normal=9;const before=p.points;
  const q=c.recordTask(d,p,input(),at,'task-1');assert.equal(p.points,before);assert.equal(q.points,before+75);assert.equal(q.streaks.normal,10);
  assert.equal(q.taskHistory.length,1);assert.deepEqual(c.timingSuggestion(q,'dust devils',q.taskHistory[0].variantId),{rate:300,samples:1,kills:150,minutes:30});
  const skipped=c.recordTask(d,q,{...input('skip'),kills:null,combatMinutes:null},at,'task-2');assert.equal(skipped.points,q.points-30);assert.equal(skipped.streaks.normal,10);assert.equal(c.timingSuggestion(skipped,'dust devils',q.taskHistory[0].variantId).samples,1);
});
test('task recording rejects reserve breaches, unknown streaks, non-finite timing and duplicate record IDs',()=>{
  const p=profile();p.points=p.reserve;assert.throws(()=>c.recordTask(d,p,input('skip'),at,'id'),/reserve/);
  p.streaks.normal=null;assert.throws(()=>c.recordTask(d,p,input(),at,'id'),/streak/);p.streaks.normal=9;
  assert.throws(()=>c.recordTask(d,p,{...input(),combatMinutes:NaN},at,'id'),/positive/);
  const q=c.recordTask(d,p,input(),at,'id');assert.throws(()=>c.recordTask(d,q,input(),at,'id'),/Invalid task record/);
});
test('recording refuses unavailable masters and fractional ledger facts before mutation',()=>{
  const p=profile();p.levels.slayer=98;p.levels.combat=3;assert.throws(()=>c.recordTask(d,p,input(),at,'id'),/master access/);
  p.levels.slayer=99;p.levels.combat=126;p.points=100.5;assert.throws(()=>c.recordTask(d,p,input(),at,'id'),/whole-number/);
});
test('reset preferences do not accrue paid-skip costs for resettable assignments',()=>{
  const p=profile();p.strategy='reset-turael';p.preferences['dust devils']='skip';
  const plan=c.evaluate(d,master,p,[]),row=plan.rows.find(r=>r.id==='dust devils');
  assert.equal(row.skip,0);assert.equal(c.taskAdvice(d,plan,p,row).action,'Reset');
  assert.ok(c.skipRecommendations(d,plan,p).resets.some(r=>r.id===row.id));
});
test('Mortimer records require an unlocked modifier and the actual valid point increment',()=>{
  const p=profile(),m=d.masters.find(m=>m.id==='mortimer'),row=c.prepareRows(d,m,p).find(r=>!r.reason&&!r.methodReason&&r.entry.pointsRange);
  const value=c.rangeValues(row.entry.pointsRange)[0],i={...input(),masterId:m.id,assignmentId:row.id,modifier:'points',modifierPoints:value};
  const q=c.recordTask(d,p,i,at,'mortimer-1');assert.equal(q.points,p.points+value);assert.equal(q.mortimerTasks,p.mortimerTasks+1);
  assert.throws(()=>c.recordTask(d,p,{...i,modifierPoints:value+1},at,'bad'),/five-step/);
  assert.throws(()=>c.recordTask(d,p,{...i,modifier:'none'},at,'bad'),/unlocked/);
});
test('task log is bounded and malformed extras fail validation while old profiles remain accepted',()=>{
  let p=profile();for(let n=0;n<202;n++)p=c.recordTask(d,p,input(),at,'task-'+n);
  assert.equal(p.taskHistory.length,200);assert.equal(p.taskHistory[0].id,'task-2');
  const q=c.clone(p);q.taskHistory[0].method.variantId='unknown';assert.throws(()=>c.validateProfile(d,q),/variant/);
  assert.doesNotThrow(()=>c.validateProfile(d,profile()));
});
