const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const d=require('../data/catalogue.json');
test('catalogue references, quantities, weights and revisions are valid',()=>{
 const unique=(rows)=>assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
 unique(d.masters);unique(d.assignments);unique(d.variants);
 for(const m of d.masters){unique(m.tasks);assert.ok(m.source.revision);for(const t of m.tasks){assert.ok(d.assignments.some(a=>a.id===t.id));assert.ok(t.source.revision);assert.ok(t.weight>0);assert.ok(t.maximum>=t.minimum&&t.minimum>0);assert.ok(t.extendedMax>=t.extendedMin);}}
 for(const a of d.assignments)for(const id of a.variantIds)assert.ok(d.variants.some(v=>v.id===id&&v.assignmentIds.includes(a.id)));
 for(const v of d.variants){assert.ok(v.hp>0&&v.multiplier>0);assert.ok(v.source.revision||v.status.includes('estimate'));}
 assert.equal(d.masters.length,10);assert.equal(d.masters.reduce((s,m)=>s+m.tasks.length,0),358);
});
test('catalogue generation is reproducible from pinned data-only sources',()=>{
 const file=path.resolve('.desktop-build/catalogue-check.json');cp.execFileSync('python',['tools/build_catalogue.py','--output',file]);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),d);fs.unlinkSync(file);
});
test('special row and boss-roll safety are explicit',()=>{
 const row=d.masters.find(m=>m.id==='krystilia').tasks.find(t=>t.id==='boss');assert.equal(row.weight,8);assert.equal(row.minimum,3);assert.equal(row.maximum,35);assert.ok(row.requirements.some(r=>r.key==='like-a-boss'));
 assert.deepEqual(d.assignments.find(a=>a.id==='boss').variantIds,['boss-pool']);assert.ok(d.audit.some(a=>a.assignment==='boss'));
});
test('Konar locations and alternative variant properties are separate',()=>{
 const row=d.masters.find(m=>m.id==='konar').tasks.find(t=>t.id==='basilisks');assert.ok(row.locations.some(x=>x.includes('Jormungand')));
 assert.equal(d.variants.find(v=>v.id==='basilisk').hp,75);assert.equal(d.variants.find(v=>v.id==='basilisk-knight').hp,300);
});
