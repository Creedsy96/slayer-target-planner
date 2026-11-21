const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs');
const uiCode=buildSync({entryPoints:['src/ui/task-extensions.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,uiModule={exports:{}};
new Function('module','exports',uiCode)(uiModule,uiModule.exports);const ui=uiModule.exports;
function fixture(){
 const source={title:'Independent extension fixture',url:'https://example.test',revision:1},ids=['target','slow','fast','other'];
 const entry=(id)=>({id,weight:1,minimum:10,maximum:10,extendedMin:20,extendedMax:20,requirements:[],source});
 const main={id:'nieve',name:'Main',group:'nieve',legacyIds:[],blockCost:90,skipCost:30,basePoints:15,streakGroup:'normal',requirements:[],source,tasks:[entry('target'),entry('slow')]};
 const filler={...main,id:'turael',name:'Turael',group:'beginner',basePoints:0,tasks:[entry('fast')]},mazchna={...filler,id:'mazchna',name:'Mazchna',group:'mazchna'};
 const d={schemaVersion:2,version:'extension-test',captured:'test',masters:[main,filler,mazchna],assignments:ids.map(id=>({id,name:id,variantIds:[id],source})),variants:ids.map(id=>({id,name:id,assignmentIds:[id],hp:60,multiplier:1,requirements:[],source,status:'fixture',drops:[]})),quests:[],unlocks:{},sources:[source],audit:[],attribution:''};
 const p=c.newProfile(d);p.goal.targets=[{assignmentId:'target',variantId:'target',priority:1}];p.strategy='none';p.objective='kills-hour';p.assumeUnknown=false;p.blockLimit=1;p.requestMinutes=1;p.streaks.normal=0;
 for(const id of ids)p.methods[id]={...c.defaultMethod(d,p,id),timing:'kills-hour',rate:id==='slow'?30:60,travel:id==='target'?2:0};
 return {d,p,main,filler,entry};
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('extension comparison uses full combat cycles, not doubled kills at the old task duration',()=>{
 const {d,p,main}=fixture(),before=JSON.stringify(p),plan=c.evaluate(d,main,p,[]),[x]=c.compareTargetExtensions(d,plan,p);
 close(x.normalRate,300/17);close(x.extendedRate,600/22);assert.ok(x.extendedRate<x.normalRate*2);
 assert.deepEqual(x.quantities[0].normal,[10,10]);assert.deepEqual(x.quantities[0].extended,[20,20]);assert.equal(x.enabled,false);
 assert.equal(JSON.stringify(p),before);assert.equal(plan.rows[0].method.extended,false);
 assert.match(ui.extensionDifference(x),/\+9\.6 KPH \(\+54\.5%\)/);
});
test('comparison holds the selected block list and other target extensions fixed',()=>{
 const {d,p,main,entry}=fixture();main.tasks.push(entry('other'));p.goal.targets.push({assignmentId:'other',variantId:'other',priority:1});c.setTaskExtension(p,'other',true);
 const plan=c.evaluate(d,main,p,['slow']),xs=c.compareTargetExtensions(d,plan,p);assert.equal(xs.length,2);
 const normal=c.clone(p),extended=c.clone(p);c.setTaskExtension(normal,'target',false);c.setTaskExtension(extended,'target',true);
 close(xs[0].normalRate,c.evaluate(d,main,normal,['slow']).targetKillsPerHour);close(xs[0].extendedRate,c.evaluate(d,main,extended,['slow']).targetKillsPerHour);
 assert.deepEqual(plan.blocks,['slow']);assert.equal(p.extensions.other,true);assert.equal(p.extensions.target,undefined);
});
test('assignment purchase overrides conflicting legacy variants across masters and automatic methods',()=>{
 const {d,p,main}=fixture();const variant={...d.variants[0],id:'target-small',hp:5};d.variants.push(variant);d.assignments[0].variantIds.push(variant.id);
 p.methods['target::target-small']={...p.methods.target,variantId:variant.id,extended:false};c.setTaskExtension(p,'target',true);
 assert.ok(c.prepareRows(d,main,p).find(r=>r.id==='target').method.extended);
 p.goal.targets=[];delete p.methods.target;assert.ok(c.prepareRows(d,main,p).find(r=>r.id==='target').method.extended);
 c.setTaskExtension(p,'target',false);assert.equal(p.methods['target::target-small'].extended,false);
 assert.equal(c.prepareRows(d,main,p).find(r=>r.id==='target').method.extended,false);
});
test('legacy method settings survive until an explicit assignment extension is recorded',()=>{
 const {d,p,main}=fixture();p.methods.target.extended=true;
 assert.equal(c.compareTargetExtensions(d,c.evaluate(d,main,p,[]),p)[0].enabled,true);
 c.setTaskExtension(p,'target',false);assert.equal(c.compareTargetExtensions(d,c.evaluate(d,main,p,[]),p)[0].enabled,false);
});
test('all strategies compare the same extension in the real cycle model, including filler-only targets',()=>{
 for(const strategy of ['none','sustainable','funded','boost-turael','boost-mazchna','reset-turael']){
  const {d,p,main}=fixture();p.strategy=strategy;
  const [x]=c.compareTargetExtensions(d,c.evaluate(d,main,p,[]),p),q=c.clone(p);c.setTaskExtension(q,'target',true);
  close(x.extendedRate,c.evaluate(d,main,q,[]).targetKillsPerHour);assert.ok(x.extendedRate>=x.normalRate,strategy);
 }
 for(const strategy of ['boost-turael','reset-turael']){
  const {d,p,main,filler,entry}=fixture();p.strategy=strategy;main.tasks=[entry('slow')];filler.tasks=[entry('target')];
  const [x]=c.compareTargetExtensions(d,c.evaluate(d,main,p,[]),p);assert.equal(x.quantities[0].master,'Turael');assert.ok(x.extendedRate>x.normalRate);
 }
});
test('whole-task measured durations and unsupported rates do not manufacture extension recommendations',()=>{
 const {d,p,main}=fixture();p.methods.target.timing='task-minutes';p.methods.target.rate=10;
 let [x]=c.compareTargetExtensions(d,c.evaluate(d,main,p,[]),p);assert.equal(x.extendedRate,null);assert.match(x.reason,/separate extended-task measurement/);
 p.methods.target.timing='kills-hour';p.methods.target.rate=60;p.cape=true;
 [x]=c.compareTargetExtensions(d,c.evaluate(d,main,p,[]),p);assert.equal(x.extendedRate,null);assert.match(x.reason,/Cape/);
});
test('zero gain and masters without extension ranges are explained without false advice',()=>{
 const {d,p,main}=fixture();p.requestMinutes=0;p.methods.target.travel=0;main.tasks=main.tasks.slice(0,1);
 let plan=c.withExtensionComparisons(d,c.evaluate(d,main,p,[]),p);close(plan.extensions[0].normalRate,60);close(plan.extensions[0].extendedRate,60);
 assert.match(ui.renderExtensionAdvice(d,plan,p),/No KPH improvement/);assert.doesNotMatch(ui.renderExtensionAdvice(d,plan,p),/Recommended: extend/);
 main.tasks[0].extendedMin=main.tasks[0].extendedMax=0;plan=c.withExtensionComparisons(d,c.evaluate(d,main,p,[]),p);
 assert.match(plan.extensions[0].reason,/No target-task extension/);assert.equal(plan.extensions[0].extendedRate,null);
});
test('extension status round-trips exports and saved hunts, rejects bad maps and leaves combat identity intact',()=>{
 const {d,p,main}=fixture();const identity=c.combatIdentity(p);c.setTaskExtension(p,'target',true);assert.equal(c.combatIdentity(p),identity);
 const saved=c.saveHunt(p,'Extended hunt',main.id,'extension-hunt'),imported=c.importProfiles(d,c.exportProfiles([saved],saved.id)).profiles[0];
 c.setTaskExtension(imported,'target',false);assert.equal(c.loadHunt(d,imported,'extension-hunt').profile.extensions.target,true);
 delete imported.huntPresets[0].extensions;assert.equal(c.loadHunt(d,imported,'extension-hunt').profile.extensions,undefined);
 for(const extensions of [[],null,{target:1},{missing:true}])assert.throws(()=>c.validateProfile(d,{...p,extensions}),/Invalid task extensions/);
});
test('UI shows recorded state, both rates and an actionable recommendation without claiming a purchase',()=>{
 const {d,p,main}=fixture();const plan=c.withExtensionComparisons(d,c.evaluate(d,main,p,[]),p),controls=ui.renderTargetExtensions(d,p),advice=ui.renderExtensionAdvice(d,plan,p);
 assert.match(controls,/aria-pressed="false"/);assert.match(controls,/Not extended/);assert.match(controls,/no Slayer points are spent here/);
 assert.match(advice,/17\.6 KPH/);assert.match(advice,/27\.3 KPH/);assert.match(advice,/Recommended: extend this task in game/);assert.match(advice,/Same blocks/);
 c.setTaskExtension(p,'target',true);assert.match(ui.renderTargetExtensions(d,p),/aria-pressed="true"/);
 assert.match(ui.renderExtensionAdvice(d,c.withExtensionComparisons(d,c.evaluate(d,main,p,[]),p),p),/already enabled/);
});
