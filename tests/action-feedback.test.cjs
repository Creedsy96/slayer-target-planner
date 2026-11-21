const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
function moduleAt(file,globals={}){const code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;const mod={exports:{}};new Function('module','exports',...Object.keys(globals),code)(mod,mod.exports,...Object.values(globals));return mod.exports;}
const {feedbackFix,captureAction}=moduleAt('src/ui/action-feedback.ts');
const {noticePosition,focusCorrection}=moduleAt('src/ui/action-notice.ts');
const origin={route:'plan',characterId:'synthetic',selector:'[data-action="simulate"]',index:1,action:'simulate',rect:{left:300,top:500,bottom:540}};
function profile(){const p=c.maxedProfile(d);p.assumeAllGear=false;p.combat.enabled=false;p.goal.targets=[{assignmentId:'hellhounds',variantId:'hellhound',priority:1}];return p;}
test('missing points resolves to the main planner balance rather than unrelated account settings',()=>{
 const p=profile();p.points=null;const fix=feedbackFix(d,p,'Enter current points before simulating legal funded actions.',origin);
 assert.equal(fix.setting,'points');assert.equal(fix.route,'plan');assert.equal(fix.label,'Enter current points');assert.equal(p.points,null);
});
test('block purchase and reserve failures have distinct correction controls',()=>{
 const p=profile();assert.equal(feedbackFix(d,p,'Enter sufficient current points to buy these blocks while preserving the reserve.',origin).setting,'points');
 assert.equal(feedbackFix(d,p,'The balance would fall below the reserve.',origin).setting,'reserve');
});
test('all master streak groups and current-task streaks resolve to their actual fields',()=>{
 const p=profile();for(const group of ['normal','wilderness','mortimer'])assert.equal(feedbackFix(d,p,'Enter the current '+group+' streak before simulation.',origin).setting,'streaks.'+group);
 p.current.masterId='krystilia';assert.equal(feedbackFix(d,p,'Enter the streak for the current task master.',origin).setting,'streaks.wilderness');
});
test('current and previous Konar confirmations are not confused with one another',()=>{
 const p=profile();assert.equal(feedbackFix(d,p,'Confirm whether the current task location supports the target variant.',origin).setting,'current.targetCompatible');
 assert.equal(feedbackFix(d,p,'Confirm whether the previous task location supports the target variant.',origin).setting,'previousTargetCompatible');
});
test('task quantity, pending master, cape history and modifier errors link into task-state controls',()=>{
 const p=profile();for(const [message,field]of [
  ['Enter positive remaining task count, or choose Requesting a new offer for a completed task.','current.remaining'],
  ['Choose a valid pending-offer master.','current.masterId'],
  ['Choose the actual previous task master before simulating cape repeats.','previousMasterId'],
  ['Enter the actual current-task modifier.','current.modifier'],
  ['Mortimer cape choice policies are not modelled; disable the cape for this scenario.','cape']
 ])assert.equal(feedbackFix(d,p,message,origin).setting,field,message);
 assert.equal(feedbackFix(d,p,'Supply the actual pending offer options.',origin).selector,'[data-action="add-offer"]');
});
test('pending Mortimer modifier failures point to the offer options instead of current-task modifiers',()=>{
 const p=profile();p.current.kind='offer';const fix=feedbackFix(d,p,'Choose an unlocked actual Mortimer modifier.',origin);
 assert.equal(fix.selector,'[data-offer-field="modifier"]');assert.equal(fix.setting,undefined);
});
test('blocked-target conflicts and measured-method validation return to the relevant editable controls',()=>{
 const p=profile();assert.equal(feedbackFix(d,p,'A target cannot be blocked. Remove it from the target set first.',origin).selector,'[data-target-field="assignmentId"]');
 const method={...origin,route:'methods',selector:'[data-method="basilisks::basilisk-knight"][data-method-field="dps"]'};
 const fix=feedbackFix(d,p,'Effective DPS must be positive.',method);assert.equal(fix.selector,method.selector);assert.equal(fix.label,'Review this value');
});
test('Mortimer progression, preset names, master selection and drop rates have specific corrections',()=>{
 const p=profile();const progress=feedbackFix(d,p,'Enter completed Mortimer tasks before simulation.',origin);assert.equal(progress.route,'account');assert.equal(progress.setting,'mortimerTasks');
 assert.equal(feedbackFix(d,p,'Enter a preset name.',origin).selector,'#preset-name');
 assert.equal(feedbackFix(d,p,'Select a master first.',origin).selector,'#hunt-master');
 assert.equal(feedbackFix(d,p,'No positive drop probability is available.',origin).setting,'goal.customDropRate');
});
test('failed plan requirements retain their named correction destination and reward control',()=>{
 const p=profile();p.goal.targets=[{assignmentId:'basilisks',variantId:'basilisk-knight',priority:1}];
 const plan=c.evaluate(d,d.masters.find(m=>m.id==='duradel'),p,[]),fix=feedbackFix(d,p,plan.reason,origin,plan);
 assert.equal(fix.route,'account');assert.equal(fix.filter,'Basilocked');assert.equal(fix.selector,'[data-fact-toggle="unlocks"][data-key="basilocked"]');
});
test('invalid typed values and imports retain the initiating field or import page',()=>{
 const p=profile(),input={...origin,setting:'simulation.trials'};
 assert.equal(feedbackFix(d,p,'Value must be at least 100.',input).setting,'simulation.trials');
 assert.equal(feedbackFix(d,p,'Invalid quest JSON.',{...origin,route:'account',action:'preview-quests'}).selector,'#quest-json');
 const bank=feedbackFix(d,p,'Unsupported export.',{...origin,route:'bank',selector:'[data-bank-action="choose"]'});assert.equal(bank.route,'bank');assert.equal(bank.selector,'[data-bank-action="choose"]');
});
test('banner placement uses nearby free space and remains inside narrow or scrolled viewports',()=>{
 assert.deepEqual(noticePosition({left:300,top:100,bottom:140},{width:460,height:150},{width:1200,height:800}),{left:300,top:152});
 assert.deepEqual(noticePosition({left:900,top:650,bottom:690},{width:460,height:150},{width:1200,height:800}),{left:728,top:488});
 for(const anchor of [undefined,{left:-200,top:-100,bottom:-60},{left:1000,top:1500,bottom:1540}]){
  const pos=noticePosition(anchor,{width:336,height:200},{width:360,height:640});assert.ok(pos.left>=12&&pos.left+336<=348);assert.ok(pos.top>=12&&pos.top+200<=628);
 }
});
test('duplicate simulate controls retain the exact initiating occurrence and pre-render geometry',()=>{
 const first={},second={id:'',dataset:{action:'simulate'},hasAttribute:k=>k==='data-action',getAttribute:()=> 'simulate',getBoundingClientRect:()=>({left:99,top:222,bottom:260})};
 const module=moduleAt('src/ui/action-feedback.ts',{CSS:{escape:s=>s},document:{querySelectorAll:()=>[first,second]}});
 const snapshot=module.captureAction(second,'plan','test');assert.equal(snapshot.index,1);assert.deepEqual(snapshot.rect,{left:99,top:222,bottom:260});
});
test('correction expands containing disclosures and focuses the real control',()=>{
 class Details{};class Select{};
 const {focusCorrection}=moduleAt('src/ui/action-notice.ts',{HTMLDetailsElement:Details,HTMLSelectElement:Select});
 const outer=new Details(),inner=new Details();outer.parentElement=null;inner.parentElement=outer;const calls=[];
 const field={parentElement:inner,offsetWidth:10,classList:{remove(){},add(v){calls.push(v);}},focus(o){calls.push(o);},scrollIntoView(o){calls.push(o);},addEventListener(){}};
 focusCorrection(field);assert.equal(outer.open,true);assert.equal(inner.open,true);assert.deepEqual(calls[0],{preventScroll:true});assert.deepEqual(calls[1],{block:'center',behavior:'auto'});assert.ok(calls.includes('feedback-focus'));
});
test('notification escapes content, has an actionable link, persists and never focuses on appearance',()=>{
 const events={},windowEvents={},rootEvents={},focusCalls=[];let opened=false;
 const panel={id:'',className:'',dataset:{},style:{},contains:()=>false,setAttribute(k,v){this[k]=v;},addEventListener(k,v){events[k]=v;},matches:()=>opened,showPopover(){opened=true;},hidePopover(){opened=false;},getBoundingClientRect:()=>({width:460,height:170})};
 const target={getBoundingClientRect:()=>({left:100,top:120,bottom:160,width:180,height:40}),focus(){focusCalls.push('focus');}};
 const doc={body:{append(){}},createElement:()=>panel,addEventListener(k,v){rootEvents[k]=v;},querySelectorAll:()=>[target]};
 const {ActionNotice}=moduleAt('src/ui/action-notice.ts',{document:doc,window:{innerWidth:1200,innerHeight:800,addEventListener(k,v){windowEvents[k]=v;}}});
 let corrected,dismissed=0;const notice=new ActionNotice(()=>({route:'plan',characterId:'synthetic'}),fix=>corrected=fix,()=>dismissed++);
 const fix={route:'plan',setting:'points',label:'Enter <points>'};notice.show({level:'error',message:'Invalid <value> & data',fix},{...origin,index:0});
 assert.equal(opened,true);assert.equal(panel.role,'alert');assert.match(panel.innerHTML,/Invalid &lt;value&gt; &amp; data/);assert.match(panel.innerHTML,/href="#plan" data-notice-fix/);assert.match(panel.innerHTML,/Enter &lt;points&gt;/);assert.equal(panel.style.top,'172px');assert.deepEqual(focusCalls,[]);
 windowEvents.scroll();assert.equal(opened,true);
 events.click({target:{closest:()=>({hasAttribute:()=>true})},preventDefault(){},stopPropagation(){}});assert.equal(opened,false);assert.deepEqual(corrected,fix);assert.equal(dismissed,1);
});
test('replacement controls update the anchor, off-route errors use a visible fallback, and Escape dismisses',()=>{
 let open=false,route='plan',rect={left:100,top:120,bottom:160,width:150,height:40},dismissed=0;const events={};
 const panel={dataset:{},style:{},contains:()=>false,setAttribute(){},addEventListener(){},matches:()=>open,showPopover(){open=true;},hidePopover(){open=false;},getBoundingClientRect:()=>({width:460,height:170})};
 const doc={body:{append(){}},createElement:()=>panel,querySelectorAll:()=>[{getBoundingClientRect:()=>rect}],addEventListener(k,v){events[k]=v;}};
 const {ActionNotice}=moduleAt('src/ui/action-notice.ts',{document:doc,window:{innerWidth:1200,innerHeight:800,addEventListener(){}}});
 const notice=new ActionNotice(()=>({route,characterId:'synthetic'}),()=>{},()=>dismissed++);
 notice.show({level:'warning',message:'Review this assumption',fix:{route:'plan',label:'Review'}},{...origin,index:0});assert.equal(panel.style.top,'172px');
 rect={left:300,top:400,bottom:440,width:150,height:40};notice.refresh();assert.equal(panel.style.top,'452px');
 route='bank';notice.refresh();assert.equal(panel.style.top,'618px');assert.equal(panel.style.left,'370px');
 events.keydown({key:'Escape'});assert.equal(open,false);assert.equal(dismissed,1);
});
