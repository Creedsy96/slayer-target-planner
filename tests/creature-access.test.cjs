const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild'),fs=require('node:fs'),cp=require('node:child_process');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
function profile(){const p=c.maxedProfile(d);p.combat.enabled=false;p.assumeAllGear=false;p.strategy='none';return p;}
function moduleAt(file){const m={exports:{}},code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;new Function('module','exports',code)(m,m.exports);return m.exports;}
test('every generated confirmation is audited from retained sources and regenerates deterministically',()=>{
 const keys=d.variants.filter(v=>v.requirements.some(r=>r.key==='variant:'+v.id)).map(v=>v.id).sort();assert.equal(keys.length,167);assert.deepEqual(Object.keys(c.CREATURE_ACCESS).sort(),keys);
 for(const [id,r]of Object.entries(c.CREATURE_ACCESS)){assert.ok(r.source.revision,id);assert.ok(r.note,id);if(r.mode==='derived')assert.ok(r.locations.length,id);}
 const output='.desktop-build/verification/creature-access-check.json';fs.mkdirSync('.desktop-build/verification',{recursive:true});cp.execFileSync('python',['tools/build_creature_access.py','--output',output]);assert.deepEqual(JSON.parse(fs.readFileSync(output)),require('../data/creature-access.json'));
});
test('Deviant spectres no longer make an unrelated strict Konar hunt unavailable',()=>{
 const p=profile();p.goal.targets=[{assignmentId:'cave kraken',variantId:'cave-kraken',priority:1}];delete p.access['variant:deviant-spectre'];
 const plan=c.evaluate(d,d.masters.find(m=>m.id==='konar'),p,[]);assert.equal(plan.reason,'');assert.ok(plan.chance>0);
 const row=plan.rows.find(r=>r.id==='aberrant spectres').locationOutcomes.find(o=>o.location==='Catacombs of Kourend').row;assert.equal(row.variant.id,'deviant-spectre');assert.deepEqual(row.unknown,[]);
 p.access['variant:deviant-spectre']=0;assert.equal(c.resolveAccess('variant:deviant-spectre',p).value,1);
 p.restrictBasicAccess=true;assert.equal(c.resolveAccess('variant:deviant-spectre',p).value,0);
});
test('ordinary alternatives derive access while retaining their actual Slayer requirements',()=>{
 const p=profile();for(const id of ['deviant-spectre','warped-jelly','mutated-bloodveld','greater-nechryael','brutal-black-dragon','sulphur-lizard']){
  delete p.access['variant:'+id];assert.equal(c.resolveAccess('variant:'+id,p).value,1,id);
 }
 p.levels.slayer=59;const denied=c.resolveAccess('variant:deviant-spectre',p);assert.equal(denied.value,0);assert.match(denied.reason,/Deviant spectre at Catacombs of Kourend.*Slayer 60/);
});
test('a creature with no Slayer requirement does not ask for an unknown Slayer level',()=>{
 const p=c.newCharacter(d,'No export yet',false);assert.equal(p.levels.slayer,null);
 assert.equal(c.resolveAccess('variant:dungeon-rat',p).value,1);
 assert.deepEqual(c.check([{kind:'skill',key:'slayer',min:0,label:'Slayer'}],p),{eligible:true,unknown:[],failed:[]});
});
test('quest imports derive dragon/wyvern/island access and manual Yes cannot bypass a failed quest',()=>{
 const p=profile();for(const [id,q]of [['rune-dragon','Dragon Slayer II'],['taloned-wyvern','Bone Voyage'],['ammonite-crab','Bone Voyage'],['tortured-gorilla','Monkey Madness II']]){
  delete p.quests[q];p.questImport={states:{[q]:0}};p.access['variant:'+id]=1;
  assert.equal(c.resolveAccess('variant:'+id,p).value,0,id);
  p.questImport.states[q]=2;assert.equal(c.resolveAccess('variant:'+id,p).value,1,id);
 }
});
test('alternative locations are an OR and complete quests prove partial-stage routes without another checkbox',()=>{
 const p=profile();delete p.access['variant:chilled-jelly'];p.quests['The Heart of Darkness']=0;p.levels.sailing=87;assert.equal(c.resolveAccess('variant:chilled-jelly',p).value,1);
 p.levels.sailing=86;assert.equal(c.resolveAccess('variant:chilled-jelly',p).value,0);
 delete p.access['variant:monkey-guard'];p.quests['Monkey Madness I']=1;assert.equal(c.resolveAccess('variant:monkey-guard',p).value,null);
 p.quests['Monkey Madness I']=2;assert.equal(c.resolveAccess('variant:monkey-guard',p).value,1);
});
test('remaining special checks and warning links identify the creature and its location',()=>{
 const p=profile();delete p.access['variant:bryophyta'];const result=c.resolveAccess('variant:bryophyta',p);assert.equal(result.value,null);assert.match(result.reason,/Bryophyta at Varrock Sewers/);assert.match(result.reason,/boss-entry item/);
 const ui=moduleAt('src/ui/account-import.ts');ui.resetAccessChecklist();const html=ui.renderSpecialAccess(d,p,c.knownAccessKeys(d),'Bryophyta');assert.match(html,/Bryophyta.*Varrock Sewers/);assert.match(html,/Unconfirmed/);assert.doesNotMatch(html,/displayed off/);
 const text=html.replace(/<[^>]*>/g,'');assert.doesNotMatch(text,/variant:/);
 assert.doesNotMatch(ui.renderSpecialAccess(d,p,c.knownAccessKeys(d),'Deviant spectre'),/data-key="variant:deviant-spectre"/);
 p.goal.targets=[{assignmentId:'moss giants',variantId:'bryophyta',priority:1}];const plan=c.evaluate(d,d.masters.find(m=>m.id==='vannaka'),p,[]);
 const issue=c.explainPlanIssues(d,plan,p).find(i=>i.title.includes('Bryophyta'));assert.ok(issue);assert.match(issue.title+' '+issue.detail,/Varrock Sewers/);assert.equal(issue.filter,'Bryophyta');
});
test('assignment quests remain real eligibility conditions after removing blanket creature gates',()=>{
 const p=profile();p.quests['Priest in Peril']=0;const plan=c.evaluate(d,d.masters.find(m=>m.id==='konar'),p,[]);
 assert.match(plan.rows.find(r=>r.id==='aberrant spectres').reason,/Priest in Peril/);assert.equal(c.resolveAccess('variant:deviant-spectre',p).value,1);
});
test('fully skipped non-target methods do not require a creature confirmation or show a false warning',()=>{
 const p=profile();p.strategy='funded';p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];
 p.methods['moss giants']={...c.defaultMethod(d,p,'moss giants'),variantId:'bryophyta',location:'Varrock Sewers'};delete p.access['variant:bryophyta'];
 const original=d.masters.find(m=>m.id==='vannaka'),master={...original,tasks:original.tasks.filter(t=>['hellhounds','moss giants'].includes(t.id))},data={...d,masters:d.masters.map(m=>m.id===master.id?master:m)};
 const plan=c.evaluate(data,master,p,[]);assert.equal(plan.reason,'');assert.equal(plan.rows.find(r=>r.id==='moss giants').skip,1);assert.ok(!c.explainPlanIssues(data,plan,p).some(i=>/Bryophyta/.test(i.title+' '+i.detail)));
 p.strategy='none';const kept=c.evaluate(data,master,p,[]);assert.match(kept.reason,/Bryophyta at Varrock Sewers/);
});
test('Konar method warnings name the actual creature in the failed area',()=>{
 const p=profile();p.restrictBasicAccess=true;p.access['variant:deviant-spectre']=0;p.goal.targets=[{assignmentId:'cave kraken',variantId:'cave-kraken',priority:1}];
 const plan=c.evaluate(d,d.masters.find(m=>m.id==='konar'),p,[]);assert.match(plan.rows.find(r=>r.id==='aberrant spectres').methodReason,/Deviant spectre at Catacombs of Kourend/);
 const issues=c.explainPlanIssues(d,plan,p);assert.ok(issues.some(i=>/Deviant spectre/.test(i.title)&&/Catacombs of Kourend/.test(i.title+' '+i.detail)));
 const {renderPlanIssues}=moduleAt('src/ui/plan-issues.ts');assert.match(renderPlanIssues(d,plan,p),/Plan needs attention/);
});
