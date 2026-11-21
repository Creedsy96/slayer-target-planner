const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
const item=name=>{const value=c.itemForLabel(name);assert.ok(value,name);return value;};
function fixture(names,variant='hellhound',family='melee'){
 const p=c.maxedProfile(d);p.assumeAllGear=false;p.bank=c.emptyBank();p.combat={...c.defaultCombat(),enabled:true};p.blockLimit=0;
 for(const name of names)p.bank.manual[item(name).id]=1;
 const record=g.GUIDE.records[variant],state={...g.defaultGuideState(),variantId:variant,formId:record.defaultForm,approach:family+'-tank'},form=g.guideForm(record,state);
 p.goal.targets=[{assignmentId:record.assignmentIds[0],variantId:variant,priority:1}];
 const best=()=>c.bestOwnedGear(p,record,form,state,g.selectedLocation(record,form,state,p));
 const select=(name,slot='weapon',ammo)=>c.selectCreatureGear(d,p,state,best(),{family,slot,id:item(name).id,ammoId:ammo?item(ammo).id:undefined});
 return {p,state,record,form,best,select};
}
test('selecting a downgrade holds it through optimisation, changes task time, and allows upgrade/reset',()=>{
 const t=fixture(['Abyssal whip','Dragon scimitar']);const original=t.best();assert.equal(original.loadout.weapon,item('Abyssal whip').id);
 const aid=t.record.assignmentIds[0],before=c.calculateMethodPreview(d,t.p,aid,t.record.id);
 t.select('Dragon scimitar');const downgraded=t.best(),after=c.calculateMethodPreview(d,t.p,aid,t.record.id);
 assert.equal(downgraded.loadout.weapon,item('Dragon scimitar').id);assert.ok(downgraded.dps<original.dps);assert.ok(after.calculated.ttk>before.calculated.ttk);
 t.select('Abyssal whip');assert.equal(t.best().dps,original.dps);
 t.select('Dragon scimitar');c.resetCreatureGear(t.p,t.record.id,'melee');assert.equal(t.best().dps,original.dps);assert.equal(t.p.gearOverrides[t.record.id],undefined);
});
test('body and leg choices override defensive/prayer fallback and remain specific to creature and style',()=>{
 const t=fixture(['Abyssal whip','Trident of the seas',"Torag's platebody","Torag's platelegs",'Proselyte hauberk','Proselyte cuisse']);
 t.select('Proselyte hauberk','body');t.select('Proselyte cuisse','legs');const r=t.best();
 assert.equal(r.loadout.body,item('Proselyte hauberk').id);assert.equal(r.loadout.legs,item('Proselyte cuisse').id);
 assert.equal(t.p.gearOverrides.hellhound.magic,undefined);assert.equal(t.p.gearOverrides['blue-dragon'],undefined);
 const imported=c.importProfiles(d,c.exportProfiles([t.p],t.p.id)).profiles[0];assert.deepEqual(imported.gearOverrides,t.p.gearOverrides);
});
test('weapon selections pin the selected bolt combination and blowpipe darts',()=>{
 const t=fixture(['Rune crossbow','Runite bolts','Ruby bolts (e)','Toxic blowpipe','Adamant dart','Dragon dart'],'hellhound','ranged');
 t.select('Rune crossbow','weapon','Ruby bolts (e)');assert.equal(t.best().loadout.weapon,item('Rune crossbow').id);assert.equal(t.best().loadout.ammo,item('Ruby bolts (e)').id);
 t.select('Toxic blowpipe','weapon','Dragon dart');assert.equal(t.best().loadout.weapon,item('Toxic blowpipe').id);assert.equal(t.best().loadout.ammo,item('Dragon dart').id);
 t.select('Adamant dart','ammo');assert.equal(t.best().loadout.ammo,item('Adamant dart').id);
});
test('unowned items, wrong families, missing protection and incompatible bolts cannot be selected',()=>{
 const t=fixture(['Abyssal whip','Dragon scimitar','Mirror shield','Rune kiteshield','Magic shortbow (i)','Amethyst arrows'],'basilisk-knight');
 assert.throws(()=>t.select('Rune kiteshield','shield'),/cannot be used/);assert.throws(()=>t.select('Scythe of vitur'),/cannot be used/);
 assert.throws(()=>t.select('Magic shortbow (i)'),/cannot be used/);
 assert.equal(t.best().loadout.shield,item('Mirror shield').id);
 const r=fixture(['Rune crossbow','Runite bolts','Bronze bolts'],'hellhound','ranged');
 assert.throws(()=>r.select('Rune crossbow','weapon','Dragon bolts'),/cannot be used/);
 r.select('Rune crossbow','weapon','Runite bolts');delete r.p.bank.manual[item('Rune crossbow').id];assert.equal(r.best().supported,false);assert.match(r.best().reason,/Reset this style/);
});
test('selecting gear opts in only the creature methods without enabling a character-wide rebalance',()=>{
 const t=fixture(['Abyssal whip','Dragon scimitar']);t.p.combat.enabled=false;const identity=c.combatIdentity(t.p);
 t.select('Dragon scimitar');const m=c.calculateMethodPreview(d,t.p,'hellhounds','hellhound');assert.ok(m.calculated);assert.equal(t.p.combat.enabled,false);assert.equal(c.combatIdentity(t.p),identity);
 assert.equal(c.configuredMethod(d,t.p,'gargoyles','gargoyle').useSelectedGear,undefined);
 t.p.methods['hellhounds::hellhound'].timing='kills-hour';t.p.methods['hellhounds::hellhound'].rate=100;
 assert.equal(c.calculateMethodPreview(d,t.p,'hellhounds','hellhound').calculated,undefined);
 const unset=fixture(['Abyssal whip','Dragon scimitar']);delete unset.p.combat;const oldIdentity=c.combatIdentity(unset.p);
 unset.select('Dragon scimitar');assert.equal(c.combatIdentity(unset.p),oldIdentity);assert.ok(c.calculateMethodPreview(d,unset.p,'hellhounds','hellhound').calculated);
});
test('two-handed upgrades remove optional off-hands but still reject mandatory shields',()=>{
 const t=fixture(['Abyssal whip','Rune kiteshield','Dragon halberd']);t.select('Dragon halberd');const result=t.best();
 assert.ok(result.supported,result.reason);assert.equal(result.loadout.weapon,item('Dragon halberd').id);assert.equal(result.loadout.shield,undefined);
 const required=fixture(['Abyssal whip','Mirror shield','Dragon halberd'],'basilisk-knight');assert.throws(()=>required.select('Dragon halberd'),/cannot be used/);
});
test('cache invalidation is local to the creature and method preview keys include its gear choices',()=>{
 c.clearCombatCache();const t=fixture(['Abyssal whip','Dragon scimitar']),other=g.GUIDE.records.gargoyle,os={...g.defaultGuideState(),variantId:other.id,formId:other.defaultForm,approach:'melee-tank'},of=g.guideForm(other,os);
 t.best();const unrelated=c.bestOwnedGear(t.p,other,of,os,g.selectedLocation(other,of,os,t.p));
 const method=c.configuredMethod(d,t.p,'hellhounds','hellhound'),key=c.methodPreviewKey(t.p,'hellhounds',method),otherKey=c.methodPreviewKey(t.p,'gargoyles',c.configuredMethod(d,t.p,'gargoyles','gargoyle'));
 t.select('Dragon scimitar');const searches=[];c.observeCombatCache((_,key)=>searches.push(JSON.parse(key)[0]));
 try{t.best();assert.deepEqual(c.bestOwnedGear(t.p,other,of,os,g.selectedLocation(other,of,os,t.p)),unrelated);assert.deepEqual(searches,['hellhound']);}finally{c.observeCombatCache(undefined);}
 assert.notEqual(c.methodPreviewKey(t.p,'hellhounds',method),key);assert.equal(c.methodPreviewKey(t.p,'gargoyles',c.configuredMethod(d,t.p,'gargoyles','gargoyle')),otherKey);
});
test('master dependencies include the appropriate boosting/reset filler but exclude unrelated masters',()=>{
 const t=fixture(['Abyssal whip']);t.p.strategy='none';let ids=c.gearAffectedMasters(d,t.p,'basilisk-knight').map(m=>m.id);
 assert.ok(ids.includes('duradel'));assert.ok(ids.includes('konar'));assert.ok(!ids.includes('turael'));assert.ok(!ids.includes('krystilia'));
 for(const strategy of ['boost-turael','boost-mazchna','reset-turael']){
  t.p.strategy=strategy;const filler=d.masters.find(m=>m.id===(strategy==='boost-mazchna'?'mazchna':'turael')),aid=filler.tasks[0].id,vid=d.assignments.find(a=>a.id===aid).variantIds[0];
  const affected=c.gearAffectedMasters(d,t.p,vid);assert.ok(affected.some(m=>m.id==='duradel'));assert.ok(affected.some(m=>m.id===filler.id));
 }
});
test('scoped worker refreshes only associated master plans and only the selected creature DPS searches',()=>{
 const source=buildSync({entryPoints:['src/worker.ts'],bundle:true,write:false,format:'iife',platform:'browser'}).outputFiles[0].text;
 const t=fixture(['Abyssal whip','Dragon scimitar']),store=new c.CombatCacheStore(),identity=c.combatIdentity(t.p);
 function run(kind){const messages=[],self={postMessage(value){messages.push(structuredClone(value));if(value.kind==='combat-cache')store.put(identity,value.key,value.result);}};
  vm.runInNewContext(source,{self,structuredClone,console});self.onmessage({data:{id:1,kind,profile:t.p,guide:t.state,variantId:'hellhound',combatCache:store.snapshot(identity)}});return messages;}
 const initial=run('plans');assert.ok(initial.some(m=>m.kind==='plans'));
 t.select('Dragon scimitar');const messages=run('gear-selection');assert.equal(messages.some(m=>m.kind==='error'),false,JSON.stringify(messages.filter(m=>m.kind==='error')));
 const final=messages.find(m=>m.kind==='gear-selection');assert.ok(final);assert.deepEqual(final.plans.map(p=>p.master.id),c.gearAffectedMasters(d,t.p,'hellhound').map(m=>m.id));
 const searches=[...new Set(messages.filter(m=>m.kind==='combat-cache').map(m=>JSON.parse(m.key)[0]))];assert.deepEqual(searches,['hellhound']);
 const old=initial.find(m=>m.kind==='plans').plans.find(p=>p.master.id==='duradel'),fresh=final.plans.find(p=>p.master.id==='duradel');
 assert.ok(fresh.rows.find(r=>r.id==='hellhounds').minutes>old.rows.find(r=>r.id==='hellhounds').minutes);
 assert.deepEqual(fresh.rows.filter(r=>r.id!=='hellhounds').map(r=>r.minutes),old.rows.filter(r=>r.id!=='hellhounds').map(r=>r.minutes));
 assert.ok(messages.some(m=>m.kind==='progress'&&m.current.includes('Duradel')));
});
test('import validation rejects unknown gear variants, slots, families and item ids',()=>{
 const t=fixture(['Abyssal whip']);for(const overrides of [{unknown:{melee:{weapon:4151}}},{hellhound:{other:{weapon:4151}}},{hellhound:{melee:{bad:4151}}},{hellhound:{melee:{weapon:-1}}}]){
  assert.throws(()=>c.validateProfile(d,{...t.p,gearOverrides:overrides}),/gear/);
 }
});
