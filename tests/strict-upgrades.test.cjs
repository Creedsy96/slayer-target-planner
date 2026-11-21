const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
const item=name=>{const value=c.itemForLabel(name);assert.ok(value,name);return value;};
function pair(){return [structuredClone(item('Rune platebody')),structuredClone(item('Adamant platebody'))];}
function row(name,extras={}){const i=item(name);return {id:i.id,name:i.name,selected:false,owned:true,dps:4,aggregateDps:4,delta:0,prayer:i.bonuses.prayer,defensive:i.defensive,defence:0,reason:'',...extras};}
test('a permanent strict upgrade requires every offensive, strength, prayer and defensive bonus to be no worse',()=>{
 const [better,worse]=pair();assert.ok(c.strictGearUpgrade(better,worse));assert.ok(!c.strictGearUpgrade(worse,better));
 for(const group of ['offensive','bonuses','defensive'])for(const key of Object.keys(worse[group])){
  const trial=structuredClone(better);trial[group][key]=worse[group][key]-1;assert.equal(c.strictGearUpgrade(trial,worse),false,group+'.'+key);
 }
 const equal={...structuredClone(worse),id:999999};assert.equal(c.strictGearUpgrade(equal,worse),false);
});
test('extra weight, unknown weight, slower weapons, different attacks and two-handed trade-offs prevent hiding',()=>{
 const [better,worse]=pair();better.weight=worse.weight+0.001;assert.equal(c.strictGearUpgrade(better,worse),false);
 delete better.weight;assert.equal(c.strictGearUpgrade(better,worse),false);
 const rune=structuredClone(item('Rune scimitar')),adamant=item('Adamant scimitar');assert.ok(c.strictGearUpgrade(rune,adamant));
 rune.speed=adamant.speed+1;assert.equal(c.strictGearUpgrade(rune,adamant),false);rune.speed=adamant.speed;
 rune.category='Blunt';assert.equal(c.strictGearUpgrade(rune,adamant),false);rune.category=adamant.category;
 rune.isTwoHanded=true;assert.equal(c.strictGearUpgrade(rune,adamant),false);
});
test('degradable, charged, consumable, protective and unreviewed utility equipment cannot prove a strict upgrade',()=>{
 const [better,worse]=pair();for(const name of ["Dharok's platebody",'Crystal body','Amulet of blood fury','Ring of recoil','Ruby bolts (e)','Dragon dart','Mirror shield','Slayer helmet (i)','Void knight top','Lightbearer','Dragon scimitar']){
  const special={...structuredClone(better),name,id:99999};assert.equal(c.strictGearUpgrade(special,worse),false,name);assert.equal(c.strictGearUpgrade(better,{...worse,name}),false,name);
 }
 for(const version of ['Charged','Uncharged','100']){better.version=version;assert.equal(c.strictGearUpgrade(better,worse),false,version);}
});
test('filter preserves the shown item, actual DPS trade-offs and unavailable upgrade candidates',()=>{
 const weaker=row('Adamant platebody'),stronger=row('Rune platebody');let result=c.filterStrictUpgrades([weaker,stronger],false);
 assert.deepEqual(result.rows.map(r=>r.name),['Rune platebody']);assert.equal(result.outclassed[0].upgrade,'Rune platebody');
 for(const unavailable of [{dps:null},{owned:false},{dps:3.9},{aggregateDps:3.9},{ammoId:123}]){
  assert.equal(c.filterStrictUpgrades([weaker,{...stronger,...unavailable}],false).outclassed.length,0);
 }
 assert.equal(c.filterStrictUpgrades([{...weaker,selected:true},stronger],false).outclassed.length,0);
 assert.equal(c.filterStrictUpgrades([weaker,{...stronger,owned:false}],true).outclassed.length,1);
});
test('sorting uses DPS, prayer and then relevant average defence, with the displayed baseline kept first',()=>{
 const a=row('Adamant platebody',{id:1,defence:50}),b=row('Rune platebody',{id:2,defence:80});
 assert.ok(c.compareGearRows(b,a)<0);assert.ok(c.compareGearRows({...a,prayer:1},b)<0);
 assert.ok(c.compareGearRows({...a,dps:5,aggregateDps:5},b)<0);assert.ok(c.compareGearRows({...a,selected:true},b)<0);
 assert.ok(c.compareGearRows({...a,aggregateDps:4+1e-12},b)>0);
 const form=g.GUIDE.records.hellhound.forms[0],armour={...item('Rune platebody'),defensive:{stab:20,slash:80,crush:500,ranged:1000,magic:2000}};
 assert.equal(c.defenceScore(armour,{...form,'attack style':'Stab, Slash'}),50);
 assert.equal(c.defenceScore(armour,{...form,'attack style':'Magic, Ranged'}),1500);
});
test('real slot comparisons hide lesser platebodies, retain maintenance/protection choices and allow explicit hidden downgrades',()=>{
 const p=c.maxedProfile(d);p.assumeAllGear=false;p.bank=c.emptyBank();p.combat={...c.defaultCombat(),enabled:true};
 for(const name of ['Abyssal whip','Bronze platebody','Iron platebody','Adamant platebody','Rune platebody',"Dharok's platebody",'Proselyte hauberk'])p.bank.manual[item(name).id]=1;
 const record=g.GUIDE.records.hellhound,state={...g.defaultGuideState(),variantId:record.id,formId:record.defaultForm,approach:'melee-prayer'},form=g.guideForm(record,state);
 const r=c.bestOwnedGear(p,record,form,state,g.selectedLocation(record,form,state,p)),comparison=c.compareOwnedSlot(p,state,r,'body');
 assert.equal(comparison.rows.some(r=>r.name==='Adamant platebody'),false);assert.ok(comparison.rows.some(r=>r.name==='Rune platebody'));
 assert.ok(comparison.rows.some(r=>r.name==="Dharok's platebody"));assert.ok(comparison.rows.some(r=>r.name==='Proselyte hauberk'));
 assert.ok(comparison.outclassed.some(r=>r.name==='Adamant platebody'));
 c.selectCreatureGear(d,p,state,r,{family:'melee',slot:'body',id:item('Adamant platebody').id});
 const chosen=c.bestOwnedGear(p,record,form,state,g.selectedLocation(record,form,state,p));assert.equal(chosen.loadout.body,item('Adamant platebody').id);
 assert.ok(c.compareOwnedSlot(p,state,chosen,'body').rows.some(r=>r.name==='Adamant platebody'&&r.selected));
});
test('comparison renderer keeps outclassed choices collapsed with a named upgrade and selectable fallback',()=>{
 const source=buildSync({stdin:{contents:"export {renderGearComparison} from './src/ui/gear-inspector';",resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
 const vm=require('node:vm'),exports={},module={exports};vm.runInNewContext(source,{module,exports,require,console});
 const html=module.exports.renderGearComparison({slot:'body',selectedId:0,reason:'',context:'',notes:'',rows:[row('Rune platebody')],outclassed:[row('Adamant platebody',{upgrade:'Rune platebody'})]},true);
 assert.match(html,/<details class="outclassed-gear"><summary>Show 1 strictly outclassed item/);assert.doesNotMatch(html,/<details class="outclassed-gear" open/);
 assert.match(html,/Strict upgrade: Rune platebody/);assert.match(html,/aria-label="Use Adamant platebody"/);assert.match(html,/DPS, then prayer, then average defence/);
});
