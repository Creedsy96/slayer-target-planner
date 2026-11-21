const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),reviews=require('../data/equipment-requirement-reviews.json');
function profile(){const p=c.maxedProfile(c.catalogue);p.assumeAllGear=false;p.combat={...c.defaultCombat(),enabled:true,allowUnknownRequirements:false};p.bank=c.emptyBank();return p;}
const item=name=>{const found=c.itemForLabel(name);assert.ok(found,name);return found;};

test('all Moon armour new/used IDs and all three weapons have verified requirements with the unknown override off',()=>{
 const p=profile();p.levels.defence=50;p.levels.attack=70;p.levels.strength=75;p.levels.magic=75;p.levels.ranged=75;
 for(const [colour,skill]of [['Blood','strength'],['Blue','magic'],['Eclipse','ranged']]){
  const armour=c.ITEMS.filter(i=>i.name.startsWith(colour+' Moon ')&&/^(New|Used)$/.test(i.version));assert.equal(armour.length,6);
  for(const i of armour){assert.deepEqual(c.itemRequirements(i),{[skill]:75,defence:50});assert.ok(c.canEquip(i,p),i.name+' '+i.version);}
 }
 for(const name of ['Dual macuahuitl','Blue Moon spear','Eclipse atlatl','Atlatl dart'])assert.ok(c.canEquip(item(name),p),name);
 assert.deepEqual(c.itemRequirements(item('Eclipse atlatl')),{ranged:75,attack:50,strength:50});
});

test('every reviewed skill threshold is enforced independently at the boundary and when unknown',()=>{
 for(const review of reviews.reviews)for(const id of review.ids){
  const i=c.ITEMS_BY_ID.get(id),p=profile();Object.assign(p.levels,review.requirements);assert.ok(c.canEquip(i,p),i.name);
  for(const [skill,level]of Object.entries(review.requirements)){
   p.levels[skill]=level-1;assert.equal(c.canEquip(i,p),false,i.name+' below '+skill);
   p.levels[skill]=null;assert.equal(c.canEquip(i,p),false,i.name+' unknown '+skill);p.levels[skill]=level;
  }
 }
});

test('broken Moon armour remains absent from usable owned equipment',()=>{
 const p=profile(),broken=c.ITEMS.filter(i=>/^(Blood|Blue|Eclipse) Moon /.test(i.name)&&i.version==='Broken');assert.equal(broken.length,9);
 for(const i of broken)p.bank.manual[i.id]=1;assert.deepEqual(c.ownedItems(p),[]);
});

test('missing ornament/charge entries inherit verified engine aliases and retain the real threshold',()=>{
 const p=profile(),ornament=c.ITEMS_BY_ID.get(26484);assert.deepEqual(c.itemRequirements(ornament),{attack:75});
 p.levels.attack=74;assert.equal(c.canEquip(ornament,p),false);p.levels.attack=75;assert.equal(c.canEquip(ornament,p),true);
 for(const id of [27769,27745,27757,27697,27721,27709,27733])assert.deepEqual(c.itemRequirements(c.ITEMS_BY_ID.get(id)),c.itemRequirements(c.ITEMS_BY_ID.get(23975)));
});

test('explicit per-ID requirements remain authoritative for existing equipment',()=>{
 const baseline=require('../data/equipment-requirements.json').requirements,reviewed=new Set(reviews.reviews.flatMap(r=>r.ids));
 const additions=new Set([29589,29591,29594,31575,31579,31583,26374,28869,34681,9177,21012]);
 for(const i of c.ITEMS)if(baseline[i.id]&&!reviewed.has(i.id)&&!additions.has(i.id))assert.deepEqual(c.itemRequirements(i),baseline[i.id],String(i.id));
});

test('review metadata covers exact IDs/names and points to retained primary-source revisions',()=>{
 const seen=new Set(),pages=fs.readdirSync('data/equipment-sources').map(name=>JSON.parse(fs.readFileSync(path.join('data/equipment-sources',name),'utf8')));
 for(const review of reviews.reviews){
  const page=pages.find(p=>p.title===review.source.title);assert.ok(page,review.source.title);assert.equal(page.revisions[0].revid,review.source.revision);
  assert.ok(review.source.url.startsWith('https://oldschool.runescape.wiki/w/'));
  for(const id of review.ids){assert.ok(!seen.has(id));seen.add(id);const i=c.ITEMS_BY_ID.get(id);assert.ok(i,id);assert.ok(review.names.includes(i.name));assert.doesNotMatch(i.version,/broken|uncharged|empty|inactive/i);}
 }
});

