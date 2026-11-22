const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs');
const gear={weapon:29000,ammo:28991,head:29010,body:29004,legs:29007};
function fixture(id='hellhound'){
 const p=c.maxedProfile(c.catalogue);p.assumeAllGear=false;p.bank=c.emptyBank();p.combat=c.defaultCombat();
 for(const id of Object.values(gear))p.bank.manual[id]=1;
 const record=g.GUIDE.records[id],state={...g.defaultGuideState(),variantId:id,formId:record.defaultForm,approach:'ranged-tank'},form=g.guideForm(record,state);
 return {p,record,state,form,calc:(loadout=gear)=>c.calculateCombat(p,record,form,loadout,{name:'Rapid',type:'ranged',stance:'Rapid'},null,true,false)};
}
test('sustained burn uses accuracy and the five-stack cap rather than a flat damage bonus',()=>{
 assert.equal(c.eclipseBurnDps(0,3),0);
 const full=c.eclipseBurnDps(1,3),half=c.eclipseBurnDps(.5,3);
 assert.ok(full>1&&full<10*.2/1.8);assert.ok(half>0&&half<full);assert.ok(c.eclipseBurnDps(1,4)<full);
 assert.equal(c.eclipseBurnDps(1,3),full);assert.throws(()=>c.eclipseBurnDps(2,3));
});
test('finite-fight burn stops at death, is deterministic and starts empty on each creature',()=>{
 const hits=[{damage:10,probability:1,accurate:true}];
 const short=c.eclipseKillTime(1,3,hits,1.8),long=c.eclipseKillTime(200,3,hits,36);
 assert.equal(short.seconds,1.8);assert.equal(short.error,0);assert.ok(long.seconds<36&&long.seconds>25);assert.ok(long.error>0);
 assert.deepEqual(c.eclipseKillTime(200,3,hits,36),long);
 assert.throws(()=>c.eclipseKillTime(20,3,[{damage:0,probability:1,accurate:true}],3));
});
test('the complete set adds capped burn while incomplete sets and wrong weapons retain ordinary DPS',()=>{
 const t=fixture(),full=t.calc(),without=t.calc({...gear,head:0});
 assert.ok(full.supported,full.reason);assert.ok(full.burn.dps>0);assert.ok(full.ttk<without.ttk);assert.equal(full.burn.trials,2048);
 assert.ok(Math.abs(full.burn.dps-c.eclipseBurnDps(full.hitChance,3))<1e-10);
 assert.equal(without.burn,undefined);assert.match(full.notes.join(' '),/stop at death/);
 const other=t.calc({...gear,weapon:9185,ammo:9144});assert.equal(other.burn,undefined);
});
test('the owned search can retain Eclipse full-set synergy without relaxing equipment requirements',()=>{
 const t=fixture(),result=c.bestOwnedGear(t.p,t.record,t.form,t.state,g.selectedLocation(t.record,t.form,t.state,t.p));
 assert.ok(result.supported,result.reason);assert.ok(result.burn?.dps>0);assert.equal(result.loadout.head,gear.head);assert.equal(t.p.combat.allowUnknownRequirements,false);
});
test('burn-immune targets receive no added burn DPS and no false set-effect rejection',()=>{
 const t=fixture('cerberus');
 // A copied source form retains the engine NPC's immune identity.
 const result=t.calc();assert.ok(result.supported,result.reason);assert.equal(result.burn.dps,0);assert.equal(result.burn.trials,0);assert.match(result.notes.join(' '),/immune/);
});
test('hunter timing uses the full-set finite-fight estimate and measured methods keep priority',()=>{
 const t=fixture();t.p.combat.enabled=true;t.p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];
 const preview=c.calculateMethodPreview(c.catalogue,t.p,'hellhounds','hellhound');assert.ok(preview.calculated);assert.ok(preview.calculated.ttk>0);
 const configured={...c.defaultMethod(c.catalogue,t.p,'hellhounds'),variantId:'hellhound',timing:'kills-hour',rate:100};t.p.methods['hellhounds::hellhound']=configured;
 assert.equal(c.calculateMethodPreview(c.catalogue,t.p,'hellhounds','hellhound').calculated,undefined);
});
