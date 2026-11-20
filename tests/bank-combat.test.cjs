const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
const text=(kind,items,extra={})=>JSON.stringify({kind,items,exported_at:'2026-11-20T00:00:00Z',...extra});
const row=(id,quantity=1)=>({id,quantity,name:'ignored; IDs own identity'});
function profile(names=[]){const p=c.maxedProfile(d);p.bank=c.emptyBank();p.combat=c.defaultCombat();p.combat.enabled=true;for(const name of names){const i=c.itemForLabel(name);assert.ok(i,name);p.bank.manual[i.id]=1;}return p;}
function target(id,approach='melee-tank'){
 const record=g.GUIDE.records[id];assert.ok(record,id);const state={...g.defaultGuideState(),variantId:id,formId:record.defaultForm,approach};const form=g.guideForm(record,state);return {record,state,form,location:g.selectedLocation(record,form,state)};
}
const best=(p,t)=>c.bestOwnedGear(p,t.record,t.form,t.state,t.location);

test('indexed engine aliases preserve upstream first-match semantics for every recorded alias',()=>{
 const source=buildSync({stdin:{contents:'export {canonicalId} from "./vendor/osrs-dps/runtime.js"; export {default as aliases} from "./vendor/osrs-dps/source/src/lib/EquipmentAliases.ts";',resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
 const sandbox={exports:{},module:{exports:{}},structuredClone,console};vm.runInNewContext(source,sandbox);
 const aliases=sandbox.module.exports.aliases;
 for(const id of new Set(Object.values(aliases).flat())){
  const original=Object.entries(aliases).find(([,ids])=>ids.includes(id));
  assert.equal(sandbox.module.exports.canonicalId(id),Number(original[0]));
 }
});

test('task headgear survives raw-stat pruning in a large owned helmet collection',()=>{
 const p=profile(['Abyssal whip','Slayer helmet (i)']);p.combat.allowUnknownRequirements=true;
 for(const item of c.ITEMS.filter(i=>i.slot==='head'&&i.bonuses.str>0&&!/slayer|black mask/i.test(i.name)))p.bank.manual[item.id]=1;
 const t=target('hellhound'),gear={weapon:c.itemForLabel('Abyssal whip').id,head:c.itemForLabel('Slayer helmet (i)').id};
 const reference=c.calculateCombat(p,t.record,t.form,gear,{name:'Accurate',type:'slash',stance:'Accurate'},null,true,false);
 assert.equal(reference.supported,true);assert.ok(best(p,t).dps>=reference.dps);
});
test('example item names resolve to usable canonical items rather than broken or alternate minigame versions',()=>{
 for(const [name,id]of [['Fire cape',6570],['Dragon defender',12954],['Slayer helmet (i)',11865]]){
  const item=c.itemForLabel(name);assert.equal(item.id,id);assert.doesNotMatch(item.version,/broken/i);assert.equal(c.canEquip(item,c.maxedProfile(d)),true);
 }
});

test('bank snapshots normalise noted equipment, combine duplicates and omit zero/placeholder items',()=>{
 const preview=c.parseBankImport(text('bank',[row(4151),row(4152,2),row(1205,0),{...row(1277),placeholder:true},row(999998)]));
 assert.equal(preview.snapshot.items[4151],3);assert.equal(preview.snapshot.items[4152],undefined);assert.equal(preview.snapshot.items[1205],undefined);assert.equal(preview.snapshot.items[1277],undefined);assert.equal(preview.snapshot.items[999998],1);assert.equal(preview.snapshot.account,null);
 assert.ok(preview.warnings.some(w=>w.includes('account')));
});
test('manual quantities survive snapshot replacements; group gear is an independent optional source',()=>{
 let p=profile();p.bank.manual[4151]=1;
 p=c.applyBankSnapshots(p,[c.parseBankImport(text('bank',[row(4151,20),row(1277)])),c.parseBankImport(text('group_storage',[row(6585)]))],null,null,true);
 assert.equal(c.ownedQuantities(p.bank)[4151],1);assert.equal(c.ownedQuantities(p.bank)[6585],undefined);
 p.bank.includeGroup=true;assert.equal(c.ownedQuantities(p.bank)[6585],1);
 p.bank.manual[4151]=0;assert.equal(c.ownedQuantities(p.bank)[4151],0);
 const before=JSON.stringify(p);const next=c.applyBankSnapshots(p,[c.parseBankImport(text('bank',[row(4151,5)]))],null,null,true);
 assert.equal(c.ownedQuantities(next.bank)[4151],0);assert.equal(JSON.stringify(p),before);assert.ok(next.bank.snapshots.group_storage);
});
test('malformed imports, unknown sources and unsafe quantities are rejected without changing a profile',()=>{
 const p=profile(['Abyssal whip']),before=JSON.stringify(p);
 for(const data of [text('unknown',[row(1)]),text('bank',[row(1,-1)]),text('bank',[row(1,1.2)]),text('bank',[row(-1)]),text('bank',[row(1,2147483648)]),'[1,2,3]','{"kind":"bank","items":[],"__proto__":{}}'])assert.throws(()=>c.parseBankImport(data));
 assert.throws(()=>c.parseBankImport(' '.repeat(5000001)),/5 MB/);assert.throws(()=>c.validateBank({...p.bank,manual:{4151:Infinity}}));assert.equal(JSON.stringify(p),before);
});
test('character exports import base skills, preserve account identity and cannot mix characters',()=>{
 const skills=Object.fromEntries(['Attack','Strength','Defence','Ranged','Magic','Prayer','Hitpoints'].map(name=>[name,{real_level:80,boosted_level:99,experience:2000000}]));
 const character=c.parseCharacterLevels(JSON.stringify({account_name:'Test Player',stats:skills}));assert.equal(character.levels.attack,80);assert.equal(character.account,'Test Player');
 const p=profile();const next=c.applyBankSnapshots(p,[],character.levels,character.account,true);assert.equal(next.levels.attack,80);assert.equal(next.bank.account,'Test Player');assert.equal(p.levels.attack,99);
 assert.throws(()=>c.applyBankSnapshots(next,[],character.levels,'Someone Else',true),/different accounts/);
 assert.throws(()=>c.parseCharacterLevels('{"stats":{"Attack":{"boosted_level":99}}}'),/base combat/);
});
test('bank and combat assumptions round-trip through normal profile backups and reject forged computed timings',()=>{
 const p=profile(['Abyssal whip']);p.bank.includeGroup=true;p.combat.prayer='standard';p.restrictBasicAccess=true;
 const imported=c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0];assert.deepEqual(imported,p);
 const method={...c.defaultMethod(d,p,'hellhounds'),calculated:{ttk:.001,dps:999,weaponId:4151}};p.methods.hellhounds=method;
 assert.equal(c.validateProfile(d,p).methods.hellhounds.calculated,undefined);
 assert.throws(()=>c.validateProfile(d,{...p,combat:{...p.combat,uptime:0}}),/combat assumptions/);
});
test('basic melee max hit and accuracy agree with the independent standard roll fixture',()=>{
 const p=profile(['Abyssal whip']),t=target('abyssal-demon');
 const form={...t.form,def:135,dslash:20};const weapon=c.itemForLabel('Abyssal whip');
 const result=c.calculateCombat(p,t.record,form,{weapon:weapon.id},{name:'Flick',type:'slash',stance:'Accurate'},null,false,false);
 assert.equal(result.supported,true);assert.equal(result.maxHit,24);assert.equal(result.attackSeconds,2.4);
 assert.ok(Math.abs(result.hitChance-(1-(12096+2)/(2*(16060+1))))<1e-10);assert.ok(result.dps>0);assert.ok(result.ttk>0);
});
test('the browser calculation adapter works without Node process or other server globals',()=>{
 const code=buildSync({entryPoints:['src/combat/calculate.ts'],bundle:true,write:false,format:'cjs',platform:'browser'}).outputFiles[0].text;
 const context={module:{exports:{}},structuredClone};vm.runInNewContext(code,context);
 const p=profile(['Abyssal whip']),t=target('abyssal-demon'),weapon=c.itemForLabel('Abyssal whip');
 const result=context.module.exports.calculateCombat(p,t.record,t.form,{weapon:weapon.id},{name:'Flick',type:'slash',stance:'Accurate'},null,false,false);
 assert.equal(result.supported,true,result.reason);assert.equal(result.maxHit,24);
});
test('required shields, two-handed conflicts, ammo compatibility and unusable spells are respected',()=>{
 const p=profile(['Abyssal whip']),knight=target('basilisk-knight');assert.match(best(p,knight).reason,/required Off-hand/);
 p.bank.manual[c.itemForLabel('Mirror shield').id]=1;const equipped=best(p,knight);assert.equal(equipped.supported,true);assert.equal(equipped.loadout.shield,c.itemForLabel('Mirror shield').id);
 const scythe=c.itemForLabel('Scythe of Vitur'),shield=c.itemForLabel('Mirror shield');assert.equal(c.calculateCombat(p,knight.record,knight.form,{weapon:scythe.id,shield:shield.id},{name:'Reap',type:'slash',stance:'Aggressive'},null,true,false).supported,false);
 const bow=c.itemForLabel('Magic shortbow (i)'),bolts=c.itemForLabel('Broad bolts');assert.equal(c.calculateCombat(p,knight.record,knight.form,{weapon:bow.id,ammo:bolts.id},{name:'Rapid',type:'ranged',stance:'Rapid'},null,true,false).supported,false);
 p.levels.magic=1;assert.match(c.calculateCombat(p,knight.record,knight.form,{weapon:c.itemForLabel('Ancient staff').id},{name:'Spell',type:'magic',stance:'Autocast'},'Ice Barrage',true,false).reason,/Magic level/);
});
test('manual upgrades and removals invalidate cached results and respect known equip requirements',()=>{
 const p=profile(['Dragon sword']),t=target('hellhound');const before=best(p,t);assert.ok(before.supported);
 const whip=c.itemForLabel('Abyssal whip');p.bank.manual[whip.id]=1;const after=best(p,t);assert.ok(after.dps>=before.dps);p.bank.manual[whip.id]=0;assert.equal(best(p,t).dps,before.dps);
 p.levels.attack=1;assert.equal(c.canEquip(whip,p),false);p.levels.attack=70;assert.equal(c.canEquip(whip,p),true);
});
test('calculated timing uses expected hits-to-kill, uptime and delay once, without legacy multipliers',()=>{
 const p=profile(['Abyssal whip','Dragon defender']);p.combat.uptime=80;
 const v=d.variants.find(v=>v.id==='hellhound'),method={...c.defaultMethod(d,p,'hellhounds'),variantId:v.id,delay:3,travel:2};
 const resolved=c.withCalculatedTiming(p,v,method);assert.ok(resolved.calculated);
 const master=d.masters.find(m=>m.id==='nieve'),entry=master.tasks.find(t=>t.id==='hellhounds');
 const timing=c.taskTiming(entry,{...v,multiplier:999},resolved);assert.equal(timing.seconds,resolved.calculated.ttk+3);assert.equal(timing.minutes,timing.kills*timing.seconds/60+2);
 const row=c.prepareRows(d,master,{...p,goal:{...p.goal,targets:[{assignmentId:'hellhounds',variantId:v.id,priority:1}]}}).find(r=>r.id==='hellhounds');assert.ok(row.method.calculated);
 for(const strategy of ['boost-turael','boost-mazchna','reset-turael']){const q={...p,strategy};const filler=d.masters.find(m=>m.id=== (strategy==='boost-mazchna'?'mazchna':'turael'));assert.ok(c.prepareRows(d,filler,q).some(row=>row.method.calculated));}
});
test('measured/manual rates and boss encounters retain explicit full-fight timing',()=>{
 const p=profile(['Abyssal whip']),v=d.variants.find(v=>v.id==='hellhound'),method={...c.defaultMethod(d,p,'hellhounds'),variantId:v.id};
 assert.equal(c.withCalculatedTiming(p,v,{...method,timing:'kills-hour',rate:100}).calculated,undefined);
 assert.equal(c.withCalculatedTiming(p,v,{...method,manualCombat:true}).calculated,undefined);
 const boss=d.variants.find(v=>v.id==='cerberus');const result=c.withCalculatedTiming(p,boss,{...method,variantId:boss.id});assert.equal(result.calculated,undefined);assert.match(result.combatNote,/Boss/);
});
test('a deterministic full simulation consumes the same calculated row time',()=>{
 const p=profile(['Abyssal whip']),original=d.masters.find(m=>m.id==='nieve'),entry=original.tasks.find(t=>t.id==='hellhounds');
 const master={...original,tasks:[{...entry,minimum:10,maximum:10}]},data={...d,masters:[...d.masters.filter(m=>m.id!=='nieve'),master]};
 p.goal={...p.goal,kind:'kills',quantity:3,targets:[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}]};p.strategy='none';p.simulation.trials=100;
 const plan=c.evaluate(data,master,p,[]);const row=plan.rows.find(r=>r.id==='hellhounds');assert.ok(row.method.calculated);
 const result=c.simulate(data,plan,p);assert.equal(result.unresolved,0);assert.ok(Math.abs(result.meanHours-3*row.seconds/3600)<1e-10);
});
test('open-area defaults are source-backed and reversible, while quest gates remain intact',()=>{
 const p=c.newProfile(d);p.access['location:Taverley Dungeon']=0;
 assert.equal(c.resolveAccess('location:Taverley Dungeon',p).value,1);p.restrictBasicAccess=true;assert.equal(c.resolveAccess('location:Taverley Dungeon',p).value,0);
 delete p.access['location:Taverley Dungeon'];assert.equal(c.resolveAccess('location:Taverley Dungeon',p).value,1);
 p.quests['Song of the Elves']=0;assert.equal(c.resolveAccess('location:Iorwerth Dungeon',p).value,0);
 for(const area of c.OPEN_AREAS){assert.ok(area.source.revision);assert.ok(area.note);assert.equal(c.isOpenArea(area.key),true);}
});
test('every guide source form has deterministic NPC handling and owned artwork fits its atlas',()=>{
 for(const record of Object.values(g.GUIDE.records)){const form=g.guideForm(record,{...g.defaultGuideState(),formId:record.defaultForm});assert.ok(c.monsterFor(record,form),record.id);}
 const art=require('../src/ui/owned-art.json'),png=fs.readFileSync('assets/owned-items.png');assert.equal(png.readUInt32BE(16),art.columns*art.cell);assert.equal(png.readUInt32BE(20),art.rows*art.cell);assert.ok(Object.keys(art.entries).length>=5000);
});
test('HP-dependent kill-time recurrence includes zero-damage loops, changing damage and overkill',()=>{
 assert.equal(c.expectedKillSeconds(5,()=>[{damage:0,probability:.5,seconds:3},{damage:2,probability:.5,seconds:3}]),18);
 assert.equal(c.expectedKillSeconds(4,hp=>[{damage:hp>=3?2:1,probability:1,seconds:2}]),6);
 assert.equal(c.expectedKillSeconds(1,()=>[{damage:0,probability:.5,seconds:4},{damage:1,probability:.5,seconds:3}]),7);
 assert.throws(()=>c.expectedKillSeconds(0,()=>[]));assert.equal(c.expectedKillSeconds(3,()=>[{damage:0,probability:1,seconds:2}]),Infinity);
 const p=profile(['Dragon crossbow','Ruby dragon bolts (e)']),t=target('black-dragon');
 const result=c.calculateCombat(p,t.record,t.form,{weapon:c.itemForLabel('Dragon crossbow').id,ammo:c.itemForLabel('Ruby dragon bolts (e)').id},{name:'Rapid',type:'ranged',stance:'Rapid'},null,false,false);
 assert.equal(result.supported,true,result.reason);assert.equal(result.hpDependent,true);assert.ok(result.ttk>0);assert.ok(result.notes.some(note=>note.includes('HP-dependent')));
});
test('broken and uncharged bank items are not silently repaired by equipment aliases',()=>{
 const p=profile();p.bank.manual[20445]=1;p.bank.manual[11908]=1;
 assert.ok(c.ownedItems(p).every(item=>!/broken|uncharged/i.test(item.version)));
 assert.ok(!c.ownedItems(p).some(item=>item.id===6570||item.id===11905));
});
test('full-set seeds preserve Void synergy when individually stronger pieces are also owned',()=>{
 const p=profile(['Magic shortbow (i)','Amethyst arrows','Void ranger helm','Void knight top','Void knight robe','Void knight gloves',"Black d'hide body","Black d'hide chaps",'Blessed coif','Barrows gloves']);
 const t=target('hellhound','ranged-tank');t.state.onTask=false;
 const gear=Object.fromEntries(['Magic shortbow (i)','Amethyst arrows','Void ranger helm','Void knight top','Void knight robe','Void knight gloves'].map(name=>{const item=c.itemForLabel(name);return [item.slot,item.id];}));
 const reference=c.calculateCombat(p,t.record,t.form,gear,{name:'Rapid',type:'ranged',stance:'Rapid'},null,false,false);
 assert.equal(reference.supported,true,reference.reason);assert.ok(best(p,t).dps>=reference.dps-1e-10);
});
test('a dangerous approach does not apply Wilderness weapon buffs inside the KBD lair',()=>{
 const kbd=target('king-black-dragon');assert.equal(kbd.location.wilderness,true);assert.equal(c.isWildernessCombat(kbd.record,kbd.location),false);
 const black=target('black-dragon-wilderness-slayer-cave');assert.equal(c.isWildernessCombat(black.record,black.location),true);
});
test('manual zero quantities remain editable and generic bank links never nest anchors',()=>{
 const code=buildSync({entryPoints:['src/ui/bank.ts'],bundle:true,write:false,format:'cjs',platform:'browser'}).outputFiles[0].text;
 const context={module:{exports:{}}};vm.runInNewContext(code,context);const p=profile();p.bank.manual[4151]=0;
 const html=context.module.exports.renderBank(p,{query:'whip',previews:[],levels:null,account:null,kind:'auto',group:false});
 assert.match(html,/owned-quantity-4151/);assert.match(html,/value="0"/);assert.doesNotMatch(html,/<a\b[^>]*>[^<]*<a\b/);
});
test('off-task Slayer headgear still supplies its built-in creature protection',()=>{
 const p=profile(['Abyssal whip','Slayer helmet (i)']),t=target('aberrant-spectre');t.state.onTask=false;
 const result=best(p,t);assert.equal(result.supported,true,result.reason);assert.equal(result.loadout.head,11865);
});