test('equipping reviewed newer gear does not add acquisition or crafting skills as equipment gates',()=>{
 const p=profile();p.levels.fletching=1;p.levels.crafting=1;p.levels.smithing=1;p.levels.slayer=1;
 for(const name of ['Zombie axe','Soulreaper axe',"Elidinis' ward (f)",'Warped sceptre','Atlatl dart','Aranea boots'])assert.ok(c.canEquip(item(name),p),name);
 p.levels.defence=30;assert.ok(c.canEquip(item('Masori body'),p));assert.equal(c.canEquip(item('Masori body (f)'),p),false);
 p.levels.defence=1;assert.ok(c.canEquip(item('Mixed hide legs'),p));assert.equal(c.canEquip(item('Mixed hide top'),p),false);
});

test('the Frost dragon ranged comparison calculates Eclipse legs and reports actual missing levels',()=>{
 const p=profile();for(const name of ['Rune crossbow','Runite bolts','Anti-dragon shield',"Black d'hide chaps",'Eclipse Moon tassets'])p.bank.manual[item(name).id]=1;
 const record=g.GUIDE.records['frost-dragon'],state={...g.defaultGuideState(),variantId:record.id,formId:record.defaultForm,approach:'ranged-tank'},form=g.guideForm(record,state);
 const result=c.bestOwnedGear(p,record,form,state,g.selectedLocation(record,form,state,p));assert.ok(result.supported,result.reason);
 const compare=()=>c.compareOwnedSlot(p,state,result,'legs'),row=compare().rows.find(r=>r.id===item('Eclipse Moon tassets').id);
 assert.ok(row);assert.ok(row.dps>0);assert.doesNotMatch(row.reason,/Unreviewed/);
 p.levels.ranged=74;const denied=compare().rows.find(r=>r.id===item('Eclipse Moon tassets').id);assert.equal(denied.dps,null);assert.match(denied.reason,/ranged 75/);
});

test('the atlatl and its ammo participate in owned ranged calculations without unknown requirements enabled',()=>{
 // The existing engine adapter explicitly declines the full Eclipse burn set.
 // Test equipment eligibility and ammunition separately from that limitation.
 const p=profile();for(const name of ['Eclipse atlatl','Atlatl dart','Eclipse Moon chestplate','Eclipse Moon tassets'])p.bank.manual[item(name).id]=1;
 const record=g.GUIDE.records.hellhound,state={...g.defaultGuideState(),variantId:record.id,formId:record.defaultForm,approach:'ranged-tank'},form=g.guideForm(record,state);
 const result=c.bestOwnedGear(p,record,form,state,g.selectedLocation(record,form,state,p));assert.ok(result.supported,result.reason);assert.equal(result.loadout.weapon,item('Eclipse atlatl').id);assert.equal(result.loadout.ammo,item('Atlatl dart').id);assert.ok(result.dps>0);
});

test('genuinely unreviewed equipment remains restricted and the offline audit accounts for the full scope',()=>{
 const report=require('../data/equipment-requirement-audit.json'),p=profile(),unreviewed=c.ITEMS_BY_ID.get(report.ordinaryUnreviewed[0].id);
 assert.equal(c.itemRequirements(unreviewed),null);assert.equal(c.canEquip(unreviewed,p),false);p.combat.allowUnknownRequirements=true;assert.equal(c.canEquip(unreviewed,p),true);
 const output='.desktop-build/equipment-audit-test.json';cp.execFileSync(process.execPath,['tools/audit_equipment_requirements.mjs',output]);assert.deepEqual(JSON.parse(fs.readFileSync(output,'utf8')),report);
 assert.equal(report.ordinaryUnreviewed.length,report.ordinaryCombat.unreviewed);assert.equal(report.ordinaryCombat.items,report.ordinaryCombat.reviewed+report.ordinaryCombat.unreviewed);
 assert.ok(report.ordinaryCombat.unreviewed<318);assert.ok(report.allUsableCombat.unreviewed<535);
});
