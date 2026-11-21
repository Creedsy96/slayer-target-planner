const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
function scenario(id='basilisk-knight'){
 const record=g.GUIDE.records[id],state={...g.defaultGuideState(),variantId:id,formId:record.defaultForm,approach:'melee-tank'},form=g.guideForm(record,state);
 return {record,state,form,location:g.selectedLocation(record,form,state)};
}
test('Maxed assumes ordinary gear and enables automatic timing without inventing bank quantities',()=>{
 const p=c.maxedProfile(d),before=JSON.stringify(p),available=c.availableItems(p);
 assert.equal(p.assumeAllGear,true);assert.equal(p.combat.enabled,true);assert.ok(available.length>1000);
 for(const slot of c.EQUIPMENT_SLOTS)assert.ok(available.some(item=>item.slot===slot),slot);
 for(const name of ['Inquisitor\'s mace','Dragon hunter lance','Emberlight','Anti-dragon shield'])assert.ok(available.some(item=>item.name===name),name);
 assert.equal(c.ownedItems(p).length,0);assert.equal(p.bank,undefined);assert.equal(JSON.stringify(p),before);
 assert.ok(Object.values(p.unlocks).every(n=>n===0));
});

test('all-gear availability excludes seasonal, activity-only and unobtainable equipment but retains ordinary items whose old IDs were reused',()=>{
 const names=new Set(c.availableItems(c.maxedProfile(d)).map(item=>item.name));
 for(const name of ['Wilderness champion amulet',"V's helm",'Crystal blessing','Drygore blowpipe','Corrupted halberd (perfected)','Torva platebody (unobtainable item)'])assert.equal(names.has(name),false,name);
 for(const name of ['Echo boots','Camulet','Rogue boots'])assert.equal(names.has(name),true,name);
});

test('custom characters and characters named Maxed still use only their actual recorded gear',()=>{
 const p=c.newCharacter(d,'Maxed',false);p.bank=c.emptyBank();p.bank.manual['4151']=1;
 assert.equal(p.assumeAllGear,undefined);assert.deepEqual(c.availableItems(p).map(i=>i.id),[4151]);
 p.bank.manual['4151']=0;assert.equal(c.availableItems(p).length,0);
});

test('existing built-in Maxed upgrades once without resetting bank, account facts, methods or Slayer rewards',()=>{
 const old=c.maxedProfile(d);delete old.assumeAllGear;old.combat.enabled=false;old.combat.uptime=87;old.unlocks.basilocked=1;old.points=123;
 old.bank=c.emptyBank();old.bank.manual['4151']=1;old.quests['The Fremennik Exiles']=1;
 const custom=c.newCharacter(d,'Custom'),before=JSON.stringify([old,custom]),updated=c.withDefaultMaxedProfile(d,[old,custom],custom.id),p=updated.profiles[0];
 assert.equal(JSON.stringify([old,custom]),before);assert.equal(updated.activeId,custom.id);assert.equal(updated.profiles[1],custom);
 assert.equal(p.assumeAllGear,true);assert.equal(p.combat.enabled,true);assert.equal(p.combat.uptime,87);
 for(const key of ['bank','quests','methods','unlocks','goal','points'])assert.deepEqual(p[key],old[key],key);
 p.assumeAllGear=false;p.combat.enabled=false;
 const saved=c.importProfiles(d,c.exportProfiles(updated.profiles,p.id)),again=c.withDefaultMaxedProfile(d,saved.profiles,saved.activeId);
 assert.equal(again.profiles,saved.profiles);assert.equal(again.profiles[0].assumeAllGear,false);assert.equal(again.profiles[0].combat.enabled,false);
});

test('all-gear flag round-trips, rejects invalid flags and separates otherwise identical combat caches',()=>{
 const p=c.maxedProfile(d),q={...p,assumeAllGear:false};assert.notEqual(c.combatIdentity(p),c.combatIdentity(q));
 assert.equal(c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0].assumeAllGear,true);
 assert.throws(()=>c.validateProfile(d,{...p,assumeAllGear:'yes'}),/all-gear assumption/);
});

test('Maxed searches real gear without an import, retaining reflecting shields and honest ownership labels',()=>{
 const p=c.maxedProfile(d),s=scenario(),before=JSON.stringify(p),r=c.bestOwnedGear(p,s.record,s.form,s.state,s.location);
 assert.equal(r.supported,true);assert.ok(r.dps>0);assert.match(c.equipmentItem(r.loadout.shield).name,/V's shield|Mirror shield/);
 assert.equal(c.equipmentItem(r.loadout.weapon).isTwoHanded,false);assert.ok(r.notes.some(n=>n.includes('not an imported bank')));
 const comparison=c.compareOwnedSlot(p,s.state,r,'shield');assert.equal(comparison.assumed,true);assert.ok(comparison.rows.length>1);assert.ok(comparison.rows.every(row=>row.owned===false));
 assert.equal(JSON.stringify(p),before);
 const owned={...p,assumeAllGear:false};assert.equal(c.bestOwnedGear(owned,s.record,s.form,s.state,s.location).supported,false);
});

function ui(file){const code=buildSync({entryPoints:['src/ui/'+file+'.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};new Function('module','exports',code)(m,m.exports);return m.exports;}
test('settings and bank explicitly distinguish the assumption from real inventory',()=>{
 const p=c.maxedProfile(d),settings=ui('settings').renderSettings(p,{},'midnight');
 assert.match(settings,/data-setting="assumeAllGear" checked/);assert.match(settings,/imported snapshots and manual quantities are preserved/i);
 const bank=ui('bank').renderBank(p,{query:'',group:false,slot:'',kind:'auto',previews:[],levels:null});
 assert.match(bank,/All gear assumed/);assert.match(bank,/only your actual imported\/manual gear/);
 assert.doesNotMatch(bank,/id="owned-quantity-/);
});

test('assumed-gear exclusions reproduce from retained sources with no network requests',()=>{
 const expected=fs.readFileSync('data/assumed-gear-exclusions.json','utf8');
 cp.execFileSync('python',['tools/build_assumed_gear_exclusions.py']);
 assert.equal(fs.readFileSync('data/assumed-gear-exclusions.json','utf8'),expected);
});
