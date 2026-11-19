const test=require('node:test');
const assert=require('node:assert/strict');
const g=require('../.desktop-build/guide.cjs');
const data=require('../.desktop-build/core.cjs').catalogue;
function scenario(id,approach='auto',onTask=true){
 const record=g.GUIDE.records[id],state={...g.defaultGuideState(),variantId:id,formId:record.defaultForm,approach,onTask};
 const form=g.guideForm(record,state),location=g.selectedLocation(record,form,state),plan=g.fightPlan(record,form,state,location);
 return {record,state,form,location,plan,mid:g.gearSet(record,form,plan,state,location,'mid'),max:g.gearSet(record,form,plan,state,location,'max')};
}
const slot=(set,name)=>set.slots.find(s=>s.slot===name)?.item||'';

test('every individual supported variant has revisioned facts and a selectable source form',()=>{
 assert.equal(Object.keys(g.GUIDE.records).length,data.variants.length-1);
 assert.equal(g.GUIDE.records['boss-pool'],undefined);
 for(const variant of data.variants.filter(v=>v.id!=='boss-pool')){
  const r=g.GUIDE.records[variant.id];assert.ok(r,variant.id);assert.ok(r.source.revision);assert.ok(r.forms.some(f=>f.id===r.defaultForm));
  for(const f of r.forms)assert.ok(f.hitpoints!==null||f.combat!==null);
 }
});

test('black dragon level 227 and Wilderness Slayer Cave stats never share a form',()=>{
 const a=scenario('black-dragon'),b=scenario('black-dragon-wilderness-slayer-cave');
 assert.equal(a.form.hitpoints,190);assert.equal(a.form.combat,227);
 assert.equal(b.form.hitpoints,250);assert.equal(b.form.combat,247);
 assert.equal(a.record.forms.length,1);assert.equal(b.record.forms.length,1);
 assert.ok(g.rankLocations(a.record,a.form,a.state).every(l=>!l.name.includes('Wilderness Slayer Cave')));
 assert.ok(g.rankLocations(b.record,b.form,b.state).every(l=>l.name.includes('Wilderness Slayer Cave')));
});

test('basilisk knights retain reflecting shields, tank armour and Magic protection',()=>{
 const s=scenario('basilisk-knight');assert.equal(s.plan.defence,'tank');assert.match(s.plan.protection,/Protect from Magic/);
 assert.equal(slot(s.mid,'Off-hand'),'Mirror shield');assert.equal(slot(s.max,'Off-hand'),"V's shield");
 assert.match(slot(s.mid,'Body'),/Torag/);assert.match(slot(s.max,'Weapon'),/mace/);
 for(const approach of g.APPROACHES){const x=scenario('basilisk-knight',approach);for(const set of [x.mid,x.max]){
  assert.match(slot(set,'Off-hand'),/shield/);assert.doesNotMatch(slot(set,'Weapon'),/shadow|Scythe|Bow of faerdhinen|blowpipe/);
 }}
});

test('ordinary cave kraken prayer advice stays distinct from the boss',()=>{
 const normal=scenario('cave-kraken'),boss=scenario('kraken');
 assert.match(normal.plan.protection,/Protect from Magic blocks/);
 assert.match(boss.plan.protection,/No protective prayer blocks/);
 assert.equal(boss.plan.family,'magic');assert.equal(boss.plan.defence,'tank');
 assert.match(slot(boss.max,'Body'),/Masori/);assert.match(slot(boss.max,'Weapon'),/Sanguinesti/);
 assert.equal(scenario('kraken','magic-prayer').plan.defence,'tank');
});

test('leaf-bladed and broad-ammunition restrictions override generic max upgrades',()=>{
 for(const id of ['turoth','kurask']){
  const melee=scenario(id,'melee-tank');assert.match(slot(melee.mid,'Weapon'),/Leaf-bladed/);assert.match(slot(melee.max,'Weapon'),/Leaf-bladed/);
  const magic=scenario(id,'magic-prayer');assert.equal(slot(magic.max,'Spell'),'Magic Dart');assert.match(slot(magic.max,'Weapon'),/Slayer/);
  const ranged=scenario(id,'ranged-prayer');assert.match(slot(ranged.max,'Ammo'),/broad bolts/i);
 }
});

