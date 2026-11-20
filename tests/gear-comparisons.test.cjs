const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
function setup(names,id='hellhound',approach='melee-prayer'){
 const p=c.maxedProfile(d);p.bank=c.emptyBank();p.combat={...c.defaultCombat(),enabled:true};
 for(const name of names){const item=c.itemForLabel(name);assert.ok(item,name);p.bank.manual[item.id]=1;}
 const record=g.GUIDE.records[id],state={...g.defaultGuideState(),variantId:id,formId:record.defaultForm,approach},form=g.guideForm(record,state),location=g.selectedLocation(record,form,state);
 return {p,record,state,form,location};
}
const best=t=>c.bestOwnedGear(t.p,t.record,t.form,t.state,t.location);
const id=name=>c.itemForLabel(name).id;

test('prayer and defensive reasons expose real owned per-slot bonuses and DPS deltas without mutating inputs',()=>{
 const t=setup(['Abyssal whip','Proselyte hauberk',"Torag's platebody"]),r=best(t),before=JSON.stringify([t.p,r]);
 const comparison=c.compareOwnedSlot(t.p,t.state,r,'body'),chosen=comparison.rows.find(row=>row.selected),other=comparison.rows.find(row=>!row.selected);
 assert.match(comparison.reason,/prayer bonus/);assert.equal(chosen.id,id('Proselyte hauberk'));assert.equal(chosen.dps,r.dps);assert.equal(chosen.delta,0);assert.equal(chosen.prayer,8);
 assert.equal(other.defensive.slash,c.itemForLabel("Torag's platebody").defensive.slash);assert.equal(other.delta,0);assert.ok(other.owned);
 assert.equal(JSON.stringify([t.p,r]),before);
 const tank=best({...t,state:{...t.state,approach:'melee-tank'}});assert.match(c.compareOwnedSlot(t.p,t.state,tank,'body').reason,/relevant defence, then prayer/);
});

test('comparison DPS is calculated for the fixed complete loadout and captures accuracy penalties',()=>{
 const t=setup(['Trident of the seas',"Ahrim's robetop",'Proselyte hauberk',"Monk's robe top"],'hellhound','magic-prayer'),r=best(t),comparison=c.compareOwnedSlot(t.p,t.state,r,'body');
 const row=comparison.rows.find(row=>row.id===id('Proselyte hauberk'));
 const exact=c.calculateCombat(t.p,t.record,t.form,{...r.loadout,body:row.id},r.style,r.spell,true,c.isWildernessCombat(t.record,t.location),false);
 assert.equal(row.dps,exact.dps);assert.equal(row.delta,exact.dps-r.dps);assert.ok(row.delta<0);assert.equal(comparison.rows.find(row=>row.selected).id,id("Ahrim's robetop"));
});

test('owned items that fail skill requirements remain visible with a reason and no invented DPS',()=>{
 const t=setup(['Abyssal whip','Proselyte hauberk',"Torag's platebody"]);t.p.levels.defence=30;const r=best(t),comparison=c.compareOwnedSlot(t.p,t.state,r,'body'),row=comparison.rows.find(row=>row.id===id("Torag's platebody"));
 assert.equal(row.dps,null);assert.equal(row.delta,null);assert.match(row.reason,/defence 70/);
});

test('required protection and two-handed conflicts are explained rather than showing invalid DPS',()=>{
 const t=setup(['Abyssal whip','Mirror shield','Dragon defender','Saradomin godsword'],'basilisk-knight','melee-prayer'),r=best(t);
 assert.ok(r.supported,r.reason);const shields=c.compareOwnedSlot(t.p,t.state,r,'shield');assert.match(shields.reason,/Required/);
 const defender=shields.rows.find(row=>row.id===id('Dragon defender'));assert.equal(defender.dps,null);assert.match(defender.reason,/required/);
 const weapon=c.compareOwnedSlot(t.p,t.state,r,'weapon').rows.find(row=>row.id===id('Saradomin godsword'));assert.equal(weapon.dps,null);assert.match(weapon.reason,/Two-handed/);
});

test('incompatible ammunition and other combat families are excluded from fixed-slot comparisons',()=>{
 const t=setup(['Magic shortbow (i)','Amethyst arrows','Adamant javelin','Abyssal whip'],'hellhound','ranged-tank'),r=best(t);
 const ammo=c.compareOwnedSlot(t.p,t.state,r,'ammo').rows.find(row=>row.id===id('Adamant javelin'));assert.equal(ammo.dps,null);assert.match(ammo.reason,/incompatible/);
 const whip=c.compareOwnedSlot(t.p,t.state,r,'weapon').rows.find(row=>row.id===id('Abyssal whip'));assert.equal(whip.dps,null);
});

