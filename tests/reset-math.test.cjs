const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../.desktop-build/core.cjs');
function fixture(){
  const source={title:'independent renewal fixture',url:'https://example.test',revision:1};
  const ids=['target','reset','shared','filler'];
  const assignments=ids.map(id=>({id,name:id,variantIds:[id],source}));
  const variants=ids.map(id=>({id,name:id,assignmentIds:[id],hp:60,multiplier:1,requirements:[],source,status:'fixture',drops:[]}));
  const entry=(id,weight)=>({id,weight,minimum:1,maximum:1,extendedMin:0,extendedMax:0,requirements:[],source});
  const main={id:'nieve',name:'main',group:'nieve',legacyIds:[],blockCost:90,skipCost:30,basePoints:15,streakGroup:'normal',requirements:[],source,tasks:[entry('target',1),entry('reset',2),entry('shared',1)]};
  const filler={...main,id:'turael',name:'Turael',group:'beginner',blockCost:40,basePoints:0,tasks:[entry('filler',1),entry('shared',1)]};
  const d={schemaVersion:2,version:'test',captured:'test',masters:[main,filler],assignments,variants,quests:[],unlocks:{},sources:[source],audit:[],attribution:''};
  const p=c.newProfile(d);p.goal.targets=[{assignmentId:'target',variantId:'target',priority:1}];p.strategy='reset-turael';p.blockLimit=1;p.assumeUnknown=false;p.requestMinutes=1;p.skipSeconds=30;p.points=500;p.reserve=0;
  for(const [id,rate]of Object.entries({target:100,reset:120,shared:8,filler:2}))p.methods[id]={...c.defaultMethod(d,p,id),timing:'task-minutes',rate};
  p.simulation={trials:20000,seed:1234,horizonOffers:200,sessionHours:1};return {d,p,main,filler,entry};
}
test('reset table solves an independent two-stage renewal equation rather than completing original tasks',()=>{
  const {d,p,main}=fixture(),plan=c.evaluate(d,main,p,[]);
  // P(target)=1/4, P(reset)=1/2, shared task=8 min, mean Turael=(2+8)/2=5.
  // E = 1 + (1/2)(0.5+1+5) + (1/4)8 + (3/4)E = 25 min.
  assert.equal(plan.reason,'');assert.ok(Math.abs(plan.hours*60-25)<1e-10);
  const ranked=c.evaluate(d,main,{...p,objective:'chance'},[]);assert.equal(ranked.objectiveValue,-ranked.chance);
  assert.equal(plan.reset.rate,.5);assert.equal(plan.reset.replacementMinutes,6);
  assert.equal(plan.offers,6);assert.equal(plan.chance,1/6);assert.equal(plan.pointsEarned,null);assert.equal(c.fundingForecast(plan,p).drift,null);
  const complete=c.evaluate(d,main,{...p,strategy:'none'},[]);assert.equal(complete.hours*60,252);
  p.methods.reset.rate=1000;assert.equal(c.evaluate(d,main,p,[]).hours,plan.hours);
});
test('analytical reset time agrees with the independent seeded simulation',()=>{
  const {d,p,main}=fixture(),plan=c.evaluate(d,main,p,[]),sim=c.simulate(d,plan,p);
  assert.equal(sim.unresolved,0);assert.ok(Math.abs(sim.meanHours*60-25)<.4);
});
test('incompatible Konar target locations count as reset opportunities rather than target combat',()=>{
  const {d,p,main}=fixture();main.id='konar';p.assumeUnknown=true;p.methods.target.locationChance=.25;p.simulation.horizonOffers=1000;
  const plan=c.evaluate(d,main,p,[]);
  // Compatible target=1/16, resets=1/2+3/16, shared completion=1/4.
  assert.equal(plan.reset.directChance,1/16);assert.equal(plan.reset.rate,11/16);
  assert.equal(c.taskAdvice(d,plan,p,plan.rows.find(r=>r.id==='target')).action,'Check offered location');
  assert.ok(Math.abs(plan.hours*60-119.5)<1e-10);
  const simulated=c.simulate(d,plan,p);assert.equal(simulated.unresolved,0);assert.ok(Math.abs(simulated.meanHours*60-119.5)<2,simulated.meanHours*60);
  p.preferences.target='protect';const protectedPlan=c.evaluate(d,main,p,[]);
  assert.equal(protectedPlan.reset.rate,.5);assert.ok(protectedPlan.hours<plan.hours);
  assert.equal(c.taskAdvice(d,protectedPlan,p,protectedPlan.rows.find(r=>r.id==='target')).action,'Complete target');
});
test('actual beginner blocks affect reset eligibility; proposed and automatic blocks are not free',()=>{
  const {d,p,main,filler}=fixture();p.proposed.beginner=['shared'];
  assert.equal(c.evaluate(d,main,p,[]).hours*60,25);
  p.blocks.beginner=['shared'];const plan=c.evaluate(d,main,p,[]);
  assert.equal(c.canReset(main,'shared',filler,p.blocks.beginner),true);
  assert.equal(c.canReset(filler,'shared',filler,p.blocks.beginner),false);
  assert.equal(plan.reset.rate,.75);assert.equal(plan.hours*60,14.5);
  assert.deepEqual(plan.reset.fillerBlocks,['shared']);
  const sim=c.simulate(d,plan,p);assert.ok(Math.abs(sim.meanHours*60-14.5)<.3);
});
test('targets offered by Turael stop the hunt before replacement combat and count both request types',()=>{
  const {d,p,main,filler,entry}=fixture();filler.tasks.push(entry('target',1));
  const plan=c.evaluate(d,main,p,[]);
  // Success/cycle = 1/4 + (1/2)(1/3)=5/12; cycle cost=65/12 min.
  assert.ok(Math.abs(plan.hours*60-13)<1e-10);assert.ok(Math.abs(plan.offers-3.6)<1e-10);
  assert.ok(Math.abs(plan.chance-5/18)<1e-10);
  assert.ok(Math.abs(c.simulate(d,plan,p).meanHours*60-13)<.3);
});
test('a target reachable only through replacements stays finite; an unreachable target remains unavailable',()=>{
  const {d,p,main,filler,entry}=fixture();main.tasks=main.tasks.filter(t=>t.id!=='target');filler.tasks.push(entry('target',1));
  const plan=c.evaluate(d,main,p,[]);assert.equal(plan.reason,'');assert.equal(plan.reset.directChance,0);assert.ok(Math.abs(plan.hours*60-31)<1e-10);
  filler.tasks=filler.tasks.filter(t=>t.id!=='target');const absent=c.evaluate(d,main,p,[]);assert.equal(absent.hours,null);assert.equal(absent.chance,null);assert.match(absent.reason,/No compatible target/);
});
test('current resettable tasks are replaced immediately instead of consuming the remaining kills',()=>{
  const {d,p,main}=fixture();p.current={kind:'task',masterId:main.id,assignmentId:'reset',remaining:1};
  const plan=c.evaluate(d,main,p,[]),one=c.simulate(d,plan,p);p.current.remaining=9999;
  const many=c.simulate(d,plan,p);assert.equal(one.meanHours,many.meanHours);
  assert.match(one.trace[0],/^0\.5 min.*Reset current reset/);
  assert.ok(Math.abs(one.meanHours*60-31.5)<.5);
});
test('resetting avoids unavailable original combat methods but validates replacement methods',()=>{
  const {d,p,main}=fixture();d.variants.find(v=>v.id==='reset').requirements=[{kind:'access',key:'locked',min:1,label:'Locked original variant'}];p.access.locked=0;
  const plan=c.evaluate(d,main,p,[]);assert.equal(plan.reason,'');assert.ok(Math.abs(plan.hours*60-25)<1e-10);
  d.variants.find(v=>v.id==='filler').requirements=[{kind:'access',key:'locked',min:1,label:'Locked replacement'}];
  assert.match(c.evaluate(d,main,p,[]).reason,/Turael replacement task.*completion method/);
});
test('Wilderness cancellation leaves the normal streak intact; replacement completion advances it',()=>{
  const {p,main,filler,entry}=fixture(),wild={...main,id:'krystilia',group:'krystilia',streakGroup:'wilderness'};
  p.streaks.normal=9;p.streaks.wilderness=50;const ledger=c.ledger(p);
  c.resetStreak(ledger,wild);assert.equal(ledger.streaks.wilderness,0);assert.equal(ledger.streaks.normal,9);
  assert.equal(c.complete(ledger,filler,p,entry('filler',1)),0);assert.equal(ledger.streaks.normal,10);assert.equal(ledger.streaks.wilderness,0);
});
test('protected and non-resettable tasks still take their completion time',()=>{
  const {d,p,main}=fixture();p.preferences.reset='protect';
  const plan=c.evaluate(d,main,p,[]);assert.equal(plan.reset,undefined);assert.equal(plan.hours*60,252);
});
