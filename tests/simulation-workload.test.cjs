const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs');
function fixture(){
 const source={title:'workload fixture',url:'https://example.test',revision:1},ids=['target','filler','slow'];
 const assignments=ids.map(id=>({id,name:id,variantIds:[id],source}));
 const variants=ids.map(id=>({id,name:id,assignmentIds:[id],hp:60,multiplier:1,requirements:[],source,status:'fixture',drops:[]}));
 const entry=(id,quantity)=>({id,weight:1,minimum:quantity,maximum:quantity,extendedMin:20,extendedMax:20,requirements:[],source});
 const main={id:'nieve',name:'main',group:'nieve',streakGroup:'normal',basePoints:15,skipCost:30,blockCost:90,requirements:[],tasks:[entry('target',10)],legacyIds:[],source};
 const filler={...main,id:'turael',name:'Turael',group:'beginner',basePoints:0,tasks:[entry('filler',2)]};
 const d={schemaVersion:2,version:'workload-test',captured:'test',masters:[main,filler],assignments,variants,quests:[],unlocks:{},sources:[source],audit:[],attribution:''};
 const p=c.newProfile(d);p.goal={...p.goal,kind:'kills',quantity:3,targets:[{assignmentId:'target',variantId:'target',priority:1}]};p.assumeUnknown=false;p.strategy='none';p.blockLimit=1;p.reserve=0;p.points=500;p.combat={...c.defaultCombat(),enabled:false};p.simulation={trials:100,seed:9876,horizonOffers:10,sessionHours:4};
 for(const id of ids)p.methods[id]={...c.defaultMethod(d,p,id),timing:'kills-hour',rate:60,travel:0,bracelet:'none'};
 return {d,p,main,filler,entry,run:(blocks=[])=>c.simulate(d,c.evaluate(d,main,p,blocks),p)};
}
const zero={assignedKills:0,kills:0,tasksCompleted:0,tasksSkipped:0,paidSkips:0,resets:0};
test('a kill goal midway through a task retains its assigned count but no completion',()=>{
 const {run}=fixture(),r=run();assert.deepEqual(r.meanWorkload,{...zero,assignedKills:10,kills:3});assert.deepEqual(r.exampleWorkload,r.meanWorkload);assert.equal(r.meanEarned,0);
});
test('finishing exactly at the task boundary counts the completion once',()=>{
 const {p,run}=fixture();p.goal.quantity=10;assert.deepEqual(run().meanWorkload,{...zero,assignedKills:10,kills:10,tasksCompleted:1});
 p.goal.quantity=12;assert.deepEqual(run().meanWorkload,{...zero,assignedKills:20,kills:12,tasksCompleted:1});
});
test('a direct drop can finish a task partially or at its exact boundary',()=>{
 const {p,main,run}=fixture();p.goal.kind='drop';p.goal.customDropRate=1;assert.deepEqual(run().meanWorkload,{...zero,assignedKills:10,kills:1});
 main.tasks[0].minimum=main.tasks[0].maximum=1;assert.deepEqual(run().meanWorkload,{...zero,assignedKills:1,kills:1,tasksCompleted:1});
});
test('offer-only and already-observed target goals do not invent combat or completion totals',()=>{
 const {d,p,main,run}=fixture();p.goal.kind='offer';assert.deepEqual(run().meanWorkload,zero);
 for(const kind of ['offer','task']){p.current={kind,masterId:main.id,assignmentId:'target',remaining:5,options:[{assignmentId:'target',modifier:'none',points:0,quantity:0,target:true}]};const r=c.simulate(d,c.evaluate(d,main,p,[]),p);assert.deepEqual(r.meanWorkload,zero);assert.deepEqual(r.exampleWorkload,zero);}
});
test('starting mid-task counts only remaining assignment count and future combat',()=>{
 const {p,main,run}=fixture();p.current={kind:'task',masterId:main.id,assignmentId:'target',remaining:4};assert.deepEqual(run().meanWorkload,{...zero,assignedKills:4,kills:3});
 p.current.remaining=2;assert.deepEqual(run().meanWorkload,{...zero,assignedKills:12,kills:3,tasksCompleted:1});
});
test('paid skips count successful payments, exclude skipped quantities and cannot be bought with future points',()=>{
 const {p,main,entry,run}=fixture();main.tasks.push(entry('slow',7));p.strategy='funded';p.preferences.slow='skip';p.current={kind:'offer',masterId:main.id,assignmentId:'slow',remaining:0,options:[{assignmentId:'slow',modifier:'none',points:0,quantity:0,target:false}]};
 let r=run(['slow']);assert.deepEqual(r.meanWorkload,{...zero,assignedKills:10,kills:3,tasksSkipped:1,paidSkips:1});assert.equal(r.meanSpent,30);
 p.points=0;r=run(['slow']);assert.deepEqual(r.meanWorkload,{...zero,assignedKills:17,kills:10,tasksCompleted:1});assert.equal(r.meanSpent,0);
});
test('current-task Turael resets count as skips and replacement completions count as tasks done',()=>{
 const {p,main,entry,run}=fixture();main.tasks.push(entry('slow',7));p.strategy='reset-turael';p.goal.kind='offer';p.current={kind:'task',masterId:main.id,assignmentId:'slow',remaining:9};
 const r=run(['slow']);assert.deepEqual(r.meanWorkload,{...zero,assignedKills:2,kills:2,tasksCompleted:1,tasksSkipped:1,resets:1});assert.equal(r.meanSpent,0);
 p.current={kind:'offer',masterId:main.id,assignmentId:'slow',remaining:0,options:[{assignmentId:'slow',modifier:'none',points:0,quantity:0,target:false}]};assert.deepEqual(run(['slow']).meanWorkload,r.meanWorkload);
});
test('boosting includes all nine filler completions and the accepted milestone task',()=>{
 const {p,run}=fixture();p.strategy='boost-turael';p.streaks.normal=0;p.goal.kind='offer';assert.deepEqual(run().meanWorkload,{...zero,assignedKills:18,kills:18,tasksCompleted:9});
 p.goal.kind='kills';p.goal.quantity=10;assert.deepEqual(run().meanWorkload,{...zero,assignedKills:28,kills:28,tasksCompleted:10});
});
test('unfinished trials retain actual totals and bracelets change creatures killed rather than assigned count',()=>{
 const {p,run}=fixture();p.goal.quantity=10000;let r=run();assert.equal(r.unresolved,100);assert.deepEqual(r.meanWorkload,{...zero,assignedKills:100,kills:100,tasksCompleted:10});
 for(const bracelet of ['slaughter','expeditious']){p.methods.target.bracelet=bracelet;r=run();assert.equal(r.meanWorkload.assignedKills,100);assert.equal(r.meanWorkload.tasksCompleted,10);assert.ok(bracelet==='slaughter'?r.meanWorkload.kills>100:r.meanWorkload.kills<100);assert.ok(Object.values(r.exampleWorkload).every(Number.isInteger));}
});
test('extended quantities and actual Mortimer quantity modifiers are included in assigned kills',()=>{
 const {p,run}=fixture();p.extensions={target:true};assert.equal(run().meanWorkload.assignedKills,20);
 const d=c.clone(c.catalogue),master=d.masters.find(m=>m.id==='mortimer'),entry=master.tasks.find(e=>e.id==='banshees');master.tasks=[{...entry,minimum:60,maximum:60}];
 const q=c.maxedProfile(d);q.assumeAllGear=false;q.combat.enabled=false;q.blockLimit=0;q.strategy='none';q.mortimerTasks=1000;q.simulation.trials=100;q.goal={...q.goal,kind:'kills',quantity:1,targets:[{assignmentId:'banshees',variantId:d.assignments.find(a=>a.id==='banshees').variantIds[0],priority:1}]};
 q.current={kind:'offer',masterId:'mortimer',assignmentId:'banshees',remaining:0,options:[{assignmentId:'banshees',modifier:'quantity',points:0,quantity:-15,target:true}]};
 assert.deepEqual(c.simulate(d,c.evaluate(d,master,q,[]),q).meanWorkload,{...zero,assignedKills:45,kills:1});
});
test('fractional mean totals reflect trial variation while each example trial has integer counts',()=>{
 const {p,main,entry,run}=fixture();main.tasks.push(entry('slow',7));p.strategy='funded';p.preferences.slow='skip';p.points=1e9;p.simulation.trials=10000;p.simulation.horizonOffers=1000;
 const r=run();assert.ok(Math.abs(r.meanWorkload.tasksSkipped-1)<.05);assert.equal(r.meanWorkload.tasksSkipped,r.meanWorkload.paidSkips);assert.ok(Math.abs(r.meanSpent-30*r.meanWorkload.paidSkips)<1e-8);
 assert.deepEqual({...r.meanWorkload,tasksSkipped:0,paidSkips:0},{...zero,assignedKills:10,kills:3});assert.ok(Object.values(r.exampleWorkload).every(Number.isInteger));
});
test('exported totals and trace summary describe averages and exact example counts independently',()=>{
 const {run}=fixture(),r=run(),code=buildSync({entryPoints:['src/ui/simulation-totals.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};new Function('module','exports',code)(m,m.exports);
 const html=m.exports.renderSimulationTotals(r);for(const label of ['Total assigned kills','Creatures killed','Tasks completed','Tasks skipped','Average totals per hunt'])assert.ok(html.includes(label));
 const exported=JSON.parse(JSON.stringify(r));assert.deepEqual(exported.meanWorkload,r.meanWorkload);assert.match(m.exports.exampleWorkloadText(r),/10 assigned kills; 3 creatures killed; 0 tasks completed; 0 tasks skipped/);
});
