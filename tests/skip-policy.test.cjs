const test=require('node:test'),assert=require('node:assert/strict');
const {buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
const code=buildSync({entryPoints:['src/ui/skip-policy.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
const ui={exports:{}};new Function('module','exports',code)(ui,ui.exports);
const master=d.masters.find(m=>m.id==='nieve');
function fixture(){
  const p=c.maxedProfile(d);p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];
  p.strategy='sustainable';return {p,plan:c.evaluate(d,master,p,[])};
}
test('selected hunt exposes every full skip and its partial budget boundary',()=>{
  const {p,plan}=fixture(),list=c.skipRecommendations(d,plan,p);
  assert.ok(list.full.length>1);assert.ok(list.partial.length);
  assert.deepEqual(list.full.map(i=>i.row.id).sort(),plan.rows.filter(r=>r.skip>=1-1e-9).map(r=>r.id).sort());
  const html=ui.exports.renderSkipPolicy(d,plan,p);
  for(const {row} of [...list.full,...list.partial])assert.ok(html.includes(row.name));
  assert.ok(html.includes((list.partial[0].fraction*100).toFixed(1)+'%'));
  assert.ok(html.indexOf('Skip whenever affordable')<html.indexOf('<details'));assert.match(html,/Time saved per point/);
});
test('blocked, ineligible, target and kept tasks do not enter calculated skip lists',()=>{
  const {p,plan}=fixture(),ids=plan.rows.filter(r=>!r.isTarget&&!r.reason).slice(0,4).map(r=>r.id);
  p.preferences[ids[0]]='keep';p.preferences[ids[1]]='protect';
  const next=c.evaluate(d,master,p,[ids[2]]);next.rows.find(r=>r.id===ids[3]).reason='Unavailable';
  const list=c.skipRecommendations(d,next,p),all=[...list.full,...list.partial];
  assert.ok(all.length);assert.ok(all.every(i=>!i.row.isTarget&&!ids.includes(i.row.id)));
});
test('saved skip preferences are explicit and disabled by complete-without-skipping',()=>{
  const {p,plan}=fixture(),row=plan.rows.find(r=>!r.isTarget&&!r.reason&&r.skip===0);
  p.preferences[row.id]='skip';p.preferences.hellhounds='skip';
  const preferred=c.evaluate(d,master,p,[]);
  assert.ok(c.skipRecommendations(d,preferred,p).full.some(i=>i.row.id===row.id&&i.manual));
  assert.ok(!c.skipRecommendations(d,plan,p).full.some(i=>i.row.isTarget));
  assert.match(ui.exports.renderSkipPolicy(d,preferred,p),/Saved preference/);
  p.strategy='none';const next=c.evaluate(d,master,p,[]);
  assert.deepEqual(c.skipRecommendations(d,next,p),{full:[],partial:[],resets:[]});
  assert.match(ui.exports.renderSkipPolicy(d,next,p),/No tasks to skip/);
});
test('reset tasks are distinct from points-paid skips and follow the simulation reset rule',()=>{
  const {p}=fixture();p.strategy='reset-turael';
  const plan=c.evaluate(d,master,p,[]),list=c.skipRecommendations(d,plan,p),turael=d.masters.find(m=>m.id==='turael');
  assert.ok(list.resets.length);assert.deepEqual(list.resets.map(r=>r.id).sort(),plan.rows.filter(r=>!r.reason&&!r.blocked&&!r.isTarget&&c.canReset(master,r.id,turael)).map(r=>r.id).sort());
  assert.equal(list.full.length,0);assert.match(ui.exports.renderSkipPolicy(d,plan,p),/Reset through Turael/);
});
test('unavailable plans show correction guidance instead of actionable skip lists',()=>{
  const {p,plan}=fixture();plan.reason='Cannot assign target';
  const html=ui.exports.renderSkipPolicy(d,plan,p);assert.match(html,/Resolve the plan issues/);assert.ok(!html.includes('Skip whenever'));
});