test('burst comparisons retain single-target and pod DPS and disclose the assumption',()=>{
 const t=setup(['Ancient staff','Slayer helmet (i)',"Ahrim's robetop","Monk's robe top"],'dust-devil','magic-prayer');t.state.location='Catacombs of Kourend';t.state.stackSize=8;t.location=g.selectedLocation(t.record,t.form,t.state);
 const r=best(t);assert.equal(r.targets,8);const comparison=c.compareOwnedSlot(t.p,t.state,r,'body');
 for(const row of comparison.rows.filter(row=>row.dps!==null))assert.equal(row.aggregateDps,row.dps*8);
});

test('curated examples identify an unowned baseline and compare against owned alternatives',()=>{
 const t=setup(['Abyssal whip','Proselyte hauberk']),r=best(t);r.source='example';r.loadout.body=id("Torag's platebody");
 const comparison=c.compareOwnedSlot(t.p,t.state,r,'body');assert.match(comparison.reason,/Curated/);assert.equal(comparison.rows[0].owned,false);assert.equal(comparison.rows[1].owned,true);
});

test('relevant defence includes generic melee alongside a listed magic attack',()=>{
 const t=setup(['Proselyte hauberk']),item=c.itemForLabel('Proselyte hauberk');assert.equal(c.defenceScore(item,{...t.form,'attack style':'Melee, Magic'}),(item.defensive.stab+item.defensive.slash+item.defensive.crush+item.defensive.magic)/4);
});

test('selected hunt assignments are prepared first without changing catalogue row ordering or mathematics',()=>{
 const t=setup(['Abyssal whip']);t.p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];
 const master=d.masters.find(m=>m.id==='nieve'),progress=[],originalOrder=d.masters.map(m=>m.id);
 const rows=c.prepareRows(d,master,t.p,(done,total,current)=>progress.push({done,total,current}));
 assert.equal(progress[0].current,'Hellhound');assert.deepEqual(rows.map(r=>r.id),master.tasks.map(t=>t.id));
 assert.deepEqual(progress.map(r=>r.done),Array.from({length:master.tasks.length},(_,i)=>i));
 const masters=c.prioritisedMasters(d,t.p),firstNonTarget=masters.findIndex(m=>!m.tasks.some(t=>t.id==='hellhounds'));
 assert.ok(firstNonTarget>0);assert.ok(masters.slice(firstNonTarget).every(m=>!m.tasks.some(t=>t.id==='hellhounds')));assert.deepEqual(d.masters.map(m=>m.id),originalOrder);
});

test('hunt/guide warmup honours active view, emits results before masters, and keeps progress monotonic',()=>{
 const t=setup(['Abyssal whip']);t.p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];
 for(const guideFirst of [false,true]){
  const reports=[];let ready=false;
  const offset=c.preparePriorityCombat(d,t.p,t.state,guideFirst,(done,total,current)=>reports.push({done,total,current}),result=>{ready=true;assert.ok(result.styles.melee);});
  assert.ok(ready);assert.equal(offset,6);assert.match(reports[0].current,guideFirst?/Priority guide/:/Priority hunt/);
  assert.ok(reports.every((r,i)=>r.done>=0&&r.done<=r.total&&(!i||r.done>=reports[i-1].done)));assert.ok(reports.every(r=>r.total===d.masters.length+6));
 }
});

test('actual worker publishes priority guide results and each master before final completion',()=>{
 const t=setup(['Abyssal whip']);t.p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];
 const bundle=buildSync({entryPoints:['src/worker.ts'],bundle:true,write:false,format:'iife',platform:'browser'}).outputFiles[0].text;
 const messages=[],self={postMessage:message=>messages.push(message)};vm.runInNewContext(bundle,{self,structuredClone,console});
 self.onmessage({data:{id:99,kind:'plans',profile:t.p,guide:t.state,guideFirst:false}});
 assert.equal(messages.find(m=>m.kind==='progress').current,'Priority hunt creature / Hellhound');assert.equal(messages.some(m=>m.kind==='error'),false);
 const gearIndex=messages.findIndex(m=>m.kind==='priority-gear'),planIndex=messages.findIndex(m=>m.kind==='plan-ready');
 assert.ok(gearIndex>0&&planIndex>gearIndex);assert.ok(messages[planIndex].plan.master.tasks.some(t=>t.id==='hellhounds'));
 assert.equal(messages.filter(m=>m.kind==='plan-ready').length,d.masters.length);assert.equal(messages.at(-1).kind,'plans');
 const progress=messages.filter(m=>m.kind==='progress');assert.ok(progress.every((m,i)=>!i||m.done>=progress[i-1].done));assert.equal(progress.at(-1).done,progress.at(-1).total);
});
