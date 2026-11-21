// These fixtures exercise recorded equipment/manual timing rather than the all-gear preset.
function ownedScenario(data){const p=c.maxedProfile(data);p.assumeAllGear=false;p.combat.enabled=false;return p;}
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
const workerSource=buildSync({entryPoints:['src/worker.ts'],bundle:true,write:false,format:'iife',platform:'browser'}).outputFiles[0].text;
function profile(){const p=ownedScenario(d);p.bank=c.emptyBank();p.combat={...c.defaultCombat(),enabled:true};p.bank.manual[c.itemForLabel('Abyssal whip').id]=1;p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];return p;}
function run(p,snapshot,guide,interrupt=false){
 const messages=[],store=new c.CombatCacheStore(),identity=c.combatIdentity(p);
 if(snapshot)store.restore(identity,snapshot);
 const self={postMessage(message){messages.push(structuredClone(message));if(message.kind==='combat-cache'){store.put(identity,message.key,message.result);if(interrupt)throw Error('Test interruption');}}};
 vm.runInNewContext(workerSource,{self,structuredClone,console});self.onmessage({data:{id:1,kind:'plans',profile:p,combatCache:snapshot,guide}});
 return {messages,snapshot:store.snapshot(identity),final:messages.find(message=>message.kind==='plans')};
}
function target(p,assignmentId,variantId){const copy=structuredClone(p);copy.goal.targets=[{assignmentId,variantId,priority:1}];return copy;}

test('new worker after a target change reuses completed searches and gives the same plans as a cold run',t=>{
 const p=profile(),cold=run(p),q=target(p,'gargoyles','gargoyle'),warm=run(q,cold.snapshot),fresh=run(q);
 assert.ok(cold.final.combatCalculated>0);assert.ok(warm.final.combatRestored>0);
 const newSearches=warm.messages.filter(m=>m.kind==='combat-cache');
 // Removing the hellhound goal lets its completion method choose another variant.
 const fallback=fresh.final.plans.flatMap(plan=>plan.rows).find(row=>row.id==='hellhounds'&&!row.isTarget).variant.id;
 assert.deepEqual([...new Set(newSearches.map(m=>JSON.parse(m.key)[0]))],[fallback]);assert.ok(warm.final.combatCalculated<cold.final.combatCalculated/10);
 const back=run(p,warm.snapshot);assert.equal(back.final.combatCalculated,0);t.diagnostic('Combat searches: cold '+cold.final.combatCalculated+', target switch '+warm.final.combatCalculated+', switch back '+back.final.combatCalculated+'.');
 assert.deepEqual(warm.final.plans,fresh.final.plans);assert.equal(c.combatIdentity(p),c.combatIdentity(q));
 assert.equal(warm.messages.some(m=>m.kind==='priority-gear'),false);
});

test('changing back to a previously calculated guide style reuses the semantic combat key',()=>{
 c.clearCombatCache();const p=profile(),record=g.GUIDE.records.hellhound,state={...g.defaultGuideState(),variantId:record.id,formId:record.defaultForm,approach:'melee-prayer'},form=g.guideForm(record,state),location=g.selectedLocation(record,form,state);let searches=0;
 c.observeCombatCache(()=>searches++);
 try{
  const a=c.bestOwnedGear(p,record,form,state,location),b=c.bestOwnedGear(p,record,form,{...state,approach:'melee-tank'},location,'prayer');
  assert.equal(searches,1);assert.deepEqual(a,b);
  c.bestOwnedGear(p,record,form,{...state,approach:'melee-tank'},location,'tank');assert.equal(searches,2);
 }finally{c.observeCombatCache(undefined);c.clearCombatCache();}
});

test('completed search messages survive cancellation and are reusable by the replacement worker',()=>{
 const p=profile(),partial=run(p,undefined,undefined,true);assert.ok(partial.snapshot.entries.length>0);assert.equal(partial.final,undefined);
 const q=target(p,'gargoyles','gargoyle'),warm=run(q,partial.snapshot),cold=run(q);
 assert.ok(warm.final.combatCalculated<cold.final.combatCalculated);assert.deepEqual(warm.final.plans,cold.final.plans);
});

test('inventory and skill changes reject old snapshots and agree with a cold calculation',()=>{
 const p=profile(),saved=run(p).snapshot;
 for(const mutate of [q=>q.levels.strength=70,q=>q.bank.manual[c.itemForLabel('Dragon boots').id]=1]){
  const q=structuredClone(p);mutate(q);const restored=run(q,saved),cold=run(q);
  assert.equal(restored.final.combatRestored,0);assert.ok(restored.final.combatCalculated>0);assert.deepEqual(restored.final.plans,cold.final.plans);
 }
});

test('combat settings, relevant diaries and quest imports change cache identity while hunt-only settings do not',()=>{
 const p=profile(),identity=c.combatIdentity(p);
 for(const mutate of [q=>q.combat.spellbook='standard',q=>q.combat.potions='standard',q=>q.combat.prayer='standard',q=>q.diaries.kourend=0,q=>q.quests['Desert Treasure I']=0,q=>q.questImport={states:{'Desert Treasure I':0}}]){
  const q=structuredClone(p);mutate(q);assert.notEqual(c.combatIdentity(q),identity);
 }
 const q=structuredClone(p);q.points=100;q.strategy='funded';q.methods.hellhounds={...c.defaultMethod(d,q,'hellhounds'),combatStyle:'melee'};q.goal.quantity=30;q.name='Renamed';assert.equal(c.combatIdentity(q),identity);
});

test('cache remains bounded with LRU eviction and callers cannot mutate stored results',()=>{
 const store=new c.CombatCacheStore(2,2),value=c.emptyCombat('Fixture');store.put('a','one',value);store.put('a','two',value);store.get('a','one');store.put('a','three',value);
 assert.equal(store.get('a','two'),undefined);assert.equal(store.snapshot('a').entries.length,2);
 const copy=store.get('a','one');copy.reason='mutated';assert.equal(store.get('a','one').reason,'Fixture');
 const snapshot=store.snapshot('a');snapshot.entries[0][1].reason='changed';assert.equal(store.get('a','three').reason,'Fixture');
 store.put('b','one',value);store.get('a','one');store.put('c','one',value);assert.equal(store.snapshot('b').entries.length,0);
 store.restore('c',store.snapshot('a'));assert.equal(store.get('c','three'),undefined);store.clear();assert.equal(store.snapshot('a').entries.length,0);
});
