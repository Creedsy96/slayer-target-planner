const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
function ui(file,globals={}){const code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};new Function('module','exports',...Object.keys(globals),code)(m,m.exports,...Object.values(globals));return m.exports;}
const account=ui('src/ui/account-import.ts'),settings=ui('src/ui/settings.ts');
function profile(){const p=c.maxedProfile(d);p.assumeAllGear=false;p.combat.enabled=false;p.restrictBasicAccess=true;p.unlocks.basilocked=1;p.blockLimit=0;p.strategy='none';return p;}
function guide(id,p,location=''){const record=g.GUIDE.records[id],state={...g.defaultGuideState(),variantId:id,formId:record.defaultForm,location};return {record,state,form:g.guideForm(record,state)};}
function offVariant(p,id){for(const l of g.GUIDE.records[id].locations)c.setLocationAccess(p,'location:'+(l.page||l.name),false);}
test('restricted mode reveals completed and normally open locations even with completed checks hidden',()=>{
 const p=profile(),keys=['location:Taverley Dungeon','location:Iorwerth Dungeon'];account.resetAccessChecklist();
 for(let visit=0;visit<2;visit++){account.resetAccessChecklist();const html=account.renderAreaAccess(p,keys,'',false);for(const key of keys)assert.ok(html.includes(`data-key="${key}"`));assert.doesNotMatch(html,/Hide newly confirmed checks/);}
 p.restrictBasicAccess=false;account.resetAccessChecklist();assert.doesNotMatch(account.renderAreaAccess(p,keys,'',false),/data-key=/);
});
test('Settings exposes an editable filtered pool immediately when enabled',()=>{
 const p=profile(),display={};let html=settings.renderSettings(p,display,'forest',c.locationPoolKeys(d,p),'Taverley');
 assert.match(html,/id="settings-location-pool"/);assert.match(html,/id="restricted-area-search"/);assert.match(html,/data-key="location:Taverley Dungeon"/);
 assert.doesNotMatch(html,/data-fact-toggle="access" data-key="location:Iorwerth Dungeon"/);
 p.restrictBasicAccess=false;html=settings.renderSettings(p,display,'forest',c.locationPoolKeys(d,p));assert.doesNotMatch(html,/id="settings-location-pool"/);
});
test('the full pool includes guide areas and saved custom locations beyond the master-only checklist',()=>{
 const p=profile();p.access['location:My custom restricted island']=0;const keys=c.locationPoolKeys(d,p),old=c.knownAccessKeys(d).filter(k=>k.startsWith('location:'));
 assert.ok(keys.length>old.length*4);assert.equal(new Set(keys).size,keys.length);assert.ok(keys.includes('location:My custom restricted island'));
 for(const record of Object.values(g.GUIDE.records))for(const l of record.locations.filter(l=>!l.limited))assert.ok(keys.includes(c.locationControlKey('location:'+(l.page||l.name))),l.name);
});
test('physical naming aliases toggle and reset together without stale opposite overrides',()=>{
 const p=profile();p.access['location:Stronghold Slayer Cave']=1;p.access['location:Stronghold Slayer Dungeon']=0;
 assert.equal(c.locationAccess('Stronghold Slayer Cave',p).value,0);c.setLocationAccess(p,'location:Stronghold Slayer Dungeon',true);
 assert.equal(c.locationAccess('Stronghold Slayer Dungeon',p).value,1);assert.equal(p.access['location:Stronghold Slayer Dungeon'],undefined);
 c.setLocationAccess(p,'location:Stronghold Slayer Cave',false);assert.equal(c.locationAccess('Stronghold Slayer Dungeon',p).value,0);
 c.clearLocationAccess(p,'location:Stronghold Slayer Dungeon');assert.equal(c.locationAccess('Stronghold Slayer Cave',p).value,1);
});
test('a disabled parent entrance excludes its rooms even when an old room flag says Yes',()=>{
 const p=profile();p.access['location:Slayer Tower']=0;p.access['location:Slayer Tower (1)']=1;
 assert.equal(c.locationAccess('Slayer Tower (1)',p).value,0);
 p.goal.targets=[{assignmentId:'bloodveld',variantId:'bloodveld',priority:1}];p.methods['bloodveld::bloodveld']={...c.defaultMethod(d,p,'bloodveld'),variantId:'bloodveld',location:'Slayer Tower (1)'};
 const row=c.prepareRows(d,d.masters.find(m=>m.id==='nieve'),p).find(r=>r.id==='bloodveld');assert.equal(row.reason,'');assert.equal(row.targetFraction,0);assert.match(row.methodReason,/locked/);
});
test('ranked guide locations omit disabled areas and replace a stale selection without mutating it',()=>{
 const p=profile(),s=guide('hellhound',p,'Taverley Dungeon'),before=c.clone(s.state);p.access['location:Taverley Dungeon']=0;
 const ranked=g.rankLocations(s.record,s.form,s.state,p);assert.ok(ranked.length);assert.ok(ranked.every(l=>!l.name.includes('Taverley')));
 assert.notEqual(g.selectedLocation(s.record,s.form,s.state,p).name,'Taverley Dungeon');assert.deepEqual(s.state,before);
 p.restrictBasicAccess=false;assert.ok(g.rankLocations(s.record,s.form,s.state,p).some(l=>l.name.includes('Taverley')));
});
test('no guide DPS or valid target is invented when every location is disabled',()=>{
 const p=profile(),s=guide('basilisk-knight',p);offVariant(p,s.record.id);
 const combat=c.calculateGuideCombat(p,s.state);for(const result of [combat.mid,combat.max,...Object.values(combat.styles)]){assert.equal(result.supported,false);assert.match(result.reason,/location pool/);}
 const master=d.masters.find(m=>m.id==='nieve'),plan=c.evaluate(d,master,p,[]);assert.equal(plan.chance,null);assert.match(plan.rows.find(r=>r.id==='basilisks').methodReason,/location pool/);
});
test('automatic dust-devil timing chooses an allowed room instead of a disabled barrage area',()=>{
 const p=profile();p.bank=c.emptyBank();p.combat={...c.defaultCombat(),enabled:true,style:'magic',spellbook:'ancient'};
 for(const label of ['Ancient staff','Slayer helmet (i)'])p.bank.manual[c.itemForLabel(label).id]=1;
 p.access['location:Catacombs of Kourend']=0;const v=d.variants.find(v=>v.id==='dust-devil'),method={...c.defaultMethod(d,p,'dust devils'),variantId:v.id,combatStyle:'magic'};
 const result=c.withCalculatedTiming(p,v,method);assert.ok(result.calculated,result.combatNote);assert.match(result.combatNote,/Smoke Dungeon/);assert.equal(result.calculated.targets,1);
});
test('disabling the Lizardman Temple reduces shaman compatibility without removing the Molch roll',()=>{
 const p=profile(),m=d.masters.find(m=>m.id==='konar');p.access['location:Lizardman Temple']=0;p.goal.targets=[{assignmentId:'lizardmen',variantId:'lizardman-shaman',priority:1}];
 const row=c.prepareRows(d,m,p).find(r=>r.id==='lizardmen');assert.equal(row.targetFraction,2/5);assert.equal(row.locationOutcomes.length,5);
 const molch=row.locationOutcomes.find(o=>o.location==='Molch');assert.equal(molch.row.isTarget,false);assert.equal(molch.row.variant.id,'lizardman');assert.equal(molch.row.methodReason,'');
});
test('disabling Abyssal Nexus does not incorrectly close the regular Abyssal Area roll',()=>{
 const p=profile(),m=d.masters.find(m=>m.id==='konar'),entry=m.tasks.find(e=>e.id==='abyssal demons');p.access['location:Abyssal Nexus']=0;
 assert.equal(c.konarPool(entry,p).locations.length,3);
 for(const [id,fraction]of [['abyssal-sire',0],['abyssal-demon',1]]){const v=d.variants.find(v=>v.id===id);assert.equal(c.locationFraction(entry,v,{...c.defaultMethod(d,p,entry.id),variantId:id},m,p).fraction,fraction);}
});
test('Konar excludes a grouped roll when all its reviewed completion rooms are disabled',()=>{
 const p=profile(),m=d.masters.find(m=>m.id==='konar'),entry=m.tasks.find(e=>e.id==='dagannoth');p.access['location:Waterbirth Island Dungeon']=0;
 const pool=c.konarPool(entry,p);assert.equal(pool.locations.length,3);assert.ok(pool.excluded.includes('Waterbirth Island'));
});
test('pool changes invalidate combat context only when restrictions are active',()=>{
 const p=profile();p.restrictBasicAccess=false;const normal=c.combatIdentity(p);p.access['location:Taverley Dungeon']=0;assert.equal(c.combatIdentity(p),normal);
 p.restrictBasicAccess=true;const restricted=c.combatIdentity(p);assert.notEqual(restricted,normal);p.access['location:Taverley Dungeon']=1;assert.notEqual(c.combatIdentity(p),restricted);
});
test('parent-disabled cards link to the parent instead of offering an ineffective child toggle',()=>{
 const p=profile();p.access['location:Waterbirth Island']=0;
 const html=account.renderAreaAccess(p,['location:Waterbirth Island','location:Waterbirth Island Dungeon'],'',false);
 assert.match(html,/data-key="location:Waterbirth Island Dungeon" disabled/);assert.match(html,/data-location-parent="location:Waterbirth Island"/);
});
test('restrictions round-trip per character and disabling the mode preserves saved ordinary-area choices',()=>{
 const p=profile();p.points=314;p.extensions={basilisks:true};const facts={quests:c.clone(p.quests),unlocks:c.clone(p.unlocks)};
 c.setLocationAccess(p,'location:Taverley Dungeon',false);let q=c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0];assert.equal(c.locationAccess('Taverley Dungeon',q).value,0);
 q.restrictBasicAccess=false;assert.equal(c.locationAccess('Taverley Dungeon',q).value,1);assert.equal(q.access['location:Taverley Dungeon'],0);
 q.restrictBasicAccess=true;assert.equal(c.locationAccess('Taverley Dungeon',q).value,0);assert.equal(q.points,314);assert.deepEqual(q.quests,facts.quests);assert.deepEqual(q.unlocks,facts.unlocks);assert.equal(q.extensions.basilisks,true);
});
test('location-pool blockers offer a direct correction destination in Settings',()=>{
 const p=profile();offVariant(p,'basilisk-knight');const plan=c.evaluate(d,d.masters.find(m=>m.id==='nieve'),p,[]);
 const issue=c.explainPlanIssues(d,plan,p).find(i=>i.action==='Review location pool');assert.ok(issue);assert.equal(issue.route,'settings');assert.ok(issue.filter.includes('Jormungand'));
});
test('an impossible saved completion method remains in the offer pool and needs a block or skip',()=>{
 const p=profile(),original=d.masters.find(m=>m.id==='nieve'),master={...original,tasks:original.tasks.filter(e=>['abyssal demons','hellhounds'].includes(e.id))};
 p.goal.targets=[{assignmentId:'abyssal demons',variantId:'abyssal-demon',priority:1}];p.methods.hellhounds={...c.defaultMethod(d,p,'hellhounds'),variantId:'hellhound'};offVariant(p,'hellhound');
 const data={...d,masters:d.masters.map(m=>m.id===master.id?master:m)},kept=c.evaluate(data,master,p,[]),row=kept.rows.find(r=>r.id==='hellhounds');
 assert.equal(row.reason,'');assert.ok(row.probability>0);assert.match(row.methodReason,/location pool/);assert.match(kept.reason,/completion method/);
 p.strategy='funded';const skipped=c.evaluate(data,master,p,[]);assert.equal(skipped.reason,'');assert.equal(skipped.rows.find(r=>r.id==='hellhounds').skip,1);assert.ok(skipped.chance<1);
});

test('capitalisation variants share one control and disabling either spelling affects both',()=>{
 const p=profile(),keys=c.locationPoolKeys(d,p),normal=s=>s.toLowerCase();assert.equal(new Set(keys.map(normal)).size,keys.length);
 c.setLocationAccess(p,'location:Clock Tower dungeon',false);assert.equal(c.locationAccess('Clock Tower Dungeon',p).value,0);
 c.setLocationAccess(p,'location:Clock Tower Dungeon',true);assert.equal(c.locationAccess('Clock Tower dungeon',p).value,1);
});
