const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
const konar=d.masters.find(m=>m.id==='konar');
function profile(variant='hellhound'){
  const p=c.maxedProfile(d);p.goal.targets=[{assignmentId:'hellhounds',variantId:variant,priority:1}];return p;
}

test('ordinary hellhounds calculate for strict Maxed at all five reviewed Konar locations',()=>{
  const p=profile(),plan=c.evaluate(d,konar,p,[]),row=plan.rows.find(r=>r.id==='hellhounds');
  assert.equal(p.assumeUnknown,false);assert.equal(row.targetFraction,1);
  assert.deepEqual(row.unknown,[]);assert.equal(plan.reason,'');assert.ok(plan.chance>0);
  assert.equal(plan.chance,row.weight/plan.rows.filter(r=>!r.reason).reduce((sum,r)=>sum+r.weight,0));
});

test('Cerberus remains restricted to Taverley; blocked locations and unsupported variants stay restricted',()=>{
  const p=profile('cerberus'),plan=c.evaluate(d,konar,p,[]);
  assert.equal(plan.rows.find(r=>r.id==='hellhounds').targetFraction,1/5);
  p.access['location:Taverley Dungeon']=0;
  assert.equal(c.evaluate(d,konar,p,[]).chance,null);
  p.goal.targets[0].variantId='skeleton-hellhound-vet-ion';
  assert.match(c.evaluate(d,konar,p,[]).reason,/no reviewed mapping/);
});

test('unreviewed compatibility explains the missing model and opens the correct target method',()=>{
  const p=profile();p.goal.targets=[{assignmentId:'black dragons',variantId:'baby-black-dragon',priority:1}];
  const plan=c.evaluate(d,konar,p,[]),issues=c.explainPlanIssues(d,plan,p);
  assert.equal(plan.chance,null);
  const issue=issues.find(i=>i.title.includes('Konar location compatibility'));
  assert.equal(issue.route,'methods');assert.equal(issue.assignmentId,'black dragons');assert.equal(issue.variantId,'baby-black-dragon');
  assert.equal(issue.field,'locationChance');assert.match(issue.detail,/not fully verified/);
  assert.equal(issue.source.url,'https://oldschool.runescape.wiki/w/Konar_quo_Maten');
});

test('reward gates and closed locations show named requirements with relevant correction destinations',()=>{
  const p=profile();p.goal.targets=[{assignmentId:'basilisks',variantId:'basilisk-knight',priority:1}];
  const plan=c.evaluate(d,d.masters.find(m=>m.id==='nieve'),p,[]);
  const reward=c.explainPlanIssues(d,plan,p).find(i=>i.title==='Basilocked');
  assert.equal(reward.route,'account');assert.equal(reward.filter,'Basilocked');assert.match(reward.detail,/purchased only if you own/);
  const closed=profile();for(const loc of konar.tasks.find(t=>t.id==='hellhounds').locations)closed.access['location:'+loc]=0;
  const access=c.explainPlanIssues(d,c.evaluate(d,konar,closed,[]),closed).find(i=>i.title.includes('every assigned area'));
  assert.equal(access.route,'account');assert.ok(access.filter);assert.match(access.detail,/Taverley Dungeon/);
});

test('unsupported variants point to target selection; newly added unreviewed areas stay conditional',()=>{
  const p=profile('skeleton-hellhound-vet-ion'),plan=c.evaluate(d,konar,p,[]);
  const mapping=c.explainPlanIssues(d,plan,p).find(i=>i.detail.includes('no reviewed mapping'));
  assert.equal(mapping.route,'plan');assert.equal(mapping.assignmentId,'hellhounds');
  assert.ok(mapping.source.url.includes('oldschool.runescape.wiki'));
  const regular=profile(),entry=konar.tasks.find(t=>t.id==='hellhounds');
  const changed={...entry,locations:[...entry.locations,'Future Dungeon']};regular.access['location:Future Dungeon']=1;
  const v=d.variants.find(v=>v.id==='hellhound');
  assert.match(c.locationFraction(changed,v,c.defaultMethod(d,regular,'hellhounds'),konar,regular).unknown.join(),/not reviewed/);
});

test('issue explanations respect the level-99 Slayer exception to master combat requirements',()=>{
  const p=profile();p.levels.combat=null;
  for(const id of ['duradel','mortimer']){
    const master=d.masters.find(m=>m.id===id),plan=c.evaluate(d,master,p,[]);
    assert.ok(!c.explainPlanIssues(d,plan,p).some(i=>i.title==='Combat'&&i.detail.startsWith(master.name+':')));
  }
});
