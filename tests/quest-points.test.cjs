const test=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),fs=require('node:fs'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue,metadata=require('../data/quest-points.json');
const main=d.masters.find(m=>m.id==='nieve'),mortimer=d.masters.find(m=>m.id==='mortimer');
const row=(name,state='FINISHED')=>({name,state});
const text=quests=>JSON.stringify({exported_at:'2026-11-21T12:00:00Z',quests});
const fresh=()=>c.newCharacter(d,'Quest test',false);
const apply=(p,rows,preserve=true)=>c.applyQuestImport(d,p,c.parseQuestImport(d,text(rows)),preserve,'2026-11-21T12:00:01Z');
const full=(state='NOT_STARTED')=>metadata.quests.map(q=>row(q.aliases.find(a=>a.includes(' '))||q.name,state));
const uiCode=buildSync({entryPoints:['src/ui/quest-points.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,ui={exports:{}};
new Function('module','exports',uiCode)(ui,ui.exports);
test('quest points include non-access quests, count only completed standard rewards and retain partial uncertainty',()=>{
 const p=apply(fresh(),[row("Cook's Assistant"),row('Demon Slayer'),row("Doric's Quest",'IN_PROGRESS'),row('Romeo & Juliet','NOT_STARTED')]),result=c.derivedQuestPoints(p);
 assert.equal(result.minimum,4);assert.equal(result.complete,false);assert.equal(p.questImport.states["Cook's Assistant"],undefined);assert.equal(p.questImport.pointStates["Cook's Assistant"],2);
 assert.match(ui.exports.questPointSummary(p),/At least 4 confirmed quest points/);
});
test('complete quest snapshots derive a total, including a true zero, and exports round-trip reward states',()=>{
 let p=apply(fresh(),full());assert.deepEqual(c.blockSlots(main,p),{slots:0,unknown:true}); // Diary is still unknown.
 p.diaries.lumbridge=0;assert.deepEqual(c.blockSlots(main,p),{slots:0,unknown:false});assert.equal(c.derivedQuestPoints(p).complete,true);
 p=apply(fresh(),full('FINISHED'));assert.equal(c.derivedQuestPoints(p).minimum,metadata.maximum);assert.equal(c.derivedQuestPoints(p).complete,true);
 assert.deepEqual(c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0],p);
});
test('Recipe for Disaster awards partial subquests and never double-counts its parent',()=>{
 let rows=full().filter(r=>!r.name.startsWith('Recipe for Disaster'));
 rows.push(row('RECIPE_FOR_DISASTER','IN_PROGRESS'),row('RECIPE_FOR_DISASTER__ANOTHER_COOKS_QUEST'),row('Recipe for Disaster - Wartface & Bentnoze'));
 let p=apply(fresh(),rows);assert.equal(c.derivedQuestPoints(p).minimum,2);assert.equal(c.derivedQuestPoints(p).complete,false);
 p=apply(fresh(),full().map(r=>r.name.startsWith('Recipe for Disaster')?row(r.name):r));assert.equal(c.derivedQuestPoints(p).minimum,10);assert.equal(c.derivedQuestPoints(p).complete,true);
 p=apply(fresh(),full().map(r=>r.name==='Recipe for Disaster'?row(r.name):r));assert.equal(c.derivedQuestPoints(p).minimum,10);
});
test('manual quest overrides affect totals, while a manual total remains authoritative until cleared',()=>{
 let p=fresh();p.quests["Cook's Assistant"]=0;p.questPoints=249;p.points=123;
 p=apply(p,[row("Cook's Assistant"),row('Demon Slayer')]);assert.equal(c.derivedQuestPoints(p).minimum,3);assert.deepEqual(c.questPointAllowance(p),{minimum:249,complete:true});assert.equal(p.points,123);
 p.questPoints=null;assert.equal(c.questPointAllowance(p).minimum,3);p=apply(p,[row("Cook's Assistant"),row('Demon Slayer')],false);assert.equal(c.derivedQuestPoints(p).minimum,4);
 assert.equal(p.quests["Cook's Assistant"],undefined);
});
test('partial lists grant only confirmed block slots, and complete or capped totals remove QP uncertainty',()=>{
 let p=fresh();p.diaries.lumbridge=0;
 const ones=metadata.quests.filter(q=>q.points===1&&!q.part&&q.name!=='Recipe for Disaster').slice(0,50);assert.equal(ones.length,50);
 p=apply(p,ones.map(q=>row(q.name)));assert.deepEqual(c.blockSlots(main,p),{slots:1,unknown:true});
 p.diaries.lumbridge=1;assert.deepEqual(c.blockSlots(main,p),{slots:2,unknown:true});assert.deepEqual(c.blockSlots(mortimer,p),{slots:2,unknown:false});
 p.blockLimit=4;assert.deepEqual(c.blockSlots(main,p),{slots:4,unknown:false});p.blockLimit=null;
 p=apply(p,full('FINISHED'));assert.deepEqual(c.blockSlots(main,p),{slots:7,unknown:false});
});
test('unknown started/completed quests prevent exact totals; miniquests contribute zero',()=>{
 let p=apply(fresh(),[...full(),row('Future reward quest')]);assert.equal(c.derivedQuestPoints(p).complete,false);assert.deepEqual(c.derivedQuestPoints(p).unmapped,['Future reward quest']);
 p=apply(fresh(),[...full(),row('Future reward quest','NOT_STARTED')]);assert.equal(c.derivedQuestPoints(p).complete,true);assert.equal(c.derivedQuestPoints(p).minimum,0);
 p=apply(fresh(),[row('Mage Arena I'),row('Enter the Abyss')]);assert.equal(c.derivedQuestPoints(p).minimum,0);
});
test('legacy filtered imports stay usable as incomplete data and malformed reward facts are rejected',()=>{
 const p=fresh();p.questImport={format:'Legacy',playerName:null,exportedAt:null,importedAt:null,states:{'Bone Voyage':2}};
 assert.equal(c.derivedQuestPoints(p).minimum,1);assert.equal(c.derivedQuestPoints(p).complete,false);assert.equal(c.validateProfile(d,p).questImport.pointStates,undefined);
 for(const pointStates of [null,[],{"Cook's Assistant":1.5}])assert.throws(()=>c.validateProfile(d,{...p,questImport:{...p.questImport,pointStates}}),/quest point states/);
 assert.throws(()=>c.parseQuestImport(d,text([row("Cook's Assistant"),row('COOKS_ASSISTANT','NOT_STARTED')])) ,/Conflicting/);
});
test('setup stops requesting quest points after full derivation, and QP changes do not invalidate gear caches',()=>{
 let p=fresh();p.points=500;assert.equal(c.setupUnanswered(d,p).points,true);
 p=apply(p,full());assert.equal(c.setupUnanswered(d,p).points,false);const identity=c.combatIdentity(p);p.questPoints=123;assert.equal(c.combatIdentity(p),identity);
 const maxed=c.maxedProfile(d);assert.equal(maxed.questPoints,metadata.maximum);assert.equal(c.blockSlots(main,maxed).slots,7);
});
test('quest point metadata regenerates identically offline and retains table and RuneLite provenance',()=>{
 const before=fs.readFileSync('data/quest-points.json');execFileSync('python',['tools/build_quest_points.py']);assert.deepEqual(fs.readFileSync('data/quest-points.json'),before);
 assert.equal(metadata.quests.filter(q=>q.part).length,10);assert.ok(metadata.quests.some(q=>q.aliases.includes('RECIPE_FOR_DISASTER__WARTFACE__BENTNOZE')));assert.ok(metadata.source.revision);assert.match(fs.readFileSync('data/quest-point-sources/Quest.java','utf8'),/Redistribution and use/);
});
