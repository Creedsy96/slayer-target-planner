const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
function moduleAt(file,globals={}){const m={exports:{}},code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;new Function('module','exports',...Object.keys(globals),code)(m,m.exports,...Object.values(globals));return m.exports;}
const turn=()=>new Promise(resolve=>setTimeout(resolve,5));
async function until(predicate){for(let i=0;i<200;i++){if(predicate())return;await turn();}assert.fail('Expected asynchronous response');}
function harness(cache){
 const native=[];class Worker{constructor(){native.push(this);}postMessage(r){this.request=r;}terminate(){this.stopped=true;}}
 const {CalculationWorker}=moduleAt('src/ui/calculation-worker.ts',{Worker,URL:{createObjectURL:()=> 'fixture:worker',revokeObjectURL(){}}});
 const proxy=new CalculationWorker('fixture',cache,20),messages=[];proxy.onmessage=e=>messages.push(e.data);return {proxy,native,messages};
}
const request=()=>({id:1,kind:'plans',profile:c.maxedProfile(d)});
test('a stuck saved-result lookup starts exactly one live worker and ignores a late cache hit',async()=>{
 let release;const cache={available:true,load:()=>new Promise(resolve=>release=resolve),combat:async()=>{throw Error('must not restore after deadline');}};
 const h=harness(cache);h.proxy.postMessage(request());await until(()=>h.native.length);
 assert.match(h.messages[0].current,/timed out/);assert.equal(h.native.length,1);
 release([{id:1,kind:'plans',plans:[]}]);await turn();assert.equal(h.messages.some(m=>m.kind==='plans'),false);assert.equal(h.native.length,1);h.proxy.terminate();
});
test('the deadline also covers combat-cache lookup; cancellation prevents a delayed fallback',async()=>{
 const cache={available:true,load:async()=>undefined,combat:()=>new Promise(()=>{})};
 const h=harness(cache);h.proxy.postMessage(request());await until(()=>h.native.length);assert.equal(h.native.length,1);h.proxy.terminate();
 const cancelled=harness(cache);cancelled.proxy.postMessage(request());cancelled.proxy.terminate();await new Promise(resolve=>setTimeout(resolve,40));assert.equal(cancelled.native.length,0);assert.equal(cancelled.messages.length,0);
});
test('completed results are displayed even if saving the result never resolves',async()=>{
 let saving=false;const cache={available:true,load:async()=>undefined,combat:async()=>undefined,save:()=>{saving=true;return new Promise(()=>{});}};
 const h=harness(cache);h.proxy.postMessage(request());await until(()=>h.native.length);
 void h.native[0].onmessage({data:{id:1,kind:'plans',plans:[]}});
 await until(()=>h.messages.some(m=>m.kind==='plans'));assert.equal(saving,true);h.proxy.terminate();
});
test('progress storms are coalesced and the latest progress precedes completion',()=>{
 const {workerPublisher}=moduleAt('src/worker-messages.ts'),out=[];let now=0;
 const publish=workerPublisher(m=>out.push(m),()=>now,50);
 for(let i=0;i<1000;i++){now=i/100;publish({kind:'progress',done:i,total:1001,current:'Creature '+i});}
 publish({kind:'combat-cache',key:'finished search'});publish({kind:'plans',plans:[]});
 assert.equal(out.filter(m=>m.kind==='progress').length,2);assert.equal(out.at(-2).done,999);assert.equal(out.at(-1).kind,'plans');assert.equal(out.filter(m=>m.kind==='combat-cache').length,1);
});
test('master results carry block explanations and review totals calculated in the worker',()=>{
 const p=c.maxedProfile(d);p.combat.enabled=false;p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];
 const source=buildSync({entryPoints:['src/worker.ts'],bundle:true,write:false,format:'iife',platform:'browser'}).outputFiles[0].text;
 const messages=[],self={postMessage:m=>messages.push(m)};vm.runInNewContext(source,{self,structuredClone,console});self.onmessage({data:{id:7,kind:'plans',profile:p}});
 const result=messages.find(m=>m.kind==='plans');assert.ok(result,JSON.stringify(messages.find(m=>m.kind==='error')));
 for(const plan of result.plans){
  assert.deepEqual(structuredClone(plan.review.impacts),structuredClone(c.blockImpacts(d,plan,p)));
  const {added,removed,cost,minutesSaved,chanceGain}=c.blockPreview(d,plan,p);
  assert.deepEqual(structuredClone(plan.review.blocks),structuredClone({added,removed,cost,minutesSaved,chanceGain}));
 }
 const {renderBlockChanges}=moduleAt('src/ui/hunt-tools.ts');const plan=result.plans.find(p=>p.blocks.length);
 assert.ok(renderBlockChanges(d,plan,p).includes(plan.review.blocks.cost+' points'));
});
test('recording a reviewed task reuses its prepared row without another equipment search',()=>{
 const p=c.maxedProfile(d);p.assumeAllGear=false;p.bank=c.emptyBank();p.bank.manual[4151]=1;p.points=1000;p.streaks.normal=9;
 const original=d.masters.find(m=>m.id==='nieve'),master={...original,tasks:original.tasks.filter(t=>t.id==='hellhounds')},data={...d,masters:d.masters.map(m=>m.id===master.id?master:m)};
 const row=c.prepareRows(data,master,p)[0],input={masterId:master.id,assignmentId:row.id,action:'complete',modifier:'none',modifierPoints:0,combatMinutes:null,kills:null};
 const expected=c.recordTask(data,p,input,'2026-11-22T19:00:00Z','test');c.clearCombatCache();let searches=0;c.observeCombatCache(()=>searches++);
 try{assert.deepEqual(c.recordTask(data,p,input,'2026-11-22T19:00:00Z','test',row),expected);assert.equal(searches,0);}finally{c.observeCombatCache(undefined);c.clearCombatCache();}
});
