const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
function profile(names){const p=c.maxedProfile(d);p.bank=c.emptyBank();p.combat={...c.defaultCombat(),enabled:true,spellbook:'auto'};for(const name of names){const item=c.itemForLabel(name);assert.ok(item,name);p.bank.manual[item.id]=1;}return p;}
function target(id,location){const record=g.GUIDE.records[id],state={...g.defaultGuideState(),variantId:id,formId:record.defaultForm,location:location||''};const form=location?record.forms.find(form=>g.rankLocations(record,form,state).some(l=>l.name===location)):g.guideForm(record,state);assert.ok(form);return {record,form,state,location:g.selectedLocation(record,form,state)};}
const best=(p,t,family='melee')=>c.bestOwnedGear(p,t.record,t.form,{...t.state,approach:family+'-tank'},t.location);

test('bank imports retain only recognised equipment and ammunition, with an omission count',()=>{
 const value=c.parseBankImport(JSON.stringify({kind:'bank',items:[{id:4151,quantity:1},{id:385,quantity:500},{id:995,quantity:2000000},{id:554,quantity:1000},{id:829,quantity:100},{id:999998,quantity:1}]}));
 assert.deepEqual(Object.keys(value.snapshot.items).map(Number).sort((a,b)=>a-b),[829,4151]);assert.ok(value.warnings.some(w=>w.startsWith('4 non-equipment')));
});
test('inert javelins are removed from melee/magic sets and do not change DPS or mutate the input',()=>{
 const p=profile(['Abyssal whip','Adamant javelin']),t=target('hellhound'),gear={weapon:4151,ammo:829},style={name:'Accurate',type:'slash',stance:'Accurate'};
 const result=c.calculateCombat(p,t.record,t.form,gear,style,null,true,false),plain=c.calculateCombat(p,t.record,t.form,{weapon:4151},style,null,true,false);
 assert.equal(result.dps,plain.dps);assert.equal(result.loadout.ammo,undefined);assert.equal(gear.ammo,829);assert.equal(best(p,t).loadout.ammo,undefined);
});
test('bows choose compatible arrows despite a bank full of stronger incompatible ammunition',()=>{
 const p=profile(['Magic shortbow (i)','Amethyst arrows','Adamant javelin','Dragon bolts','Runite bolts','Broad bolts']),t=target('hellhound');
 const result=best(p,t,'ranged');assert.equal(result.supported,true,result.reason);assert.equal(c.equipmentItem(result.loadout.ammo).name,'Amethyst arrow');
});
test('reviewed demonbane weapons are eligible without accepting every unknown requirement',()=>{
 const p=profile(['Emberlight','Scorching bow','Purging staff','Abyssal whip','Dragon arrows','Dragon defender','Amulet of fury','Barrows gloves','Dragon boots','Berserker ring (i)']),t=target('hellhound');
 for(const name of ['Emberlight','Scorching bow','Purging staff'])assert.equal(c.canEquip(c.itemForLabel(name),p),true,name);
 const melee=best(p,t);assert.equal(c.equipmentItem(melee.loadout.weapon).name,'Emberlight');
 const ranged=best(p,t,'ranged');assert.equal(c.equipmentItem(ranged.loadout.weapon).name,'Scorching bow');
 p.combat.spellbook='arceuus';const magic=best(p,t,'magic');assert.equal(magic.spell,'Dark Demonbane');
 const before=magic.dps;p.combat.markOfDarkness=true;assert.ok(best(p,t,'magic').dps>before);
 p.levels.attack=76;assert.equal(c.canEquip(c.itemForLabel('Emberlight'),p),false);
});
test('spell screening keeps the strongest unlocked tier rather than depending on alphabetical data order',()=>{
 const p=profile(['Ancient staff']);assert.ok(c.candidateSpells(p).includes('Ice Barrage'));assert.ok(c.candidateSpells(p).includes('Dark Demonbane'));assert.ok(c.candidateSpells(p).includes('Fire Surge'));
 p.levels.magic=70;assert.ok(c.candidateSpells(p).includes('Ice Burst'));assert.ok(!c.candidateSpells(p).includes('Ice Barrage'));
 p.quests['Desert Treasure I']=0;assert.ok(!c.candidateSpells(p).some(s=>/Burst|Barrage/.test(s)));
});
test('dust devil pods use eight in Catacombs and nine in Wilderness, capped by actual multi-combat support',()=>{
 const cat=target('dust-devil','Catacombs of Kourend'),wild=target('dust-devil','Wilderness Slayer Cave');
 assert.equal(c.podSize(cat.record,cat.location),8);assert.equal(c.podSize(wild.record,wild.location),9);assert.equal(c.podSize(cat.record,{...cat.location,multi:false},9),1);assert.equal(c.podSize(cat.record,cat.location,30),9);
});
test('burst recommendations show per-creature and aggregate DPS separately and preserve smoke protection',()=>{
 const p=profile(['Ancient staff','Trident of the seas','Slayer helmet (i)','Book of darkness']),t=target('dust-devil','Catacombs of Kourend'),r=best(p,t,'magic');
 assert.equal(r.supported,true,r.reason);assert.match(r.spell,/Barrage/);assert.equal(r.targets,8);assert.equal(r.aggregateDps,r.dps*8);assert.equal(r.effectiveTtk,r.ttk/8);assert.match(c.equipmentItem(r.loadout.head).name,/Slayer helmet/);
});
test('single-target magic receives no AoE multiplier, even in a multi-combat room',()=>{
 const p=profile(['Trident of the seas','Slayer helmet (i)']),t=target('dust-devil','Catacombs of Kourend'),r=best(p,t,'magic');assert.equal(r.targets,1);assert.equal(r.aggregateDps,r.dps);
});
test('stack hunter timing selects the matching location form and charges complete batches in estimates and simulation',()=>{
 const p=profile(['Ancient staff','Slayer helmet (i)']);p.methods['dust devils']={...c.defaultMethod(d,p,'dust devils'),variantId:'dust-devil',location:'Catacombs of Kourend',combatStyle:'magic',delay:2};
 p.goal={...p.goal,kind:'kills',quantity:1,targets:[{assignmentId:'dust devils',variantId:'dust-devil',priority:1}]};p.strategy='none';p.simulation.trials=100;
 const master=d.masters.find(m=>m.id==='nieve'),entry=master.tasks.find(t=>t.id==='dust devils'),single={...master,tasks:[{...entry,minimum:16,maximum:16}]},data={...d,masters:d.masters.map(m=>m.id===master.id?single:m)};
 const plan=c.evaluate(data,single,p,[]),row=plan.rows[0],calc=row.method.calculated;assert.equal(calc.targets,8);assert.match(row.method.combatNote,/Catacombs/);
 assert.equal(row.minutes,2*(calc.batchTtk+2)/60);assert.equal(c.combatSeconds(1,row.method,row.seconds),calc.batchTtk+2);
 const result=c.simulate(data,plan,p);assert.equal(result.unresolved,0);assert.ok(Math.abs(result.meanHours-(calc.batchTtk+2)/3600)<1e-10);
});
test('each chosen style preserves a required dragonfire shield and user style survives profile backup',()=>{
 const p=profile(['Abyssal whip','Dragon crossbow','Dragon bolts','Trident of the seas','Anti-dragon shield']),t=target('black-dragon');
 for(const family of ['melee','ranged','magic']){const r=best(p,t,family);assert.equal(r.supported,true,r.reason);assert.equal(r.loadout.shield,c.itemForLabel('Anti-dragon shield').id);assert.equal(r.family,family);}
 p.methods['black dragons']={...c.defaultMethod(d,p,'black dragons'),variantId:'black-dragon',combatStyle:'ranged',stackSize:3};const round=c.importProfiles(d,c.exportProfiles([p],p.id)).profiles[0];assert.equal(round.methods['black dragons'].combatStyle,'ranged');assert.equal(round.methods['black dragons'].stackSize,3);
});
test('elite Kourend removes Karuulm hazard boots in both owned and example equipment',()=>{
 const p=profile(['Abyssal whip','Dragon boots','Boots of stone']),t=target('wyrm','Karuulm Slayer Dungeon - lower level'),plan=g.fightPlan(t.record,t.form,t.state,t.location);
 p.diaries.kourend=0;assert.equal(c.equipmentItem(best(p,t).loadout.feet).name,'Boots of stone');
 p.diaries.kourend=1;assert.equal(c.equipmentItem(best(p,t).loadout.feet).name,'Dragon boots');
 assert.equal(g.gearSet(t.record,t.form,plan,t.state,t.location,'mid',p).slots.find(s=>s.slot==='Feet').item,'Dragon boots');
 p.diaries.kourend=0;assert.equal(g.gearSet(t.record,t.form,plan,t.state,t.location,'mid',p).slots.find(s=>s.slot==='Feet').item,'Boots of stone');
});
test('sanity validation rejects wrong slots and temporary Gauntlet gear is never recommended for Slayer',()=>{
 const p=profile(['Abyssal whip','Corrupted halberd (perfected)']),t=target('hellhound');p.combat.allowUnknownRequirements=true;
 assert.match(c.calculateCombat(p,t.record,t.form,{head:4151},{name:'Accurate',type:'slash',stance:'Accurate'},null,true,false).reason,/wrong gear slot/);
 assert.equal(c.equipmentItem(best(p,t).loadout.weapon).name,'Abyssal whip');
});
test('block optimisation reports current creature and candidate progress while reusing prepared rows',()=>{
 const p=profile(['Abyssal whip']);p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];const reports=[];
 c.optimise(d,d.masters.find(m=>m.id==='nieve'),p,10,(fraction,current)=>reports.push({fraction,current}));
 assert.ok(reports.some(r=>r.current.startsWith('Gear / ')));assert.ok(reports.some(r=>r.current.startsWith('Blocks and skips / ')));assert.ok(reports.every(r=>r.fraction>=0&&r.fraction<=1));
});
test('bank slot filters apply to the visible equipment rows',()=>{
 const bundle=buildSync({entryPoints:['src/ui/bank.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,sandbox={exports:{},module:{exports:{}},structuredClone,console};vm.runInNewContext(bundle,sandbox);
 const p=profile(['Abyssal whip','Dragon boots']),html=sandbox.module.exports.renderBank(p,{query:'',previews:[],levels:null,account:null,kind:'auto',group:false,slot:'feet'});
 assert.match(html,/Filter by gear slot/);assert.match(html,/Dragon boots/);assert.doesNotMatch(html,/Abyssal whip — OSRS Wiki/);
});


test('Ancient and demonbane recommendations respect autocast weapon restrictions',()=>{
 const p=profile(['Purging staff','Ancient staff','Slayer helmet (i)']),t=target('dust-devil','Catacombs of Kourend');
 const result=best(p,t,'magic');assert.equal(c.equipmentItem(result.loadout.weapon).name,'Ancient staff');assert.equal(result.spell,'Ice Barrage');
 const invalid=c.calculateCombat(p,t.record,t.form,{weapon:c.itemForLabel('Purging staff').id},{name:'Spell',type:'magic',stance:'Autocast'},'Ice Barrage',true,false);assert.equal(invalid.supported,false);assert.match(invalid.reason,/cannot autocast/);
 assert.equal(c.canAutocast(c.itemForLabel('Ancient staff'),'Dark Demonbane',{}),false);assert.equal(c.canAutocast(c.itemForLabel('Purging staff'),'Dark Demonbane',{}),true);
});

test('quest changes invalidate owned spellbook recommendations without a new bank export',()=>{
 const p=profile(['Ancient staff','Trident of the seas','Slayer helmet (i)']),t=target('dust-devil','Catacombs of Kourend');
 assert.equal(best(p,t,'magic').targets,8);p.quests['Desert Treasure I']=0;assert.equal(best(p,t,'magic').targets,1);
});


test('equal-DPS choices retain useful tank armour instead of suggesting empty slots',()=>{
 const p=profile(['Abyssal whip',"Torag's platebody","Verac's plateskirt"]),t=target('hellhound'),r=best(p,t);
 assert.equal(r.loadout.body,c.itemForLabel("Torag's platebody").id);assert.equal(r.loadout.legs,c.itemForLabel("Verac's plateskirt").id);
});
