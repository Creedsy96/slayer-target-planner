// These fixtures exercise recorded equipment/manual timing rather than the all-gear preset.
function ownedScenario(data){const p=c.maxedProfile(data);p.assumeAllGear=false;p.combat.enabled=false;return p;}
const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
function profile(names){const p=ownedScenario(d);p.bank=c.emptyBank();p.combat={...c.defaultCombat(),enabled:true};for(const name of names){const i=c.itemForLabel(name);assert.ok(i,name);p.bank.manual[i.id]=1;}return p;}
function target(id='hellhound',approach='melee-tank'){
 const record=g.GUIDE.records[id],state={...g.defaultGuideState(),variantId:id,formId:record.defaultForm,approach},form=g.guideForm(record,state);
 return {record,state,form,location:g.selectedLocation(record,form,state)};
}
const best=(p,t,priority)=>c.bestOwnedGear(p,t.record,t.form,t.state,t.location,priority);
const id=name=>c.itemForLabel(name).id;
const tank=["Torag's platebody","Torag's platelegs"],prayer=['Proselyte hauberk','Proselyte cuisse'];

test('DPS-neutral melee armour uses defence for tank mode and prayer bonus for prayer mode',()=>{
 const p=profile(['Abyssal whip',...tank,...prayer]),t=target();
 const defensive=best(p,t);assert.equal(defensive.loadout.body,id(tank[0]));assert.equal(defensive.loadout.legs,id(tank[1]));assert.equal(defensive.armourPriority,'tank');
 const praying=best(p,{...t,state:{...t.state,approach:'melee-prayer'}});assert.equal(praying.loadout.body,id(prayer[0]));assert.equal(praying.loadout.legs,id(prayer[1]));assert.equal(praying.armourPriority,'prayer');
 assert.equal(praying.dps,defensive.dps);assert.deepEqual(praying.armourFallback,['body','legs']);
});
test('magic fallback fills negative-accuracy armour rather than leaving wearable slots empty and recalculates the loss',()=>{
 const p=profile(['Trident of the seas',...tank,...prayer]),t=target('hellhound','magic-tank');
 const r=best(p,t);assert.equal(r.loadout.body,id(tank[0]));assert.equal(r.loadout.legs,id(tank[1]));
 const bare={...r.loadout};delete bare.body;delete bare.legs;
 const unarmoured=c.calculateCombat(p,t.record,t.form,bare,r.style,r.spell,t.state.onTask,false);
 assert.ok(r.dps<unarmoured.dps);assert.ok(r.ttk>unarmoured.ttk);
 const exact=c.calculateCombat(p,t.record,t.form,r.loadout,r.style,r.spell,t.state.onTask,false);assert.equal(r.dps,exact.dps);assert.equal(r.ttk,exact.ttk);
 assert.ok(r.notes.some(note=>note.includes('accuracy penalties')));
});
test('style-compatible prayer robes are preferred to cross-style metal armour for Magic and Ranged',()=>{
 for(const [weapon,ammo,family]of [['Trident of the seas',null,'magic'],['Magic shortbow (i)','Amethyst arrows','ranged']]){
  const p=profile([weapon,...(ammo?[ammo]:[]),...tank,...prayer,"Monk's robe top","Monk's robe"]),t=target('hellhound',family+'-prayer'),r=best(p,t);
  assert.equal(r.loadout.body,id("Monk's robe top"));assert.equal(r.loadout.legs,id("Monk's robe"));
  assert.ok(r.supported);assert.equal(r.family,family);
 }
});
test('prayer fallback does not replace an owned body/leg DPS upgrade',()=>{
 const p=profile(['Trident of the seas',"Ahrim's robetop","Ahrim's robeskirt","Monk's robe top","Monk's robe"]),t=target('hellhound','magic-prayer'),r=best(p,t);
 assert.equal(r.loadout.body,id("Ahrim's robetop"));assert.equal(r.loadout.legs,id("Ahrim's robeskirt"));
 const bare={...r.loadout};delete bare.body;delete bare.legs;assert.ok(r.dps>c.calculateCombat(p,t.record,t.form,bare,r.style,null,true,false).dps);
});
test('required Shayzien body and legs override prayer fallback',()=>{
 const p=profile(['Magic shortbow (i)','Amethyst arrows','Shayzien helm (5)','Shayzien body (5)','Shayzien greaves (5)','Shayzien gloves (5)','Shayzien boots (5)',...prayer]);
 p.diaries.kourend=0;const r=best(p,target('lizardman-shaman','ranged-prayer'));assert.ok(r.supported,r.reason);assert.equal(r.loadout.body,id('Shayzien body (5)'));assert.equal(r.loadout.legs,id('Shayzien greaves (5)'));
});
test('fallback preserves reflecting shields and two-handed restrictions',()=>{
 const p=profile(['Ancient staff','Mirror shield','Slayer helmet (i)',...tank,...prayer,"Monk's robe top","Monk's robe"]),t=target('basilisk-knight','magic-prayer'),r=best(p,t);
 assert.ok(r.supported,r.reason);assert.equal(r.loadout.shield,id('Mirror shield'));assert.equal(r.loadout.body,id("Monk's robe top"));
 const q=profile(['Magic shortbow (i)','Amethyst arrows','Mirror shield',...prayer]),bow=best(q,target('hellhound','ranged-prayer'));assert.ok(bow.supported);assert.equal(bow.loadout.shield,undefined);
});
test('unwearable or zero-quantity armour is never filled as a fallback',()=>{
 const p=profile(['Abyssal whip',...tank]);p.levels.defence=1;let r=best(p,target());assert.equal(r.loadout.body,undefined);assert.equal(r.loadout.legs,undefined);assert.ok(r.notes.some(note=>note.includes('No compatible wearable owned armour')));
 p.levels.defence=99;p.bank.manual[id(tank[0])]=0;p.bank.manual[id(tank[1])]=0;r=best(p,target());assert.equal(r.loadout.body,undefined);
});
test('incoming attack types influence defensive ranking rather than adding unrelated bonuses',()=>{
 const form=target().form,a=structuredClone(c.itemForLabel(tank[0])),b=structuredClone(a);a.id=1;b.id=2;
 a.defensive={stab:0,slash:100,crush:0,ranged:0,magic:0};b.defensive={stab:0,slash:0,crush:0,ranged:0,magic:500};
 assert.equal(c.fallbackArmour([b,a],{family:'melee',priority:'tank',form:{...form,'attack style':'Slash'}})[0].id,1);
 a.bonuses.prayer=0;b.bonuses.prayer=5;assert.equal(c.fallbackArmour([a,b],{family:'melee',priority:'prayer',form:{...form,'attack style':'Slash'}})[0].id,2);
});
test('large equal-offence collections retain the best defensive/prayer candidates outside the first eight IDs',()=>{
 const p=profile(['Abyssal whip',...tank,...prayer]),body=c.itemForLabel(tank[0]);
 const extras=c.ITEMS.filter(i=>i.slot==='body'&&i.bonuses.str===0&&Math.max(i.offensive.stab,i.offensive.slash,i.offensive.crush)===0&&i.defensive.slash<body.defensive.slash&&i.bonuses.prayer<8&&c.canEquip(i,p)&&!c.temporaryEquipment(i));
 assert.ok(extras.length>8);for(const item of extras)p.bank.manual[item.id]=1;
 const t=target(),r=best(p,t);assert.equal(r.loadout.body,id(tank[0]));assert.equal(best(p,{...t,state:{...t.state,approach:'melee-prayer'}}).loadout.body,id(prayer[0]));
});
test('guide recommendations and saved hunter methods share the recommended prayer/tank policy',()=>{
 const p=profile(['Abyssal whip','Slayer helmet (i)',...tank,...prayer]),t=target('dust-devil','auto');
 const guide=c.calculateGuideCombat(p,t.state);assert.equal(guide.styles.melee.armourPriority,'prayer');assert.equal(guide.styles.melee.loadout.body,id(prayer[0]));
 const v=d.variants.find(v=>v.id==='dust-devil'),method={...c.defaultMethod(d,p,'dust devils'),variantId:v.id,combatStyle:'melee',location:t.location.name,combatDefence:'prayer'};
 const praying=c.withCalculatedTiming(p,v,method);assert.ok(praying.calculated);assert.match(praying.combatNote,/prayer armour fallback/);
 const tanked=c.withCalculatedTiming(p,v,{...method,combatDefence:'tank'});assert.match(tanked.combatNote,/tank armour fallback/);
 p.methods['dust devils::dust-devil']=method;const copy=c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0];assert.equal(copy.methods['dust devils::dust-devil'].combatDefence,'prayer');
 assert.throws(()=>c.validateProfile(d,{...p,methods:{'dust devils::dust-devil':{...method,combatDefence:'invalid'}}}),/armour priority/);
});