test('protective equipment occupies its real slot even at the high tier',()=>{
 assert.equal(slot(scenario('killerwatt').max,'Feet'),'Insulated boots');
 assert.equal(slot(scenario('aberrant-spectre','melee-tank',false).max,'Head'),'Nose peg');
 assert.equal(slot(scenario('cave-horror').max,'Neck'),'Witchwood icon');
 assert.equal(slot(scenario('skeletal-wyvern').mid,'Off-hand'),'Mind shield');
 const shaman=scenario('lizardman-shaman');assert.equal(slot(shaman.max,'Head'),'Shayzien helm (5)');assert.equal(slot(shaman.max,'Body'),'Shayzien body (5)');
 const hydra=scenario('alchemical-hydra');assert.match(slot(hydra.max,'Feet'),/brimstone|stone/i);
 assert.match(slot(scenario('bloodveld','melee-tank').mid,'Body'),/Karil/);
});

test('adult/brutal dragon protection does not leak to babies or replace a wyvern shield',()=>{
 for(const id of ['black-dragon','brutal-black-dragon','frost-dragon']){
  const s=scenario(id);assert.equal(s.plan.mechanics.dragonfire,true);
  assert.match(slot(s.mid,'Off-hand'),/dragon shield/i);
  assert.ok(g.supplies(s.record,s.form,s.plan,s.location).some(p=>p.item==='Extended antifire'));
 }
 assert.equal(scenario('baby-black-dragon').plan.mechanics.dragonfire,undefined);
 const w=scenario('skeletal-wyvern');assert.equal(w.plan.mechanics.wyvern,true);assert.equal(w.plan.mechanics.dragonfire,undefined);
});

test('venom and hybrid encounters expose their actual preparation instead of one static prayer',()=>{
 const a=scenario('araxxor');assert.ok(g.supplies(a.record,a.form,a.plan,a.location).some(p=>/Anti-venom/.test(p.item)));
 for(const id of ['demonic-gorilla','tormented-demon','kalphite-queen','branda-the-fire-queen']){
  const s=scenario(id);assert.equal(s.plan.mechanics.hybrid,true);assert.ok(s.mid.switches.length);assert.ok(s.max.switches.length);
 }
 assert.match(scenario('venator').plan.protection,/OFF for the shriek/);
});

test('location ranking never grants task-only or unreviewed cannon access',()=>{
 const s=scenario('hellhound'),fake={...s.record,locations:[{name:'Unknown test room',page:null,region:null,levels:'',creature:'Hellhound',caveat:'',taskOnly:true,limited:false}]};
 const locations=g.rankLocations(fake,s.form,{...s.state,onTask:false,priority:'cannon'});
 assert.equal(locations[0].available,false);assert.equal(locations[0].cannon,null);assert.equal(locations[0].riskKnown,false);
 const wild=g.rankLocations({...fake,locations:[{...fake.locations[0],name:'Unlabelled chamber',region:'Wilderness',taskOnly:false}]},s.form,s.state)[0];
 assert.equal(wild.wilderness,true);
});

test('guide settings are independently validated and pure recommendations do not mutate them',()=>{
 const imported=g.parseGuideState(JSON.stringify({variantId:'unknown',points:999}));assert.equal(imported.variantId,'basilisk-knight');assert.equal(imported.points,undefined);
 const s=scenario('cerberus');const before=JSON.stringify(s);Object.freeze(s.state);g.fightPlan(s.record,s.form,s.state,s.location);g.gearSet(s.record,s.form,s.plan,s.state,s.location,'max');g.rankLocations(s.record,s.form,s.state);assert.equal(JSON.stringify(s),before);
 const wolf=scenario('werewolf'),locations=JSON.stringify(wolf.record.locations);g.rankLocations(wolf.record,wolf.form,wolf.state);g.rankLocations(wolf.record,wolf.form,wolf.state);assert.equal(JSON.stringify(wolf.record.locations),locations);
});

test('all source forms and offered approaches produce finite, non-empty gear and supply examples',()=>{
 for(const record of Object.values(g.GUIDE.records))for(const form of record.forms){
  const state={...g.defaultGuideState(),variantId:record.id,formId:form.id};
  const location=g.selectedLocation(record,form,state);
  for(const approach of g.APPROACHES){
   const current={...state,approach},plan=g.fightPlan(record,form,current,location);
   for(const tier of ['mid','max']){const set=g.gearSet(record,form,plan,current,location,tier);assert.ok(slot(set,'Weapon'),record.id);assert.ok(set.slots.length>=10);}
   assert.ok(g.supplies(record,form,plan,location).length);
  }
 }
});
