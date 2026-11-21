const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
function fixture(){const p=c.maxedProfile(d);p.assumeAllGear=false;p.combat.enabled=true;p.bank=c.emptyBank();for(const name of ['Dragon crossbow','Dragon bolts','Anti-dragon shield'])p.bank.manual[c.itemForLabel(name).id]=1;const aid='blue dragons',v=d.variants.find(v=>v.id==='blue-dragon'),method={...c.configuredMethod(d,p,aid,v.id),combatStyle:'ranged'};p.methods[aid+'::'+v.id]=method;return {p,aid,v,method};}
const ui=(name,globals={})=>{const code=buildSync({entryPoints:['src/ui/'+name+'.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};new Function('module','exports',...Object.keys(globals),code)(m,m.exports,...Object.values(globals));return m.exports;};
const renderer=ui('method-combat');
function controller(){const workers=[],urls=[];class Worker{constructor(url){this.url=url;workers.push(this);}postMessage(message){this.request=message;}terminate(){this.terminated=true;}}
 const URL={createObjectURL:()=>{const url='blob:test-'+urls.length;urls.push(url);return url;},revokeObjectURL:()=>{}};
 const {MethodPreview}=ui('method-preview',{Worker,URL});let changes=0;return {workers,urls,preview:new MethodPreview('synthetic source',()=>changes++,new c.CombatCacheStore()),changes:()=>changes};}
const fakeResult=method=>({...method,calculated:{ttk:20,dps:6.25,weaponId:21902},combatNote:'Calculated selected Blue dragon method.'});
function emit(worker,message){worker.onmessage({data:{id:worker.request.id,...message}});}

test('an editor-only Blue dragon method gets calculated even when the hunt targets Basilisk Knights',()=>{
 const {p,aid,v,method}=fixture(),before=JSON.stringify(p);assert.equal(p.goal.targets[0].variantId,'basilisk-knight');
 const result=c.calculateMethodPreview(d,p,aid,v.id);assert.ok(result.calculated,result.combatNote);assert.equal(result.variantId,v.id);assert.equal(result.combatStyle,'ranged');assert.equal(result.dps,method.dps);assert.equal(JSON.stringify(p),before);
 assert.deepEqual(result,c.withCalculatedTiming(p,v,method));
});
test('the selected-method worker calculates independently and reports progress without creating master plans',()=>{
 const {p,aid,v}=fixture(),messages=[],self={postMessage:m=>messages.push(m)},source=buildSync({entryPoints:['src/worker.ts'],bundle:true,write:false,format:'iife',platform:'browser'}).outputFiles[0].text;
 vm.runInNewContext(source,{self,structuredClone,console});self.onmessage({data:{id:44,kind:'method-timing',profile:p,assignmentId:aid,variantId:v.id}});
 assert.equal(messages.at(-1).kind,'method-timing');assert.ok(messages.at(-1).result.calculated);assert.ok(!messages.some(m=>['plans','plan-ready','error'].includes(m.kind)));
 const progress=messages.filter(m=>m.kind==='progress');assert.deepEqual(progress.map(m=>m.done),[0,1]);assert.ok(progress.every(m=>m.total===1&&m.current.includes('Blue dragon')));
 self.onmessage({data:{id:45,kind:'method-timing',profile:p,assignmentId:'basilisks',variantId:v.id}});assert.equal(messages.at(-1).kind,'error');assert.match(messages.at(-1).message,/belonging/);
});
test('disabled automatic timing, measured sources and manual overrides have their actual reasons',()=>{
 const {p,aid,v,method}=fixture();for(const [edit,pattern]of [[{timing:'kills-hour',rate:100},/Measured kills per hour/],[{timing:'task-minutes',rate:15},/Measured combat minutes/],[{manualCombat:true},/keep its manual DPS/]]){
 const configured={...method,...edit};p.methods[aid+'::'+v.id]=configured;const result=c.calculateMethodPreview(d,p,aid,v.id);assert.equal(result.calculated,undefined);assert.match(result.combatNote,pattern);
 }
 p.combat.enabled=false;assert.match(c.calculateMethodPreview(d,p,aid,v.id).combatNote,/Automatic combat timing is off/);
});
test('missing gear and boss limitations are reported instead of a fabricated manual-method message',()=>{
 const {p,aid,v}=fixture();delete p.bank.manual[c.itemForLabel('Anti-dragon shield').id];let result=c.calculateMethodPreview(d,p,aid,v.id);assert.equal(result.calculated,undefined);assert.match(result.combatNote,/Missing usable required/);
 const html=renderer.renderMethodCombatStatus(p,result,{pending:false,percent:100,current:v.name,resolved:result});assert.match(html,/Missing usable required/);assert.doesNotMatch(html,/A measured\/manual timing method is selected/);
 result=c.calculateMethodPreview(d,p,'hellhounds','cerberus');assert.equal(result.calculated,undefined);assert.match(result.combatNote,/Boss\/phase\/switch/);
});
test('method preview cache keys follow calculation inputs and do not depend on the current hunt',()=>{
 const {p,aid,method}=fixture(),original=c.methodPreviewKey(p,aid,method);p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];p.points=1;assert.equal(c.methodPreviewKey(p,aid,method),original);
 for(const edit of [{combatStyle:'magic'},{combatDefence:'prayer'},{location:'Ogre Enclave'},{stackSize:4},{manualCombat:true},{timing:'kills-hour',rate:90},{variantId:'baby-blue-dragon'}])assert.notEqual(c.methodPreviewKey(p,aid,{...method,...edit}),original);
 p.levels.ranged=90;assert.notEqual(c.methodPreviewKey(p,aid,method),original);
});
test('changing the selected variant cancels old work and ignores stale completion and progress',()=>{
 const {p,aid,v,method}=fixture(),t=controller();assert.equal(t.preview.get(p,aid,v,method).pending,true);const old=t.workers[0];
 const changed={...method,combatStyle:'magic'};t.preview.get(p,aid,v,changed);assert.ok(old.terminated);const current=t.workers[1];
 emit(old,{kind:'method-timing',result:fakeResult(method)});assert.equal(t.preview.get(p,aid,v,changed).pending,true);
 emit(current,{kind:'progress',done:1,total:2,current:'Blue dragon / selected method'});assert.equal(t.preview.get(p,aid,v,changed).percent,50);
 emit(current,{kind:'method-timing',result:fakeResult(changed)});const ready=t.preview.get(p,aid,v,changed);assert.equal(ready.pending,false);assert.equal(ready.resolved.combatStyle,'magic');assert.equal(ready.resolved.calculated.dps,6.25);assert.equal(t.workers.length,2);
});
test('a completed method is reused across hunt changes without restarting the worker',()=>{
 const {p,aid,v,method}=fixture(),t=controller();t.preview.get(p,aid,v,method);emit(t.workers[0],{kind:'method-timing',result:fakeResult(method)});
 p.goal.quantity=900;p.points=700;t.preview.get(p,aid,v,method);assert.equal(t.workers.length,1);assert.equal(t.preview.get(p,aid,v,method).resolved.calculated.dps,6.25);
 p.bank.manual[c.itemForLabel('Dragon bolts').id]=0;t.preview.get(p,aid,v,method);assert.equal(t.workers.length,2);
});
test('cancellation, worker errors and retry have local states rather than endless loading',()=>{
 const {p,aid,v,method}=fixture(),t=controller();t.preview.get(p,aid,v,method);t.preview.cancel();let status=t.preview.get(p,aid,v,method);assert.equal(status.pending,false);assert.match(status.error,/cancelled/);assert.equal(t.workers.length,1);
 t.preview.retry();t.preview.get(p,aid,v,method);emit(t.workers[1],{kind:'error',message:'Synthetic calculation failed'});status=t.preview.get(p,aid,v,method);assert.match(status.error,/Synthetic/);assert.equal(status.pending,false);assert.equal(t.workers.length,2);
 assert.match(renderer.renderMethodCombatStatus(p,method,status),/Retry method calculation/);
 t.preview.retry();t.preview.get(p,aid,v,method);t.workers[2].onerror();assert.equal(t.preview.get(p,aid,v,method).pending,false);
});
test('leaving a pending editor request terminates it and allows a fresh request on return',()=>{
 const {p,aid,v,method}=fixture(),t=controller();t.preview.get(p,aid,v,method);t.preview.deactivate();assert.ok(t.workers[0].terminated);emit(t.workers[0],{kind:'method-timing',result:fakeResult(method)});assert.equal(t.changes(),0);
 assert.equal(t.preview.get(p,aid,v,method).pending,true);assert.equal(t.workers.length,2);
});
test('known manual/measured/disabled modes resolve immediately without a worker',()=>{
 const {p,aid,v,method}=fixture(),t=controller();for(const m of [{...method,manualCombat:true},{...method,timing:'kills-hour',rate:100}]){
 const status=t.preview.get(p,aid,v,m);assert.equal(status.pending,false);assert.ok(status.resolved.combatNote);assert.equal(t.workers.length,0);
 }p.combat.enabled=false;t.preview.get(p,aid,v,method);assert.equal(t.workers.length,0);
});
test('the selected-method card shows its calculated DPS and progress rather than unrelated master status',()=>{
 const {p,method}=fixture();let html=renderer.renderMethodCombatStatus(p,method,{pending:true,percent:42,current:'Blue dragon'});assert.match(html,/42%/);assert.match(html,/Calculating selected method/);assert.doesNotMatch(html,/manual timing method is selected/);
 html=renderer.renderMethodCombatStatus(p,method,{pending:false,percent:100,current:'Blue dragon',resolved:fakeResult(method)});assert.match(html,/6\.250 DPS/);assert.match(html,/20\.00 seconds/);assert.match(html,/Dragon_crossbow/);
 html=renderer.renderMethodCombatStatus(p,{...method,manualCombat:true},{pending:false,percent:100,current:'Blue dragon'});assert.match(html,/Manual DPS override retained/);assert.match(html,/Use calculated DPS/);
});

test('cancelling unrelated planner work cannot turn an already-ready method into an error',()=>{
 const {p,aid,v,method}=fixture(),t=controller();t.preview.get(p,aid,v,method);emit(t.workers[0],{kind:'method-timing',result:fakeResult(method)});t.preview.cancel();const status=t.preview.get(p,aid,v,method);assert.equal(status.error,undefined);assert.equal(status.resolved.calculated.dps,6.25);assert.equal(t.workers.length,1);
});
