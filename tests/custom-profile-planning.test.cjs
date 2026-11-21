// These fixtures exercise recorded equipment/manual timing rather than the all-gear preset.
function ownedScenario(data){const p=c.maxedProfile(data);p.assumeAllGear=false;p.combat.enabled=false;return p;}
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
function profile(){const p=ownedScenario(d);p.access={};p.quests=Object.fromEntries(Object.keys(p.quests).map(key=>[key,['Priest in Peril','A Porcine of Interest'].includes(key)?2:0]));p.questPoints=null;p.diaries.lumbridge=null;p.blockLimit=null;p.strategy='none';p.goal.targets=[{assignmentId:'dogs',variantId:'guard-dog',priority:1}];return p;}
const master=id=>d.masters.find(m=>m.id===id);

test('strict custom accounts can calculate a zero-block baseline without knowing maximum block capacity',()=>{
 const p=profile();for(const id of ['turael','spria','mazchna']){
  const result=c.optimise(d,master(id),p,20);assert.ok(result.chance>0,id+': '+result.reason);assert.equal(result.blocks.length,0);assert.ok(!result.unknown.includes('Block-slot eligibility'));assert.match(result.quality,/baseline uses confirmed block capacity/);
 }
});

test('missing quest eligibility remains unknown even though zero blocks no longer requires a capacity confirmation',()=>{
 const p=profile();delete p.quests['Priest in Peril'];const result=c.optimise(d,master('turael'),p,20);
 assert.equal(result.chance,null);assert.ok(result.unknown.includes('Priest in Peril'));assert.ok(!result.unknown.includes('Block-slot eligibility'));assert.equal(p.quests['Priest in Peril'],undefined);
});

test('unconfirmed block capacity still gates proposed blocks and known capacity still rejects oversized lists',()=>{
 const p=profile(),m=master('turael'),unconfirmed=c.evaluate(d,m,p,['bats']);assert.equal(unconfirmed.chance,null);assert.ok(unconfirmed.unknown.includes('Block-slot eligibility'));assert.ok(!unconfirmed.conflicts.some(s=>s.includes('exceeds 0')));
 p.blockLimit=0;const impossible=c.evaluate(d,m,p,['bats']);assert.match(impossible.reason,/exceeds 0 slots/);
 p.blockLimit=null;p.questPoints=300;p.diaries.lumbridge=null;const withinMinimum=c.evaluate(d,m,p,['bats']);assert.ok(withinMinimum.chance>0);assert.ok(!withinMinimum.unknown.includes('Block-slot eligibility'));
});

test('automatic non-target methods prefer a confirmed ordinary variant over an unconfirmed low-HP specialist',()=>{
 const p=profile(),rows=c.prepareRows(d,master('spria'),p);
 for(const row of rows.filter(r=>!r.reason&&!r.isTarget))assert.ok(!row.unknown.some(s=>s.includes('Confirm access and repeatable method')),row.name+' / '+row.variant.name);
 const cows=rows.find(r=>r.id==='cows');assert.notEqual(cows.variant.id,'cow-calf');assert.deepEqual(c.check(cows.variant.requirements,p).unknown,[]);
});

test('an explicitly chosen unconfirmed method is retained and its requirement is still actionable',()=>{
 const p=profile();p.methods.cows={...c.defaultMethod(d,p,'cows'),variantId:'cow-calf'};
 const result=c.evaluate(d,master('spria'),p,[]),row=result.rows.find(r=>r.id==='cows');assert.equal(row.variant.id,'cow-calf');assert.ok(row.unknown.length);assert.equal(result.chance,null);assert.ok(c.explainPlanIssues(d,result,p).some(i=>i.title.includes('Cow calf')));
});

test('all-hidden master view explains the most relevant capable master and links to account corrections',()=>{
 const p=profile();delete p.quests['Priest in Peril'];const plans=d.masters.map(m=>c.optimise(d,m,p,10));
 const bundle=buildSync({entryPoints:['src/ui/plan-issues.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,sandbox={module:{exports:{}},exports:{},structuredClone,console};vm.runInNewContext(bundle,sandbox);
 const html=sandbox.module.exports.renderUnavailableHunt(d,plans,p);assert.match(html,/What needs attention/);assert.match(html,/Turael/);assert.match(html,/Priest in Peril/);assert.match(html,/<details class="plan-issues" open/);assert.match(html,/data-route="account"/);assert.match(html,/Wiki source/);
 assert.equal(sandbox.module.exports.renderUnavailableHunt(d,[],p),'');
});
