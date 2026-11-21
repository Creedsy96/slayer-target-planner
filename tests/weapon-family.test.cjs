const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
const item=name=>{const i=c.itemForLabel(name);assert.ok(i,name);return i;};
function fixture(names){
 const p=c.maxedProfile(d);p.assumeAllGear=false;p.bank=c.emptyBank();p.combat={...c.defaultCombat(),enabled:true};for(const name of names)p.bank.manual[item(name).id]=1;
 const record=g.GUIDE.records.hellhound,state={...g.defaultGuideState(),variantId:record.id,formId:record.defaultForm},form=g.guideForm(record,state),location=g.selectedLocation(record,form,state,p);
 return {p,record,state,form,location,best:family=>c.bestOwnedGear(p,record,form,{...state,approach:family+'-tank'},location)};
}
test('ordinary weapons belong to their intended families despite universal manual casting and staff bash attacks',()=>{
 for(const [name,expected]of [['Abyssal whip',['melee']],['Rune crossbow',['ranged']],['Dragon dart',['ranged']],['Ancient staff',['magic']],['Trident of the seas',['magic']]]){
  assert.deepEqual(['melee','ranged','magic'].filter(f=>c.weaponSupportsFamily(item(name),f)),expected,name);
 }
});
test('genuine hybrids retain their native multiple styles without using generic manual casting',()=>{
 assert.deepEqual(['melee','ranged','magic'].filter(f=>c.weaponSupportsFamily(item('Blue Moon spear'),f)),['melee','magic']);
 assert.deepEqual(['melee','ranged','magic'].filter(f=>c.weaponSupportsFamily(item('Black salamander'),f)),['melee','ranged','magic']);
 assert.ok(c.weaponStylesForFamily(item('Ancient staff'),'magic').every(s=>s.stance!=='Manual Cast'));
});
test('each owned weapon inspector lists only its family and preserves crossbow bolt rows',()=>{
 const t=fixture(['Abyssal whip','Magic shortbow (i)','Amethyst arrows','Rune crossbow','Runite bolts','Ruby bolts (e)','Dragon dart','Ancient staff','Trident of the seas','Blue Moon spear']);
 for(const [family,include,exclude]of [
  ['ranged',['Magic shortbow (i)','Rune crossbow','Dragon dart'],['Abyssal whip','Ancient staff','Trident of the seas','Blue Moon spear']],
  ['melee',['Abyssal whip','Blue Moon spear'],['Magic shortbow (i)','Rune crossbow','Dragon dart','Ancient staff','Trident of the seas']],
  ['magic',['Ancient staff','Trident of the seas','Blue Moon spear'],['Abyssal whip','Magic shortbow (i)','Rune crossbow','Dragon dart']]
 ]){
  const r=t.best(family);assert.ok(r.supported,r.reason);const rows=c.compareOwnedSlot(t.p,{...t.state,approach:family+'-tank'},r,'weapon').rows;
  for(const name of include)assert.ok(rows.some(row=>c.equipmentItem(row.id).id===item(name).id),family+' includes '+name);
  for(const name of exclude)assert.ok(rows.every(row=>c.equipmentItem(row.id).id!==item(name).id),family+' excludes '+name);
  assert.ok(rows.some(row=>row.selected));if(family==='ranged')assert.equal(rows.filter(row=>row.name==='Rune crossbow').length,2);
 }
});
test('automatic setups cannot select a dart to cast spells or a plain staff to fight in melee',()=>{
 const dart=fixture(['Dragon dart']);assert.equal(dart.best('magic').supported,false);assert.equal(dart.best('melee').supported,false);assert.ok(dart.best('ranged').supported);
 const staff=fixture(['Ancient staff']);assert.equal(staff.best('melee').supported,false);assert.ok(staff.best('magic').supported);
});
test('the all-gear assumption uses the same family filter without hiding high-tier ranged weapons',()=>{
 const t=fixture(['Magic shortbow (i)','Amethyst arrows']),r=t.best('ranged');t.p.assumeAllGear=true;const rows=c.compareOwnedSlot(t.p,{...t.state,approach:'ranged-tank'},r,'weapon').rows;
 for(const name of ['Rune crossbow','Dragon crossbow','Armadyl crossbow','Zaryte crossbow','Toxic blowpipe'])assert.ok(rows.some(row=>c.equipmentItem(row.id).id===item(name).id),name);
 for(const name of ['Abyssal whip','Ancient staff','Trident of the seas'])assert.ok(rows.every(row=>c.equipmentItem(row.id).id!==item(name).id),name);
});
