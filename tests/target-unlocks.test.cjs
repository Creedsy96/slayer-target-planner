const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
function moduleFor(file){const code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};new Function('module','exports',code)(m,m.exports);return m.exports;}
const ui=moduleFor('src/ui/master-availability.ts'),ranking=moduleFor('src/ui/planner-ranking.ts'),issues=moduleFor('src/ui/plan-issues.ts'),nav=moduleFor('src/ui/hunt-tools.ts');
const master=id=>d.masters.find(m=>m.id===id);
function fixture(){const p=c.maxedProfile(d);p.assumeAllGear=false;p.combat.enabled=false;p.objective='kills-hour';p.goal.targets=[{assignmentId:'basilisks',variantId:'basilisk-knight',priority:1}];return p;}
test('masters requiring Basilocked remain available to inspect without granting the task or calculated rate',()=>{
 const p=fixture(),before=JSON.stringify(p);
 for(const id of ['nieve','duradel','konar']){
  const plan=c.evaluate(d,master(id),p,[]),unlocks=c.requiredTargetUnlocks(d,plan,p);
  assert.equal(plan.chance,null);assert.equal(plan.targetKillsPerHour,null);assert.equal(plan.objectiveValue,Infinity);
  assert.deepEqual(unlocks.map(u=>u.key),['basilocked']);assert.deepEqual(unlocks[0].assignments,['basilisks']);
  assert.equal(ui.canShowAvailableMaster(d,plan,p),true,id);assert.equal(ranking.canRankPlan(plan,p),false);
  assert.equal(ui.renderPlanCosts(d,plan,p),'<td>—</td><td>—</td><td>—</td>');
 }
 assert.equal(JSON.stringify(p),before);assert.equal(p.unlocks.basilocked,0);
});
test('missing master, quest, variant and location requirements are not relabelled as unlock-only availability',()=>{
 let p=fixture();p.levels.slayer=80;p.levels.combat=3;
 assert.equal(ui.canShowAvailableMaster(d,c.evaluate(d,master('duradel'),p,[]),p),false);
 p=fixture();p.quests['The Fremennik Exiles']=0;assert.deepEqual(c.requiredTargetUnlocks(d,c.evaluate(d,master('duradel'),p,[]),p),[]);
 p=fixture();p.methods.basilisks={...c.defaultMethod(d,p,'basilisks'),variantId:'basilisk-knight',location:"Jormungand's Prison"};p.access["location:Jormungand's Prison"]=0;
 assert.deepEqual(c.requiredTargetUnlocks(d,c.evaluate(d,master('konar'),p,[]),p),[]);
 p=fixture();for(const id of ['krystilia','turael'])assert.equal(ui.canShowAvailableMaster(d,c.evaluate(d,master(id),p,[]),p),false);
});
test('unknown purchases warn without being confirmed, and an actual recorded purchase clears the warning',()=>{
 const p=fixture();p.unlocks.basilocked=null;let plan=c.evaluate(d,master('duradel'),p,[]);
 assert.equal(plan.chance,null);assert.equal(c.requiredTargetUnlocks(d,plan,p)[0].label,'Basilocked');assert.equal(p.unlocks.basilocked,null);
 p.unlocks.basilocked=1;plan=c.evaluate(d,master('duradel'),p,[]);assert.ok(plan.chance>0);assert.ok(plan.targetKillsPerHour>0);assert.deepEqual(c.requiredTargetUnlocks(d,plan,p),[]);
 assert.equal(ranking.canRankPlan(plan,p),true);assert.doesNotMatch(ui.masterOptionLabel(d,plan,p),/Requires/);
 p.unlocks.basilocked=2;assert.deepEqual(c.requiredTargetUnlocks(d,c.evaluate(d,master('duradel'),p,[]),p),[]);
});
test('known unpurchased rewards stay locked even in conditional scenarios',()=>{
 const p=fixture();p.assumeUnknown=true;let plan=c.evaluate(d,master('duradel'),p,[]);
 assert.equal(plan.chance,null);assert.equal(ui.canShowAvailableMaster(d,plan,p),true);
 p.unlocks.basilocked=null;plan=c.evaluate(d,master('duradel'),p,[]);assert.ok(plan.chance>0);assert.ok(plan.unknown.includes('Basilocked'));assert.equal(c.requiredTargetUnlocks(d,plan,p).length,1);
});
test('a mixed hunt still ranks its currently available targets while warning about its locked target',()=>{
 const p=fixture();p.goal.targets.push({assignmentId:'hellhounds',variantId:'hellhound',priority:1});
 const plan=c.evaluate(d,master('duradel'),p,[]);assert.ok(plan.chance>0);assert.ok(plan.targetKillsPerHour>0);
 assert.equal(c.requiredTargetUnlocks(d,plan,p).length,1);assert.equal(ranking.recommendedPlan([plan],p),plan);
 assert.match(ui.renderTargetUnlockWarning(d,plan,p),/Current estimates include only targets permitted/);
});
test('negative reward requirements, satisfied alternatives and blocked targets do not produce purchase advice',()=>{
 const p=fixture(),base=c.evaluate(d,master('duradel'),p,[]),row=base.rows.find(r=>r.isTarget);
 row.entry={...row.entry,requirements:[{kind:'unlock',key:'stop-the-wyvern',min:0,label:'Stop the Wyvern'}]};p.unlocks['stop-the-wyvern']=1;
 assert.deepEqual(c.requiredTargetUnlocks(d,base,p),[]);
 row.entry.requirements=[{kind:'any',label:'Alternate route',items:[{kind:'unlock',key:'basilocked',min:1,label:'Basilocked'},{kind:'quest',key:'The Fremennik Exiles',min:2,label:'The Fremennik Exiles'}]}];
 assert.deepEqual(c.requiredTargetUnlocks(d,base,p),[]);
 assert.deepEqual(c.requiredTargetUnlocks(d,c.evaluate(d,master('duradel'),p,['basilisks']),p),[]);
});
test('normal and compact master pickers name the required reward, and the warning opens its setting',()=>{
 const p=fixture(),plan=c.evaluate(d,master('duradel'),p,[]),warning=ui.renderMasterStatus(d,plan,p);
 assert.match(warning,/Master available/);assert.match(warning,/Requires <strong>Basilocked/);assert.match(warning,/data-issue-route="account"/);assert.match(warning,/data-issue-unlock="basilocked"/);assert.doesNotMatch(warning,/Why unavailable/);
 for(const compact of [true,false])assert.match(nav.renderHuntNav(d,p,[plan],plan.master.id,compact,false,false,'',false,false),/Duradel \/ Kuradal — Requires Basilocked/);
 assert.match(issues.renderPlanIssues(d,plan,p),/Requirements to review/);assert.doesNotMatch(issues.renderPlanIssues(d,plan,p),/Why unavailable/);
 assert.match(ui.renderTargetUnlockWarning(d,plan,p),/does not purchase or enable/);
});
test('hiding unavailable masters keeps unlock warnings while recommendations exclude locked-only hunts',()=>{
 for(const objective of ['time','chance','points','kills-hour']){
  const p=fixture();p.objective=objective;const plans=['duradel','nieve','krystilia','turael'].map(id=>c.evaluate(d,master(id),p,[]));
  assert.deepEqual(plans.filter(plan=>ui.canShowAvailableMaster(d,plan,p)).map(plan=>plan.master.id),['duradel','nieve']);
  assert.equal(ranking.recommendedPlan(plans,p),undefined);
 }
 assert.equal(ui.canShowAvailableMaster(d,undefined,fixture()),false);
});
test('warnings escape data labels while preserving explicit creature references',()=>{
 const p=fixture(),plan=c.evaluate(d,master('duradel'),p,[]),data={...d,unlocks:{...d.unlocks,basilocked:'Basilocked <test>'}};
 const html=ui.renderMasterStatus(data,plan,p);assert.match(html,/Basilocked &lt;test&gt;/);assert.doesNotMatch(html,/<test>/);assert.match(html,/class="creature-icon"/);
});
