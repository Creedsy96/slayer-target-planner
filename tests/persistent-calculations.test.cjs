const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
function moduleAt(file,globals={}){const m={exports:{}},code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;new Function('module','exports',...Object.keys(globals),code)(m,m.exports,...Object.values(globals));return m.exports;}
const {CalculationCache,calculationInputs,canonical}=moduleAt('src/state/calculation-cache.ts');
class MemoryStorage{
 rows=new Map();async read(key){return structuredClone(this.rows.get(key)?.value);}
 async write(row){this.rows.set(row.key,structuredClone(row));}
 async context(key){return [...this.rows.values()].filter(r=>r.context===key).map(r=>structuredClone(r.value));}
 async removeOwner(id){for(const [key,row]of this.rows)if(row.owner===id)this.rows.delete(key);}
}
function fixture(kind='plans'){
 const p=c.newCharacter(d,'Cache QA',false);p.negativeUnknowns=true;p.bank=c.emptyBank();p.levels={attack:70,strength:70,defence:70,ranged:70,magic:70,prayer:70,hitpoints:70,slayer:70,combat:100};
 return {id:4,kind,profile:p,guide:{variantId:'hellhound',assignmentId:'hellhounds',approach:'ranged-tank',formId:'0',priority:'balanced',onTask:true,fastTravel:false,location:''},variantId:'hellhound',variantIds:[],guideFirst:false};
}
const planResult={id:4,kind:'plans',plans:d.masters.map(master=>({master:{id:master.id},rows:[],objectiveValue:Infinity}))};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){for(let n=0;n<400;n++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,5));}assert.fail('Expected asynchronous cache/worker result.');}
function workerHarness(cache){const native=[];class Worker{constructor(){native.push(this);}postMessage(m){this.request=m;}terminate(){this.stopped=true;}}
 const URL={createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}};
 const {CalculationWorker}=moduleAt('src/ui/calculation-worker.ts',{Worker,URL});
 const messages=[],proxy=new CalculationWorker('synthetic source',cache);proxy.onmessage=e=>messages.push(e.data);return {proxy,native,messages};}

test('complete plans survive a new cache instance and preserve Infinity without rerunning a CPU worker',async()=>{
 const storage=new MemoryStorage(),request=fixture(),a=new CalculationCache(storage,'version-a');await a.save(request,[planResult]);
 const b=new CalculationCache(storage,'version-a'),h=workerHarness(b);h.proxy.postMessage({...request,id:9});await until(()=>h.messages.length);
 assert.equal(h.native.length,0);assert.equal(h.messages[0].fromCache,true);assert.equal(h.messages[0].id,9);assert.equal(h.messages[0].plans[0].objectiveValue,Infinity);
 assert.equal(await new CalculationCache(storage,'version-b').load(request),undefined);
});

test('hunt, gear, setup and simulation changes invalidate relevant jobs while cosmetic and export metadata changes do not',async()=>{
 const cache=new CalculationCache(new MemoryStorage(),'one'),r=fixture(),original=await cache.key(r),p=r.profile;
 p.name='Renamed';p.notes=['cosmetic'];p.setup={version:2,step:6,complete:true,imports:[],tutorial:'complete'};p.questImport={states:{},at:'later'};p.bank.snapshots.bank={items:{},account:'Cache QA',at:'later',label:'new file'};
 assert.equal(await cache.key(r),original);
 for(const mutate of [q=>q.profile.levels.ranged++,q=>q.profile.combat={...c.defaultCombat(),potions:'standard'},q=>q.profile.bank.manual[9185]=1,q=>q.profile.goal.quantity++,q=>q.profile.simulation.seed++,q=>q.profile.strategy='funded',q=>q.profile.gearOverrides={hellhound:{ranged:{weapon:9185}}},q=>q.profile.bank.snapshots.bank.travelItems={2552:1}]){const q=structuredClone(r);mutate(q);assert.notEqual(await cache.key(q),original);}
 const other=structuredClone(r);other.guide.variantId='blue-dragon';other.variantId='blue-dragon';other.guideFirst=true;other.id=91;assert.equal(await cache.key(other),original);
});

test('combat evidence follows effective equipment and quest facts instead of bank filenames, timestamps or quantities',()=>{
 const r=fixture(),p=r.profile;p.bank.snapshots.bank={items:{4151:1},account:'A',at:'old',label:'old'};p.quests['Desert Treasure I']=2;const before=c.combatIdentity(p);
 p.bank.snapshots.bank.at='new';p.bank.snapshots.bank.account='B';p.bank.snapshots.bank.items[4151]=100;p.questImport={states:{'Desert Treasure I':0}};assert.equal(c.combatIdentity(p),before);
 p.bank.snapshots.bank.items[4151]=0;assert.notEqual(c.combatIdentity(p),before);
});

