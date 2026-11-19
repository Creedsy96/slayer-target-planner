const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../.desktop-build/core.cjs');
function fixture(){
  const source={title:'independent strategy fixture',url:'https://example.test',revision:1},ids=['target','fast','slow'];
  const assignments=ids.map(id=>({id,name:id,variantIds:[id],source}));
  const variants=ids.map(id=>({id,name:id,assignmentIds:[id],hp:60,multiplier:1,requirements:[],source,status:'fixture',drops:[]}));
  const entry=(id,weight=1)=>({id,weight,minimum:1,maximum:1,extendedMin:0,extendedMax:0,requirements:[],source});
  const main={id:'duradel',name:'Milestone master',group:'duradel',streakGroup:'normal',basePoints:20,skipCost:30,blockCost:90,requirements:[],tasks:[entry('target')],legacyIds:[],source};
  const turael={...main,id:'turael',name:'Turael',group:'beginner',basePoints:0,blockCost:40,tasks:[entry('fast')]};
  const mazchna={...turael,id:'mazchna',name:'Mazchna',group:'mazchna',basePoints:6,blockCost:50};
  const d={schemaVersion:2,version:'strategy-test',captured:'test',masters:[main,turael,mazchna],assignments,variants,quests:[],unlocks:{},sources:[source],audit:[],attribution:''};
  const p=c.newProfile(d);p.goal.targets=[{assignmentId:'target',variantId:'target',priority:1}];p.strategy='boost-turael';p.streaks.normal=0;p.points=500;p.reserve=0;p.requestMinutes=1;p.skipSeconds=30;p.blockLimit=1;p.assumeUnknown=false;
  for(const [id,rate]of Object.entries({target:100,fast:2,slow:8}))p.methods[id]={...c.defaultMethod(d,p,id),timing:'task-minutes',rate};
  p.simulation={trials:20000,seed:54321,horizonOffers:1000,sessionHours:10};return {d,p,main,turael,mazchna,entry};
}
test('Turael boosting includes nine fillers and the milestone request; target offers do not grant future points',()=>{
  const {d,p,main}=fixture(),plan=c.evaluate(d,main,p,[]),r=c.simulate(d,plan,p);
  assert.equal(plan.reason,'');assert.equal(plan.hours*60,28);assert.equal(plan.offers,10);assert.equal(plan.boost.nextMainCompletion,10);assert.equal(plan.boost.nextMainReward,100);
  assert.equal(plan.boost.rewardPer1000,17500);assert.equal(plan.boost.cycleMinutes,12800);assert.equal(plan.pointsEarned,17500/12800*60);
  assert.ok(Math.abs(r.meanHours*60-28)<1e-9);assert.equal(r.meanEarned,0);assert.equal(r.meanRemaining,500);
});
test('boost schedule is anchored to the actual streak and uses the highest milestone bonus',()=>{
  const {d,p,main}=fixture();p.streaks.normal=53;let plan=c.evaluate(d,main,p,[]);
  assert.equal(plan.hours*60,19);assert.equal(plan.boost.fillerCompletionsBeforeMain,6);assert.equal(plan.boost.nextMainCompletion,60);assert.equal(plan.boost.nextMainReward,100);
  p.milestone=50;plan=c.evaluate(d,main,p,[]);assert.equal(plan.boost.fillerCompletionsBeforeMain,46);assert.equal(plan.boost.nextMainCompletion,100);assert.equal(plan.boost.nextMainReward,500);
  p.streaks.normal=999;p.milestone=1000;assert.equal(c.evaluate(d,main,p,[]).boost.nextMainReward,1000);
});
test('Mazchna filler rewards honour the first-four-task warm-up and terminal milestone completion',()=>{
  const {d,p,main}=fixture();p.strategy='boost-mazchna';let plan=c.evaluate(d,main,p,[]),r=c.simulate(d,plan,p);
  assert.equal(r.meanEarned,30);assert.equal(r.meanRemaining,530);assert.equal(plan.boost.rewardPer1000,22900);
  p.goal.kind='kills';p.goal.quantity=1;plan=c.evaluate(d,main,p,[]);r=c.simulate(d,plan,p);
  assert.equal(r.meanEarned,130);assert.equal(r.meanRemaining,630);assert.ok(Math.abs(r.meanHours*60-128)<1e-8);
});
test('49 Mazchna completions plus an 18-point master at task 50 give 636 fresh points or 660 on an established streak',()=>{
  const {d,p,main}=fixture();main.basePoints=18;p.strategy='boost-mazchna';p.milestone=50;p.goal.kind='kills';p.goal.quantity=1;p.simulation.trials=100;
  let r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.equal(r.meanEarned,636);
  p.streaks.normal=1000;r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.equal(r.meanEarned,660);
});
test('boost renewal equation includes failed milestone tasks and agrees with simulation',()=>{
  const {d,p,main,entry}=fixture();main.tasks.push(entry('slow'));
  const plan=c.evaluate(d,main,p,[]);assert.equal(plan.hours*60,64);assert.equal(plan.offers,20);
  const r=c.simulate(d,plan,p);assert.equal(r.unresolved,0);assert.ok(Math.abs(r.meanHours*60-64)<1.2);
});
test('boosts can finish at the filler master before reaching a milestone',()=>{
  const {d,p,main,turael,entry}=fixture();main.tasks=[entry('slow')];turael.tasks=[entry('target')];
  const plan=c.evaluate(d,main,p,[]);assert.equal(plan.reason,'');assert.equal(plan.hours*60,1);assert.equal(plan.boost.mainChance,0);assert.equal(plan.boost.fillerChance,1);
  assert.ok(Math.abs(c.simulate(d,plan,p).meanHours*60-1)<1e-10);
});
test('only recorded filler blocks are used; shared block groups use one proposed list and one setup payment',()=>{
  const {d,p,main,turael,entry}=fixture();turael.tasks.push(entry('slow'));p.proposed.beginner=['slow'];
  // Mean filler combat=(2+8)/2=5: 9*(5+1)+1=55 minutes.
  assert.equal(c.evaluate(d,main,p,[]).hours*60,55);
  p.blocks.beginner=['slow'];assert.equal(c.evaluate(d,main,p,[]).hours*60,28);
  p.blocks={};p.points=500;p.applySetup=true;p.goal.targets=[{assignmentId:'fast',variantId:'fast',priority:1}];
  const plan=c.evaluate(d,turael,p,['slow']),r=c.simulate(d,plan,p);assert.equal(r.meanSpent,40);assert.equal(r.meanRemaining,460);
});
test('Wilderness and Mortimer cannot be normal-streak milestone masters; filler access is checked',()=>{
  const {d,p,main,mazchna}=fixture();main.streakGroup='wilderness';assert.match(c.evaluate(d,main,p,[]).reason,/normal streak group/);
  main.streakGroup='normal';p.strategy='boost-mazchna';mazchna.requirements=[{kind:'quest',key:'Locked',label:'Filler quest',min:2}];p.quests.Locked=0;
  const plan=c.evaluate(d,main,p,[]);assert.match(plan.reason,/Mazchna access/);assert.throws(()=>c.simulate(d,plan,p),/Mazchna access/);
});
test('paid skips do not advance boosting; a stationary skip stall remains simulatable with finite points',()=>{
  const {d,p,main}=fixture();p.preferences.fast='skip';p.points=0;
  const plan=c.evaluate(d,main,p,[]);assert.equal(plan.hours,null);assert.equal(plan.simulationOnly,true);
  const r=c.simulate(d,plan,p);assert.ok(Math.abs(r.meanHours*60-28)<1e-9);assert.equal(r.meanSpent,0);assert.equal(r.exhaustionChance,1);
});
test('pending offers use their actual master and reward rules even when off the boost schedule',()=>{
  const {d,p,main,mazchna}=fixture();p.streaks.normal=53;p.goal.kind='kills';p.goal.quantity=1;
  p.current={kind:'offer',masterId:main.id,assignmentId:'target',remaining:0,options:[{assignmentId:'target',modifier:'none',points:0,quantity:0,target:true}]};
  let r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.equal(r.meanEarned,20);assert.ok(Math.abs(r.meanHours*60-100)<1e-9);
  p.goal.kind='offer';p.streaks.normal=59;p.current={kind:'offer',masterId:mazchna.id,assignmentId:'fast',remaining:0,options:[{assignmentId:'fast',modifier:'none',points:0,quantity:0,target:false}]};
  r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.equal(r.meanEarned,30);assert.ok(Math.abs(r.meanHours*60-30)<1e-9);
});
test('ordinary points use a full 1000-task cycle, first four zero, and unstacked highest bonuses',()=>{
  const {p,main,entry}=fixture(),l=c.ledger({...p,points:0}),rewards=[];
  for(let n=1;n<=1000;n++)rewards.push(c.complete(l,main,p,entry('target')));
  assert.deepEqual(rewards.slice(0,5),[0,0,0,0,20]);assert.deepEqual([10,50,100,250,1000].map(n=>rewards[n-1]),[100,300,500,700,1000]);assert.equal(l.earned,35420);
  const wild={...main,id:'krystilia',streakGroup:'wilderness',basePoints:25};l.streaks.wilderness=4;const normal=l.streaks.normal;assert.equal(c.complete(l,wild,p,entry('target')),25);assert.equal(l.streaks.normal,normal);
});
test('unknown elite diary point bonuses stay conditional and cannot become recorded actual rewards',()=>{
  const d=c.catalogue,p=c.maxedProfile(d),m=d.masters.find(m=>m.id==='nieve');p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];p.diaries.western=null;p.assumeUnknown=false;
  const plan=c.evaluate(d,m,p,[]);assert.ok(plan.unknown.includes('Western elite diary point bonus'));assert.equal(plan.pointsEarned,null);assert.equal(plan.hours,null);
  const scenario={...p,assumeUnknown:true};assert.equal(c.completionReward(m,scenario,10,m.tasks[0]),75);
  assert.throws(()=>c.recordTask(d,scenario,{masterId:m.id,assignmentId:'hellhounds',action:'complete',modifier:'none',modifierPoints:0,combatMinutes:null,kills:null},'2026-11-19T15:00:00Z','id'),/Confirm the elite diary/);
  p.diaries.western=0;assert.equal(c.completionReward(m,p,10,m.tasks[0]),60);p.diaries.western=1;assert.equal(c.completionReward(m,p,10,m.tasks[0]),75);
});
test('ordinary long-run point rates include per-request overhead',()=>{
  const {d,p,main}=fixture();p.strategy='none';p.methods.target.rate=1;const plan=c.evaluate(d,main,p,[]);
  assert.equal(plan.pointsEarned,20*1.775*60/2);
});
test('ordinary and funded Konar estimates use the fast completion fallback in incompatible locations',()=>{
  const {d,p,main,entry}=fixture();main.id='konar';main.tasks.push(entry('slow'));p.methods.target.locationChance=.25;p.assumeUnknown=true;
  for(const [strategy,expected]of [['none',40.75],['funded',10.75]]){
    p.strategy=strategy;p.points=1e9;const plan=c.evaluate(d,main,p,[]);assert.ok(Math.abs(plan.hours*60-expected)<1e-10);
    const r=c.simulate(d,plan,p);assert.equal(r.unresolved,0);assert.ok(Math.abs(r.meanHours*60-expected)<.7,strategy+': '+r.meanHours*60);
  }
});
test('goals ending mid-task earn no completion reward; goals ending on the last kill do',()=>{
  const {d,p,main}=fixture();p.strategy='none';p.streaks.normal=9;p.goal.kind='kills';p.goal.quantity=1;
  let r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.equal(r.meanEarned,100);
  main.tasks[0].minimum=main.tasks[0].maximum=2;r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.equal(r.meanEarned,0);
  p.goal.kind='drop';p.goal.customDropRate=1;r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.equal(r.meanEarned,0);
  main.tasks[0].minimum=main.tasks[0].maximum=1;r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.equal(r.meanEarned,100);
});
test('an already-observed target satisfies an offer goal without spending setup points or crediting future rewards',()=>{
  const {d,p,main,entry}=fixture();main.tasks.push(entry('slow'));p.strategy='none';p.points=20;p.applySetup=true;
  p.current={kind:'offer',masterId:main.id,assignmentId:'target',remaining:0,options:[{assignmentId:'target',modifier:'none',points:0,quantity:0,target:true}]};
  const plan=c.evaluate(d,main,p,['slow']);assert.match(plan.reason,/Insufficient points/);
  const r=c.simulate(d,plan,p);assert.equal(r.meanHours,0);assert.equal(r.meanSpent,0);assert.equal(r.meanEarned,0);assert.equal(r.meanRemaining,20);
});
test('all six strategies conserve starting points plus earned minus spent',()=>{
  const {d,p,main,entry}=fixture();main.tasks.push(entry('slow'));p.streaks.normal=8;p.points=90;p.simulation.trials=2000;
  for(const strategy of ['none','sustainable','funded','boost-turael','boost-mazchna','reset-turael']){
    const q={...p,strategy},r=c.simulate(d,c.evaluate(d,main,q,[]),q);assert.equal(r.unresolved,0);assert.ok(Math.abs(r.meanRemaining-(q.points+r.meanEarned-r.meanSpent))<1e-8,strategy);
  }
});
test('cape repeats the last assigned task after a paid skip, rather than the last completed task',()=>{
  const {d,p,main,entry}=fixture();main.tasks.push(entry('slow'));p.strategy='funded';p.cape=true;p.levels.slayer=99;p.previousTask='target';p.previousMasterId=main.id;p.preferences.slow='skip';p.points=1e6;
  p.current={kind:'offer',masterId:main.id,assignmentId:'slow',remaining:0,options:[{assignmentId:'slow',modifier:'none',points:0,quantity:0,target:false}]};p.simulation.sessionHours=1.6/60;
  const r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.ok(Math.abs(r.sessionChance-.45)<.015,r.sessionChance);
});
test('cape cannot repeat a filler assignment from a different master',()=>{
  const {d,p,main,turael,entry}=fixture();main.tasks.push(entry('slow'));turael.tasks=[entry('target'),entry('fast')];p.cape=true;p.levels.slayer=99;p.previousTask='target';p.previousMasterId=turael.id;p.streaks.normal=9;p.simulation.sessionHours=1.1/60;
  const r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.ok(Math.abs(r.sessionChance-.5)<.015,r.sessionChance);
});
test('cape starting state requires the real previous master and partial Konar location confirmation',()=>{
  const {d,p,main}=fixture();p.strategy='none';p.cape=true;p.levels.slayer=99;p.previousTask='target';
  assert.throws(()=>c.simulate(d,c.evaluate(d,main,p,[]),p),/previous task master/);
  main.id='konar';p.previousMasterId=main.id;p.methods.target.locationChance=.25;p.assumeUnknown=true;
  assert.throws(()=>c.simulate(d,c.evaluate(d,main,p,[]),p),/previous task location/);
});
test('an actual current assignment supplies cape history without inventing a different previous task',()=>{
  const {d,p,main,turael}=fixture();p.cape=true;p.levels.slayer=99;p.previousTask='';p.current={kind:'task',masterId:turael.id,assignmentId:'fast',remaining:1};
  assert.doesNotThrow(()=>c.validateProfile(d,p));const r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.ok(Math.abs(r.meanHours*60-27)<1e-8);
});
test('Mortimer reward is the actual modifier without streak multipliers, and invalid manual values are rejected',()=>{
  const d=c.catalogue,p=c.maxedProfile(d),m=d.masters.find(m=>m.id==='mortimer'),entry=m.tasks.find(t=>t.id==='banshees');p.streaks.normal=888;p.streaks.mortimer=999;
  const l=c.ledger(p);assert.equal(c.complete(l,m,p,entry,'points',10),10);assert.equal(l.streaks.normal,888);assert.equal(l.streaks.mortimer,1000);
  assert.throws(()=>c.completionReward(m,p,1000,entry,'points'),/actual/);assert.throws(()=>c.complete(l,m,p,entry,'points',7),/actual/);
  p.goal.targets=[{assignmentId:'banshees',variantId:d.assignments.find(a=>a.id==='banshees').variantIds[0],priority:1}];p.strategy='none';
  p.current={kind:'offer',masterId:m.id,assignmentId:entry.id,remaining:0,options:[{assignmentId:entry.id,modifier:'points',points:7,quantity:0,target:true}]};
  const plan=c.evaluate(d,m,p,[]);assert.equal(plan.pointsEarned,null);assert.throws(()=>c.simulate(d,plan,p),/actual/);
  p.current.options[0]={assignmentId:entry.id,modifier:'quantity',points:0,quantity:0,target:true};assert.throws(()=>c.simulate(d,plan,p),/quantity modifier/);
  delete p.current.options;assert.throws(()=>c.simulate(d,plan,p),/pending offer options/);
});
