const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
const item=name=>{const i=c.itemForLabel(name);assert.ok(i,name);return i;};
function fixture(names,variant='hellhound'){
 const p=c.maxedProfile(d);p.assumeAllGear=false;p.bank=c.emptyBank();p.combat={...c.defaultCombat(),enabled:true,allowUnknownRequirements:true};
 for(const name of names)p.bank.manual[item(name).id]=1;
 const record=g.GUIDE.records[variant],state={...g.defaultGuideState(),variantId:variant,formId:record.defaultForm,approach:'melee-tank'},form=g.guideForm(record,state);
 return {p,state,record,form,best:()=>c.bestOwnedGear(p,record,form,state,g.selectedLocation(record,form,state,p))};
}
test('cosmetic, skilling-only and negative-only novelty items are not combat candidates',()=>{
 for(const name of ['Black partyhat',"Chef's hat",'Graceful boots','Graceful top','Lumberjack top','Prospector helmet','Golden prospector helmet','Angler boots',"Farmer's jacket",'Amulet of chemistry','Rubber chicken'])assert.equal(c.hasCombatImpact(item(name)),false,name);
});
test('prayer-only, defensive and real weapons remain candidates without requiring a DPS increase',()=>{
 for(const name of ['Gnome amulet','Proselyte hauberk','Iron platebody','Abyssal whip','Rune crossbow','Dragon dart','Bronze dagger','Boots of lightness'])assert.equal(c.hasCombatImpact(item(name)),true,name);
 const prayer={...item('Black partyhat'),bonuses:{str:0,ranged_str:0,magic_str:0,prayer:1}};assert.ok(c.hasCombatImpact(prayer));
});
test('zero-stat Slayer protection, survival, task effects and unusual ammunition remain candidates',()=>{
 for(const name of ['Facemask','Earmuffs','Nose peg','Reinforced goggles','Witchwood icon','Insulated boots','Lit bug lantern','Lightbearer','Ring of recoil','Ring of life','Phoenix necklace','Bracelet of slaughter','Expeditious bracelet','Bracelet of ethereum','Atlatl dart','Armadyl pendant'])assert.equal(c.hasCombatImpact(item(name)),true,name);
});
test('every pinned engine zero-stat exception is retained',()=>{
 const fs=require('node:fs'),source=fs.readFileSync('vendor/osrs-dps/source/src/lib/Equipment.ts','utf8'),list=source.match(/export const noStatExceptions = \[([\s\S]*?)\];/)[1];
 const names=[...list.matchAll(/^\s*(['"])(.*?)\1,?\s*$/gm)].map(m=>m[2]);assert.ok(names.length>=15);
 for(const name of names){const i=item(name);assert.equal(c.hasCombatImpact(i),true,name);}
});
test('automatic gear does not fill empty slots with cosmetics and bank/export facts remain intact',()=>{
 const t=fixture(['Abyssal whip','Black partyhat','Lumberjack top',"Farmer's jacket",'Graceful boots','Amulet of chemistry']);
 const before=c.exportProfiles([t.p],t.p.id),r=t.best();assert.ok(r.supported,r.reason);
 for(const slot of ['head','body','feet','neck'])assert.equal(r.loadout[slot],undefined,slot);
 assert.equal(c.exportProfiles([t.p],t.p.id),before);assert.ok(c.ownedItems(t.p).some(i=>i.name==='Black partyhat'));
});
test('slot comparisons omit non-combat items entirely while keeping zero-stat combat options',()=>{
 const t=fixture(['Abyssal whip','Black partyhat',"Chef's hat",'Prospector helmet','Facemask','Earmuffs','Nose peg','Lightbearer','Ring of recoil','Gold ring']);
 const r=t.best(),head=c.compareOwnedSlot(t.p,t.state,r,'head'),ring=c.compareOwnedSlot(t.p,t.state,r,'ring');
 const heads=[...head.rows,...(head.outclassed||[])].map(r=>r.name),rings=[...ring.rows,...(ring.outclassed||[])].map(r=>r.name);
 for(const n of ['Black partyhat',"Chef's hat",'Prospector helmet'])assert.ok(!heads.includes(n),n);
 for(const n of ['Facemask','Earmuffs','Nose peg'])assert.ok(!heads.includes(n),'Unneeded protection: '+n);
 assert.ok(rings.includes('Lightbearer'));assert.ok(rings.includes('Ring of recoil'));assert.ok(!rings.includes('Gold ring'));
});
test('required zero-stat face protection still produces a valid combat setup',()=>{
 const t=fixture(['Abyssal whip','Facemask','Black partyhat'],'dust-devil'),r=t.best();assert.ok(r.supported,r.reason);assert.equal(r.loadout.head,item('Facemask').id);
 const head=c.compareOwnedSlot(t.p,t.state,r,'head');assert.ok(head.rows.some(row=>row.name==='Facemask'));assert.ok(head.rows.every(row=>row.name!=='Black partyhat'));
});
test('legacy saved cosmetic choices are ignored without losing combat timing or mutating the character',()=>{
 const t=fixture(['Abyssal whip','Black partyhat','Lumberjack top']);t.p.gearOverrides={hellhound:{melee:{head:item('Black partyhat').id,body:item('Lumberjack top').id}}};
 const before=structuredClone(t.p),r=t.best();assert.ok(r.supported,r.reason);assert.equal(r.loadout.head,undefined);assert.equal(r.loadout.body,undefined);assert.deepEqual(t.p,before);assert.ok(r.notes.some(n=>n.includes('Saved choices without combat benefit in this encounter were ignored')));
});

test('pure zero-stat protection is kept only for an encounter that requires it',()=>{
 for(const name of ['Facemask','Earmuffs','Nose peg','Lit bug lantern']){assert.equal(c.combatCandidate(item(name)),false,name);assert.equal(c.combatCandidate(item(name),true),true,name);}
 assert.ok(c.combatCandidate(item('Lightbearer')));assert.ok(c.combatCandidate(item('Ring of recoil')));
});
