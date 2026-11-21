const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
const baseline=[['blue dragons','blue-dragon',105,111],['red dragons','red-dragon',140,152],['metal dragons','steel-dragon',210,246],['bears','black-bear',25,19],['rats','rat',2,1],['spiders','spider',2,1]];
function scenario(id){const record=g.GUIDE.records[id],state={...g.defaultGuideState(),variantId:id,formId:record.defaultForm};return {record,state,form:g.guideForm(record,state)};}

test('ordinary creature forms are selectable beside the workbook fast-task representatives',()=>{
 for(const [aid,id,hp,combat] of baseline){
  const a=d.assignments.find(a=>a.id===aid),v=d.variants.find(v=>v.id===id),s=scenario(id);
  assert.ok(a.variantIds.includes(id),id);assert.ok(v.assignmentIds.includes(aid),id);
  assert.equal(v.hp,hp,id);assert.equal(s.form.hitpoints,hp,id);assert.equal(s.form.combat,combat,id);
  assert.ok(g.rankLocations(s.record,s.form,s.state).length,id);
  assert.equal(v.requirements.some(r=>r.kind==='access'),false,id);
  const npc=c.monsterFor(s.record,s.form);assert.ok(npc,id);assert.equal(npc.skills.hp,hp,id);
 }
 const blues=d.assignments.find(a=>a.id==='blue dragons').variantIds;
 for(const id of ['baby-blue-dragon','blue-dragon','brutal-blue-dragon','vorkath'])assert.ok(blues.includes(id),id);
 assert.equal(new Set(blues).size,blues.length);
});

test('new regular blue dragon target survives character export/import and produces a valid master plan',()=>{
 const p=c.maxedProfile(d);p.goal.targets=[{assignmentId:'blue dragons',variantId:'blue-dragon',priority:1}];
 const restored=c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0];assert.deepEqual(restored.goal.targets,p.goal.targets);
 const m=d.masters.find(m=>m.id==='vannaka'),plan=c.evaluate(d,m,restored,[]),row=plan.rows.find(r=>r.id==='blue dragons');
 assert.equal(row.variant.id,'blue-dragon');assert.equal(row.isTarget,true);assert.equal(row.targetFraction,1);assert.ok(plan.chance>0);assert.ok(Number.isFinite(plan.hours));
});

test('the additive catalogue repair remains compatible with saved 3.0.3 characters',()=>{
 const p=c.newCharacter(d,'Saved custom character');p.dataVersion='2026-11-19.2';p.points=412;p.unlocks.basilocked=1;
 p.bank=c.emptyBank();p.bank.manual['4151']=1;p.quests['The Fremennik Exiles']=2;
 const restored=c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0];
 assert.equal(restored.points,412);assert.equal(restored.unlocks.basilocked,1);assert.deepEqual(restored.bank,p.bank);assert.deepEqual(restored.quests,p.quests);assert.deepEqual(restored.goal,p.goal);
});

test('numbered-stat alternatives retain their skill restrictions and explicit master mappings',()=>{
 for(const [id,aid,level] of [['spiritual-mage','spiritual creatures',83],['spiritual-ranger','spiritual creatures',63],['warped-terrorbird','warped creatures',56]]){
  const v=d.variants.find(v=>v.id===id);assert.ok(v,id);assert.ok(d.assignments.find(a=>a.id===aid).variantIds.includes(id));
  assert.equal(v.requirements.find(r=>r.kind==='skill'&&r.key==='slayer').min,level);
  assert.ok(v.requirements.some(r=>r.kind==='access'));assert.ok(v.masterAssignments.nieve.includes(aid));
  assert.equal(c.variantEligibility(v,c.maxedProfile(d),d.masters.find(m=>m.id==='krystilia'),aid).eligible,false);
 }
});

test('default forms choose sourced regular spawns rather than quest-only encounters',()=>{
 for(const [id,combat,hp] of [['scarab-mage',93,50],['vampyre-juvinate',54,85],['vyrewatch',105,90],['vorkath',732,750]]){
  const s=scenario(id);assert.equal(s.form.combat,combat,id);assert.equal(s.form.hitpoints,hp,id);assert.ok(g.rankLocations(s.record,s.form,s.state).length,id);
 }
});

test('adult dragons keep fire protection and restored bosses keep full-fight timing',()=>{
 const p=c.maxedProfile(d);p.combat={...c.defaultCombat(),enabled:true};
 for(const id of ['blue-dragon','red-dragon','steel-dragon']){
  const s=scenario(id);
  for(const approach of g.APPROACHES){const state={...s.state,approach},plan=g.fightPlan(s.record,s.form,state,g.selectedLocation(s.record,s.form,state));
   assert.equal(plan.mechanics.dragonfire,true,id);
   assert.match(g.gearSet(s.record,s.form,plan,state,undefined,'mid',p).slots.find(r=>r.slot==='Off-hand').item,/shield/i,id);
  }
 }
 for(const id of ['vorkath','scurrius','amoxliatl','vampyre-juvinate']){
  const s=scenario(id),v=d.variants.find(v=>v.id===id),method={...c.defaultMethod(d,p,v.assignmentIds[0]),variantId:id};
  assert.equal(g.fightPlan(s.record,s.form,s.state,undefined).mechanics.boss,true,id);
  const result=c.withCalculatedTiming(p,v,method);assert.equal(result.calculated,undefined);assert.match(result.combatNote,/full-fight timing/);
 }
 for(const id of ['vyrewatch','vampyre-juvinate']){
  const s=scenario(id),plan=g.fightPlan(s.record,s.form,s.state,undefined);
  assert.equal(plan.attack,'vampyrebane');assert.match(g.gearSet(s.record,s.form,plan,s.state,undefined,'mid',p).slots.find(r=>r.slot==='Weapon').item,/flail/i);
 }
});

test('catalogue regenerates deterministically from cached sources without network access',()=>{
 const output='.desktop-build/variant-coverage-catalogue.json';cp.execFileSync('python',['tools/build_catalogue.py','--output',output]);
 assert.deepEqual(JSON.parse(fs.readFileSync(output,'utf8')),require('../data/catalogue.json'));
});