test('guide and method keys ignore hunt-only edits but include selected creature, overrides, travel and protection facts',async()=>{
 const cache=new CalculationCache(new MemoryStorage(),'one'),r=fixture('gear'),key=await cache.key(r);r.profile.points=900;r.profile.goal.quantity=900;r.profile.strategy='funded';assert.equal(await cache.key(r),key);
 r.guide.approach='magic-prayer';assert.notEqual(await cache.key(r),key);
 const method=fixture('method-timing');method.assignmentId='hellhounds';const mk=await cache.key(method);method.profile.goal.quantity=99;assert.equal(await cache.key(method),mk);method.profile.methods.hellhounds={...c.defaultMethod(d,method.profile,'hellhounds'),variantId:'hellhound',manualCombat:true};assert.notEqual(await cache.key(method),mk);
});

test('a changed target restores saved individual combat results before computing its new plan',async()=>{
 const storage=new MemoryStorage(),cache=new CalculationCache(storage,'one'),r=fixture();await cache.saveCombat(r.profile,'hellhound-key',c.emptyCombat('saved fixture'));
 const h=workerHarness(new CalculationCache(storage,'one'));h.proxy.postMessage(r);await until(()=>h.native.length);
 assert.equal(h.native[0].request.combatCache.entries.length,1);assert.equal(h.native[0].request.combatCache.entries[0][0],'hellhound-key');
 await h.native[0].onmessage({data:planResult});assert.equal(h.messages.at(-1).kind,'plans');assert.ok(await new CalculationCache(storage,'one').load(r));
});

test('cancellation during a storage read ignores stale cached results without spawning a worker',async()=>{
 const storage=new MemoryStorage(),r=fixture(),cache=new CalculationCache(storage,'one');await cache.save(r,[planResult]);let finish;storage.read=()=>new Promise(resolve=>finish=resolve);
 const h=workerHarness(cache);h.proxy.postMessage(r);await until(()=>finish);h.proxy.terminate();finish({messages:[planResult],guide:canonical(r.guide)});await turn();assert.equal(h.native.length,0);assert.equal(h.messages.length,0);
});

test('failed storage falls back to computation and reports the saving limitation; failures never become cached success',async()=>{
 const storage=new MemoryStorage();storage.read=async()=>{throw Error('quota/permission fixture');};const cache=new CalculationCache(storage,'one'),h=workerHarness(cache),r=fixture();h.proxy.postMessage(r);await until(()=>h.native.length);assert.match(cache.warning,/unavailable/);assert.equal(cache.available,false);
 await h.native[0].onmessage({data:{id:r.id,kind:'error',message:'Synthetic error'}});assert.equal(h.messages.at(-1).kind,'error');assert.equal(storage.rows.size,0);
 const clean=new CalculationCache(new MemoryStorage(),'one');await clean.save(r,[{id:4,kind:'error',message:'No'}]);assert.equal(await clean.load(r),undefined);
});

test('a cached priority guide is never replayed into a different selected creature',async()=>{
 const storage=new MemoryStorage(),cache=new CalculationCache(storage,'one'),r=fixture();const priority={id:4,kind:'priority-gear',result:{styles:{melee:{supported:false},ranged:{supported:false},magic:{supported:false}}}};await cache.save(r,[priority,planResult]);
 assert.equal((await cache.load(r)).length,2);r.guide.variantId='blue-dragon';r.variantId='blue-dragon';assert.deepEqual((await cache.load(r)).map(m=>m.kind),['plans']);
});

test('character deletion removes its durable results and retains other characters; malformed saved records are ignored',async()=>{
 const storage=new MemoryStorage(),cache=new CalculationCache(storage,'one'),a=fixture(),b=structuredClone(a);b.profile.id='another';await cache.save(a,[planResult]);await cache.save(b,[planResult]);await cache.removeCharacter(a.profile.id);assert.equal(await cache.load(a),undefined);assert.ok(await cache.load(b));
 storage.rows.set(await cache.key(a),{value:{messages:[{kind:'plans',plans:[null]}]}});assert.equal(await cache.load(a),undefined);assert.equal(cache.available,true);
});


test('deletion invalidates pending cache writes without preventing later undo/recalculation',async()=>{
 const storage=new MemoryStorage(),cache=new CalculationCache(storage,'one'),r=fixture();let release;
 const actualKey=cache.key.bind(cache);cache.key=()=>new Promise(resolve=>release=resolve);
 const pending=cache.save(r,[planResult]);await cache.removeCharacter(r.profile.id);release('pending-old-job');await pending;assert.equal(storage.rows.size,0);
 cache.key=actualKey;await cache.save(r,[planResult]);assert.ok(await cache.load(r));
 const combat=cache.saveCombat(r.profile,'pending-combat',c.emptyCombat('fixture'));await cache.removeCharacter(r.profile.id);await combat;assert.equal(storage.rows.size,0);
});
