const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs');
function fixture(){
 const source={title:'Independent rate fixture',url:'https://example.test',revision:1},ids=['target','slow','fast','filler-target'];
 const entry=(id,weight=1)=>({id,weight,minimum:id==='target'?10:id==='filler-target'?4:1,maximum:id==='target'?10:id==='filler-target'?4:1,extendedMin:20,extendedMax:20,requirements:[],source});
 const main={id:'nieve',name:'Main',group:'nieve',legacyIds:[],blockCost:90,skipCost:30,basePoints:15,streakGroup:'normal',requirements:[],source,tasks:[entry('target'),entry('slow')]};
 const filler={...main,id:'turael',name:'Turael',group:'beginner',basePoints:0,tasks:[entry('fast')]};
 const mazchna={...filler,id:'mazchna',name:'Mazchna',group:'mazchna',basePoints:6};
 const d={schemaVersion:2,version:'rate-test',captured:'test',masters:[main,filler,mazchna],assignments:ids.map(id=>({id,name:id,variantIds:[id],source})),variants:ids.map(id=>({id,name:id,assignmentIds:[id],hp:60,multiplier:1,requirements:[],source,status:'fixture',drops:[]})),quests:[],unlocks:{},sources:[source],audit:[],attribution:''};
 const p=c.newProfile(d);p.goal.targets=[{assignmentId:'target',variantId:'target',priority:1}];p.strategy='none';p.assumeUnknown=false;p.blockLimit=0;p.requestMinutes=1;p.skipSeconds=30;p.streaks.normal=0;
 for(const [id,rate] of Object.entries({target:10,slow:20,fast:2,'filler-target':4}))p.methods[id]={...c.defaultMethod(d,p,id),timing:'task-minutes',rate,travel:id==='target'?2:0};
 return {d,p,main,filler,mazchna,entry};
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('target kills/hour counts full target combat, intervening tasks, requests and travel',()=>{
 const {d,p,main}=fixture(),plan=c.evaluate(d,main,p,[]);
 // Half the requests give 10 targets in 12 min, half give a 20-min non-target.
 // One request minute per cycle: 5 target kills / (1+6+10) minutes.
 close(plan.targetKillsPerHour,5*60/17);
 assert.notEqual(plan.targetKillsPerHour,10/(plan.hours||1));
 p.goal.kind='kills';p.goal.quantity=1;close(c.evaluate(d,main,p,[]).targetKillsPerHour,plan.targetKillsPerHour);
 p.methods.slow.rate=40;assert.ok(c.evaluate(d,main,p,[]).targetKillsPerHour<plan.targetKillsPerHour);
});

test('paid skipping includes skip time and extensions/bracelets use actual expected creature kills',()=>{
 const {d,p,main}=fixture();p.strategy='funded';
 close(c.evaluate(d,main,p,[]).targetKillsPerHour,5*60/(1+6+.25));
 p.methods.target.extended=true;p.methods.target.bracelet='slaughter';
 close(c.evaluate(d,main,p,[]).targetKillsPerHour,(.5*20/.75)*60/(1+6+.25));
});

test('incompatible Konar rolls do not count target kills and use their actual fallback time',()=>{
 const {d,p,main}=fixture();p.strategy='funded';const rows=c.prepareRows(d,main,p);
 rows.forEach(r=>r.probability=.5);rows[0].targetFraction=.25;
 const fallback={...rows[0],isTarget:false,minutes:4,skip:1};
 const moments=c.offerMoments(rows,p,new Map([[rows[0],fallback]]));
 close(moments.targetKills,1.25);close(moments.full,12.6875);
});

test('Turael and Mazchna boosting include the complete filler/milestone schedule',()=>{
 for(const strategy of ['boost-turael','boost-mazchna']){
  const {d,p,main}=fixture();p.strategy=strategy;main.tasks=main.tasks.slice(0,1);
  // Nine 3-minute filler cycles, then 13 minutes for ten targets.
  close(c.evaluate(d,main,p,[]).targetKillsPerHour,10*60/40);
  p.streaks.normal=9;close(c.evaluate(d,main,p,[]).targetKillsPerHour,10*60/40);
 }
});

test('boost target rates count compatible targets from the filler master too',()=>{
 const {d,p,main,filler,entry}=fixture();p.strategy='boost-turael';main.tasks=main.tasks.slice(0,1);
 filler.tasks.push(entry('filler-target'));p.goal.targets.push({assignmentId:'filler-target',variantId:'filler-target',priority:1});
 // Nine filler cycles give 18 targets in 36 minutes, plus 10 in 13 minutes.
 close(c.evaluate(d,main,p,[]).targetKillsPerHour,28*60/49);
});

test('Turael reset rate includes resets/replacements and completes the successful target task',()=>{
 const {d,p,main}=fixture();p.strategy='reset-turael';
 // Main request + 50% reset*(0.5 reset + 1 request + 2 filler) + 50%*12 target.
 close(c.evaluate(d,main,p,[]).targetKillsPerHour,5*60/8.75);
 p.methods.slow.rate=10000;close(c.evaluate(d,main,p,[]).targetKillsPerHour,5*60/8.75);
});

test('reset target rate includes targets rolled as Turael replacements',()=>{
 const {d,p,main,filler,entry}=fixture();p.strategy='reset-turael';
 filler.tasks.push(entry('filler-target'));p.goal.targets.push({assignmentId:'filler-target',variantId:'filler-target',priority:1});
 close(c.evaluate(d,main,p,[]).targetKillsPerHour,6*60/9.25);
});

test('unsupported or unavailable analytical rates have an explanation instead of a made-up number',()=>{
 const {d,p,main}=fixture();p.cape=true;let plan=c.evaluate(d,main,p,[]);
 assert.equal(plan.targetKillsPerHour,null);assert.match(plan.targetRateReason,/Cape/);
 const actual=c.maxedProfile(c.catalogue);actual.unlocks.basilocked=1;actual.strategy='none';actual.assumeUnknown=true;
 plan=c.evaluate(c.catalogue,c.catalogue.masters.find(m=>m.id==='mortimer'),actual,[]);
 assert.equal(plan.reason,'');assert.equal(plan.targetKillsPerHour,null);assert.match(plan.targetRateReason,/Mortimer quantity and combat modifiers/);
});

const code=buildSync({entryPoints:['src/ui/target-rate.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};
new Function('module','exports',code)(m,m.exports);
test('column formatting explains the cycle basis, finite funding and missing rates safely',()=>{
 const {d,p,main}=fixture();p.strategy='funded';const plan=c.evaluate(d,main,p,[]),html=m.exports.renderTargetRateCell(plan,p);
 assert.match(html,/41\.4/);assert.match(html,/Unlimited funds/);assert.match(html,/target combat, intervening tasks/);
 assert.match(html,/not kills before an offer\/drop goal stops/);
 assert.match(m.exports.renderTargetRateCell({...plan,targetKillsPerHour:null,targetRateReason:'Missing <fact>'},p),/Missing &lt;fact&gt;/);
 assert.match(m.exports.renderTargetRateCell({...plan,targetKillsPerHour:null,targetRateReason:'Not available'},p),/>—<\/td>/);
});
