const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs');
function fixture(){
 const source={title:'Independent throughput fixture',url:'https://example.test',revision:1};
 const ids=['target','fast','slow','reset-a','reset-b'];
 const entry=(id,weight=1,quantity=1)=>({id,weight,minimum:quantity,maximum:quantity,extendedMin:0,extendedMax:0,requirements:[],source});
 const main={id:'nieve',name:'Quick offers',group:'nieve',legacyIds:[],blockCost:90,skipCost:30,basePoints:15,streakGroup:'normal',requirements:[],source,tasks:[entry('target',1,10),entry('fast')]};
 const larger={...main,id:'duradel',name:'More target kills',group:'duradel',tasks:[entry('target',1,100),entry('slow')]};
 const filler={...main,id:'turael',name:'Turael',group:'beginner',basePoints:0,tasks:[entry('fast')]};
 const mazchna={...filler,id:'mazchna',name:'Mazchna',group:'mazchna'};
 const d={schemaVersion:2,version:'rate-ranking',captured:'test',masters:[main,larger,filler,mazchna],assignments:ids.map(id=>({id,name:id,variantIds:[id],source})),variants:ids.map(id=>({id,name:id,assignmentIds:[id],hp:60,multiplier:1,requirements:[],source,status:'fixture',drops:[]})),quests:[],unlocks:{},sources:[source],audit:[],attribution:''};
 const p=c.newProfile(d);p.goal.targets=[{assignmentId:'target',variantId:'target',priority:1}];p.strategy='none';p.objective='kills-hour';p.assumeUnknown=false;p.blockLimit=0;p.requestMinutes=0;p.streaks.normal=0;
 for(const id of ids)p.methods[id]={...c.defaultMethod(d,p,id),timing:id==='target'?'kills-hour':'task-minutes',rate:id==='target'?60:id==='slow'?5:1};
 p.simulation={trials:100,seed:171,horizonOffers:100,sessionHours:10};
 return {d,p,main,larger,filler,entry};
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const code=buildSync({entryPoints:['src/ui/planner-ranking.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};
new Function('module','exports',code)(m,m.exports);const ui=m.exports;

test('rate ranking recommends the higher throughput master even when its target offers take longer',()=>{
 const {d,p,main,larger}=fixture(),quick=c.evaluate(d,main,p,[]),productive=c.evaluate(d,larger,p,[]);
 close(quick.hours*60,1);close(productive.hours*60,5);
 close(quick.targetKillsPerHour,10*60/11);close(productive.targetKillsPerHour,100*60/105);
 close(productive.objectiveValue,-productive.targetKillsPerHour);
 assert.equal(ui.recommendedPlan([quick,productive],p).master.id,'duradel');
 const waiting={...p,objective:'time'},byTime=[c.evaluate(d,main,waiting,[]),c.evaluate(d,larger,waiting,[])];
 assert.equal(ui.recommendedPlan(byTime,waiting).master.id,'nieve');
});

test('block search optimises target kills/hour rather than target chance',()=>{
 const {d,p,main,entry}=fixture();p.blockLimit=1;p.requestMinutes=1;
 main.tasks=[entry('target',1,10),entry('slow',1),entry('fast',3)];p.methods.slow.rate=20;p.methods.fast.rate=2;
 const rate=c.optimise(d,main,p),chance=c.optimise(d,main,{...p,objective:'chance'});
 assert.deepEqual(rate.blocks,['slow']);close(rate.targetKillsPerHour,30);
 assert.deepEqual(chance.blocks,['fast']);assert.ok(chance.chance>rate.chance);assert.ok(rate.targetKillsPerHour>chance.targetKillsPerHour);
});

test('rate search considers smaller block lists when all targets come through resets',()=>{
 const {d,p,main,filler,entry}=fixture();p.strategy='reset-turael';p.blockLimit=2;
 main.tasks=[entry('reset-a'),entry('reset-b')];filler.tasks=[entry('target',1,10)];
 assert.equal(c.evaluate(d,main,p,['reset-a','reset-b']).targetKillsPerHour,null);
 const best=c.optimise(d,main,p,100);assert.deepEqual(best.blocks,[]);assert.ok(best.targetKillsPerHour>0);assert.match(best.quality,/Exact enumeration/);
 const bounded=c.optimise(d,main,p,3);assert.deepEqual(bounded.blocks,[]);assert.ok(bounded.targetKillsPerHour>0);assert.ok(bounded.searchEvaluations<=3);assert.match(bounded.quality,/not a certified global optimum/);
});

test('rate objective uses the existing boost and reset cycle rates without replacing them with offer time',()=>{
 const {d,p,main}=fixture();
 for(const strategy of ['none','sustainable','funded','boost-turael','boost-mazchna','reset-turael']){
  const plan=c.evaluate(d,main,{...p,strategy},[]);assert.equal(plan.reason,'',strategy);assert.ok(plan.targetKillsPerHour>0,strategy);close(plan.objectiveValue,-plan.targetKillsPerHour);
 }
});

test('modifier-dependent and cape rates are not recommended, even when task offers have a valid estimate',()=>{
 const {d,p,main}=fixture(),valid=c.evaluate(d,main,p,[]),unsupported={...valid,master:{...main,id:'mortimer'},targetKillsPerHour:null,targetRateReason:'Modifier-dependent rate',objectiveValue:Infinity};
 assert.equal(ui.canRankPlan(unsupported,p),false);assert.equal(ui.recommendedPlan([unsupported,valid],p),valid);assert.equal(ui.recommendedPlan([unsupported],p),undefined);
 assert.equal(ui.canRankPlan(undefined,p),false);
 const capped=c.evaluate(d,main,{...p,cape:true},[]);assert.equal(capped.objectiveValue,Infinity);assert.equal(ui.canRankPlan(capped,p),false);
});

test('ranking selection persists in saved hunts and character exports; existing objectives retain their values',()=>{
 const {d,p,main}=fixture(),saved=c.saveHunt(p,'Rate hunt',main.id,'rate-hunt');
 const imported=c.importProfiles(d,c.exportProfiles([saved],saved.id)).profiles[0];assert.equal(imported.objective,'kills-hour');
 imported.objective='time';assert.equal(c.loadHunt(d,imported,'rate-hunt').profile.objective,'kills-hour');
 for(const objective of ['time','chance','points'])assert.equal(c.validateProfile(d,{...p,objective}).objective,objective);
 assert.throws(()=>c.validateProfile(d,{...p,objective:'invalid-rate'}),/Unknown objective/);
});

test('recommended-master metric highlights full-cycle target kills/hour with funded assumptions',()=>{
 const {d,p,main}=fixture(),plan=c.evaluate(d,main,p,[]),html=ui.renderRecommendationMetric(plan,p,()=>assert.fail('Must not format waiting time as the primary rate'));
 assert.match(html,/Target creatures killed per hour/);assert.match(html,/>54\.5<\/strong>/);assert.match(html,/including target combat and intervening tasks/);
 assert.match(ui.renderRecommendationMetric(plan,{...p,strategy:'funded'},()=>''),/unlimited-funds benchmark/);
 assert.match(ui.renderRecommendationMetric(plan,{...p,objective:'time'},()=>'<time>one minute</time>'),/Before target combat/);
});

test('the full-hunt action keeps rate-optimised blocks and simulates that plan instead of silently switching objectives',()=>{
 const {d,p,main,entry}=fixture();p.blockLimit=1;p.requestMinutes=1;main.tasks=[entry('target',1,10),entry('slow',1),entry('fast',3)];p.methods.slow.rate=20;p.methods.fast.rate=2;
 const progress=[],found=c.searchHunt(d,main,p,(done,total)=>progress.push(done/total));
 assert.deepEqual(found.plan.blocks,['slow']);close(found.plan.targetKillsPerHour,30);assert.equal(found.result.trials,100);
 assert.match(found.plan.quality,/ranking uses the analytical long-run rate/);assert.equal(progress.at(-1),1);assert.ok(progress.every((n,i)=>i===0||n>=progress[i-1]));
 assert.throws(()=>c.searchHunt(d,main,{...p,cape:true}),/Cape/);
});
