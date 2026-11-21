const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
const item=name=>{const i=c.itemForLabel(name);assert.ok(i,name);return i;};
function setup(names,id='hellhound'){
 const p=c.maxedProfile(d);p.assumeAllGear=false;p.combat={...c.defaultCombat(),enabled:true};p.bank=c.emptyBank();for(const name of names)p.bank.manual[item(name).id]=1;
 const record=g.GUIDE.records[id],state={...g.defaultGuideState(),variantId:id,formId:record.defaultForm,approach:'ranged-tank'},form=g.guideForm(record,state),location=g.selectedLocation(record,form,state,p);
 return {p,record,state,form,location,best:()=>c.bestOwnedGear(p,record,form,state,location)};
}
const rapid={name:'Rapid',type:'ranged',stance:'Rapid'};
test('only the strongest ordinary Rune-or-lower crossbow is retained while Dragon and specialist families remain',()=>{
 const names=['Bronze crossbow','Iron crossbow','Mithril crossbow','Adamant crossbow','Rune crossbow','Dragon crossbow','Armadyl crossbow','Dragon hunter crossbow','Zaryte crossbow',"Karil's crossbow","Hunters' sunlight crossbow"];
 const retained=c.rangedWeaponCandidates(names.map(item));assert.equal(retained.length,7);assert.ok(retained.some(i=>i.name==='Rune crossbow'));assert.ok(retained.every(i=>!['Bronze crossbow','Iron crossbow','Mithril crossbow','Adamant crossbow'].includes(i.name)));
 const t=setup(['Adamant crossbow','Rune crossbow','Adamant bolts']);t.p.levels.ranged=50;assert.equal(c.rangedWeaponCandidates(c.availableItems(t.p).filter(i=>i.slot==='weapon'&&c.canEquip(i,t.p)))[0].name,'Adamant crossbow');
});
test('crossbows use the strongest compatible non-enchanted bolt by damage plus every compatible enchantment',()=>{
 const names=['Bronze bolts','Adamant bolts','Runite bolts','Onyx bolts','Dragon bolts','Ruby bolts (e)','Diamond bolts (e)','Ruby dragon bolts (e)','Diamond dragon bolts (e)'];
 const t=setup(['Rune crossbow','Dragon crossbow',...names]),owned=c.availableItems(t.p).filter(i=>c.canEquip(i,t.p));
 assert.deepEqual(c.rangedAmmoCandidates(owned,item('Rune crossbow')).map(i=>i.name),['Onyx bolts','Diamond bolts (e)','Ruby bolts (e)']);
 const dragon=c.rangedAmmoCandidates(owned,item('Dragon crossbow')).map(i=>i.name);assert.equal(dragon[0],'Dragon bolts');for(const name of names.filter(n=>n.endsWith('(e)')))assert.ok(dragon.includes(name));assert.equal(dragon.length,5);
});
test('lower-tier crossbows never inherit incompatible high-tier ammunition',()=>{
 const t=setup(['Adamant crossbow','Adamant bolts','Onyx bolts (e)','Ruby bolts (e)','Diamond dragon bolts (e)']);
 assert.deepEqual(c.rangedAmmoCandidates(c.availableItems(t.p),item('Adamant crossbow')).map(i=>i.name),['Adamant bolts','Ruby bolts (e)']);
});
test('the comparison retains all enchanted bolt candidates rather than truncating to the generic eight-item limit',()=>{
 const t=setup(['Dragon crossbow','Dragon bolts']);for(const i of c.ITEMS.filter(i=>i.slot==='ammo'&&i.name.endsWith('(e)')))t.p.bank.manual[i.id]=1;
 const ammo=c.rangedAmmoCandidates(c.availableItems(t.p).filter(i=>c.canEquip(i,t.p)),item('Dragon crossbow'));assert.ok(ammo.length>8);assert.equal(ammo.filter(i=>!i.name.endsWith('(e)')).length,1);
 const r=t.best(),rows=c.compareOwnedSlot(t.p,t.state,r,'weapon').rows.filter(row=>row.id===item('Dragon crossbow').id);assert.equal(rows.length,ammo.length);assert.ok(rows.every(row=>row.dps!==null));
});
test('crossbows appear beside a bow and each bolt row agrees with its exact full-setup calculation',()=>{
 const t=setup(['Magic shortbow (i)','Amethyst arrows','Rune crossbow','Adamant crossbow','Runite bolts','Ruby bolts (e)','Diamond bolts (e)']);
 const r=c.calculateCombat(t.p,t.record,t.form,{weapon:item('Magic shortbow (i)').id,ammo:item('Amethyst arrows').id},rapid,null,true,false),before=JSON.stringify([t.p,r]);
 const rows=c.compareOwnedSlot(t.p,t.state,r,'weapon').rows.filter(row=>row.id===item('Rune crossbow').id);assert.equal(rows.length,3);
 for(const row of rows){assert.ok(row.dps>0,row.reason);const exact=c.calculateCombat(t.p,t.record,t.form,{weapon:row.id,ammo:row.ammoId},rapid,null,true,false,false);assert.equal(row.dps,exact.dps);assert.equal(row.delta,exact.dps-r.dps);}
 assert.equal(JSON.stringify([t.p,r]),before);assert.ok(!c.compareOwnedSlot(t.p,t.state,r,'weapon').rows.some(row=>row.id===item('Adamant crossbow').id));
});
test('a charged blowpipe loads owned weapon-slot darts and applies their strength exactly once',()=>{
 const t=setup(['Toxic blowpipe','Dragon dart','Adamant dart']);assert.equal(item('Dragon dart').slot,'weapon');const r=t.best();assert.ok(r.supported,r.reason);assert.equal(r.loadout.weapon,item('Toxic blowpipe').id);assert.equal(r.loadout.ammo,item('Dragon dart').id);assert.equal(r.maxHit,20);assert.equal(r.attackSeconds,1.2);
 const rows=c.compareOwnedSlot(t.p,t.state,r,'ammo').rows;assert.ok(rows.some(row=>row.name==='Adamant dart'&&row.dps<r.dps));assert.ok(rows.some(row=>row.name==='Dragon dart'&&row.selected));
});
test('blowpipe weapon rows choose darts rather than borrowing the bow ammunition',()=>{
 const t=setup(['Magic shortbow (i)','Amethyst arrows','Toxic blowpipe','Amethyst dart']);const r=c.calculateCombat(t.p,t.record,t.form,{weapon:item('Magic shortbow (i)').id,ammo:item('Amethyst arrows').id},rapid,null,true,false);
 const row=c.compareOwnedSlot(t.p,t.state,r,'weapon').rows.find(row=>row.id===item('Toxic blowpipe').id);assert.ok(row.dps>0,row.reason);assert.equal(row.ammoId,item('Amethyst dart').id);
});
test('a blowpipe without compatible darts has no invented DPS and empty blowpipes are not auto-charged',()=>{
 const t=setup(['Toxic blowpipe']);assert.equal(t.best().supported,false);
 const missing=c.calculateCombat(t.p,t.record,t.form,{weapon:item('Toxic blowpipe').id},rapid,null,true,false);assert.equal(missing.supported,false);assert.match(missing.reason,/darts/);
 t.p.bank.manual[12924]=1;assert.ok(c.availableItems(t.p).every(i=>i.version!=='Empty'));assert.equal(c.calculateCombat(t.p,t.record,t.form,{weapon:12924,ammo:item('Dragon dart').id},rapid,null,true,false).supported,false);
});
test('Sailing blowpipes enforce equip levels and current dart limits; poisoned darts cannot be loaded',()=>{
 const t=setup(['Camphor blowpipe','Ironwood blowpipe','Rosewood blowpipe','Adamant dart','Rune dart','Amethyst dart','Dragon dart']);
 for(const [name,ammo,level]of [['Camphor blowpipe','Adamant dart',45],['Ironwood blowpipe','Adamant dart',55],['Rosewood blowpipe','Rune dart',65]]){
 assert.equal(c.rangedAmmoCandidates(c.availableItems(t.p),item(name))[0].name,ammo);assert.equal(c.itemRequirements(item(name)).ranged,level);assert.ok(c.calculateCombat(t.p,t.record,t.form,{weapon:item(name).id,ammo:item(ammo).id},rapid,null,true,false).supported);
 assert.equal(c.usableAmmo(item(name),item('Dragon dart'),'ranged'),false);}
 assert.equal(c.usableAmmo(item('Toxic blowpipe'),c.equipmentItem(11231),'ranged'),false);assert.equal(c.usableAmmo(item('Toxic blowpipe'),item('Atlatl dart'),'ranged'),false);
});
test('optional off-hands can be removed for a ranged comparison but mandatory protection cannot',()=>{
 const names=['Rune crossbow','Runite bolts','Dragon defender','Toxic blowpipe','Dragon dart'],t=setup(names),loadout={weapon:item('Rune crossbow').id,ammo:item('Runite bolts').id,shield:item('Dragon defender').id};
 const r=c.calculateCombat(t.p,t.record,t.form,loadout,rapid,null,true,false),row=c.compareOwnedSlot(t.p,t.state,r,'weapon').rows.find(row=>row.id===item('Toxic blowpipe').id);assert.ok(row.dps>0,row.reason);assert.match(row.reason,/off-hand removed/);
 const k=setup([...names,'Mirror shield'],'basilisk-knight'),kr=k.best(),blocked=c.compareOwnedSlot(k.p,k.state,kr,'weapon').rows.find(row=>row.id===item('Toxic blowpipe').id);assert.equal(blocked.dps,null);assert.match(blocked.reason,/Two-handed/);assert.equal(kr.loadout.shield,item('Mirror shield').id);
});
test('curated blowpipe examples resolve their dart labels into loaded ammunition',()=>{
 const loadout=c.exampleLoadout({slots:[{slot:'Weapon',item:'Toxic blowpipe'},{slot:'Ammo',item:'Dragon darts and Zulrah scales'}]});assert.equal(loadout.weapon,item('Toxic blowpipe').id);assert.equal(loadout.ammo,item('Dragon dart').id);
});
test('weapon inspection renders each paired ammunition item with its own icon and Wiki link',()=>{
 const t=setup(['Rune crossbow','Runite bolts','Ruby bolts (e)']),r=t.best(),comparison=c.compareOwnedSlot(t.p,t.state,r,'weapon');const code=buildSync({entryPoints:['src/ui/gear-inspector.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};new Function('module','exports',code)(m,m.exports);
 const html=m.exports.renderGearComparison(comparison);assert.match(html,/with <a/);assert.match(html,/Ruby_bolts/);assert.match(html,/Runite_bolts/);
});

test('high-HP enchanted-bolt screening is retained by the optimiser before finalist refinement',()=>{
 const t=setup(['Dragon crossbow','Dragon bolts','Ruby dragon bolts (e)','Diamond dragon bolts (e)'],'alchemical-hydra'),r=t.best();assert.ok(r.supported,r.reason);
 assert.equal(r.loadout.ammo,item('Ruby dragon bolts (e)').id);const plain=c.calculateCombat(t.p,t.record,t.form,{weapon:item('Dragon crossbow').id,ammo:item('Dragon bolts').id},rapid,null,true,false,false);assert.ok(r.dps>plain.dps);assert.equal(r.hpDependent,true);
});
test('crossbows and blowpipes remain in the screened pool even among many thrown weapons',()=>{
 const t=setup(['Rune crossbow','Runite bolts','Toxic blowpipe','Dragon dart']);for(const i of c.ITEMS.filter(i=>i.slot==='weapon'&&/dart|knife/.test(i.name)))t.p.bank.manual[i.id]=1;
 const pool=c.rangedWeaponCandidates(c.availableItems(t.p).filter(i=>i.slot==='weapon'&&c.canEquip(i,t.p)));for(const name of ['Rune crossbow','Toxic blowpipe'])assert.ok(pool.some(i=>i.name===name));
 const r=t.best();assert.ok(r.supported);assert.equal(r.loadout.weapon,item('Toxic blowpipe').id);assert.equal(r.loadout.ammo,item('Dragon dart').id);
});

test('Zaryte and higher/specialist crossbows are visible with paired bolts or explicit unmet requirements',()=>{
 const t=setup(['Rune crossbow','Runite bolts','Zaryte crossbow','Ruby dragon bolts (e)',"Hunters' sunlight crossbow"]),r=t.best();
 let rows=c.compareOwnedSlot(t.p,t.state,r,'weapon').rows;assert.ok(rows.some(row=>row.id===item('Zaryte crossbow').id&&row.dps>0));
 assert.deepEqual(c.itemRequirements(item('Zaryte crossbow')),{ranged:80});assert.deepEqual(c.itemRequirements(item("Hunters' sunlight crossbow")),{ranged:66,hunter:50});
 t.p.levels.ranged=75;rows=c.compareOwnedSlot(t.p,t.state,t.best(),'weapon').rows;const locked=rows.find(row=>row.id===item('Zaryte crossbow').id);assert.equal(locked.dps,null);assert.match(locked.reason,/ranged 80/);
 t.p.levels.hunter=49;const hunter=c.compareOwnedSlot(t.p,t.state,t.best(),'weapon').rows.find(row=>row.id===item("Hunters' sunlight crossbow").id);assert.equal(hunter.dps,null);assert.match(hunter.reason,/hunter 50/);
});
