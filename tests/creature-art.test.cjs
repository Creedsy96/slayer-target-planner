const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {buildSync}=require('esbuild');
const vm=require('node:vm');
const code=buildSync({entryPoints:['src/ui/creature-art.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
const context={module:{exports:{}}};vm.runInNewContext(code,context);
const {creatureIcon,creatureName,assignmentName,creatureOptions}=context.module.exports;
const atlas=require('../src/ui/creature-art.json');
const data=require('../.desktop-build/core.cjs').catalogue;

test('every supported variant and assignment resolves to a sourced offline creature frame',()=>{
  const png=fs.readFileSync('assets/creatures.png');
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),atlas.columns*64);
  assert.equal(png.readUInt32BE(20),atlas.rows*64);
  const frames=new Set();
  for(const variant of data.variants){
    const entry=atlas.entries[variant.id];assert.ok(entry,variant.id);
    assert.ok(entry.imagePage.startsWith('https://oldschool.runescape.wiki/'));
    assert.match(entry.originalSha256,/^[a-f0-9]{64}$/);
    assert.ok(entry.frame<atlas.columns*atlas.rows);frames.add(entry.frame);
    assert.ok(creatureIcon(variant.id),variant.id);
  }
  assert.equal(frames.size,data.variants.length);
  for(const assignment of data.assignments)assert.match(assignmentName(data,assignment.id),/class="creature-icon"/,assignment.id);
  assert.deepEqual(fs.readFileSync('dist/creatures.png'),png);
});

test('explicit references choose artwork by ID, escape labels and render missing IDs plainly',()=>{
  const html=creatureName('cerberus','<Renamed creature> & friends');
  assert.equal((html.match(/class="creature-name"/g)||[]).length,1);
  assert.ok(html.includes(creatureIcon('cerberus')));
  assert.match(html,/&lt;Renamed creature&gt; &amp; friends/);
  assert.match(html,/aria-hidden="true"/);
  assert.equal(creatureName('unknown-creature','Cerberus & dragons'),'Cerberus &amp; dragons');
  assert.equal(creatureIcon('unknown-creature'),'');
  assert.ok(creatureIcon('cerberus',true).includes('creature-icon--large'));
  assert.equal(assignmentName(data,'basilisks','Renamed task'),creatureName(data.assignments.find(a=>a.id==='basilisks').variantIds[0],'Renamed task'));
});

test('picker options carry explicit IDs and never infer artwork from their labels',()=>{
  const html=creatureOptions(data,'variant',[['cerberus','Different label'],['','Cerberus']], 'cerberus');
  assert.match(html,/<option value="cerberus" data-creature-id="cerberus" selected>Different label<\/option>/);
  assert.match(html,/<option value="" data-creature-id="" >Cerberus<\/option>/);
  assert.doesNotMatch(html,/class="creature/);
  assert.match(creatureOptions(data,'assignment',[['basilisks','Basilisks']],''),/data-creature-id="basilisk-knight"/);
});

test('quest names, character names and Slayer reward labels remain plain text',()=>{
  const uiCode=buildSync({entryPoints:['src/ui/character-setup.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
  const m={exports:{}};new Function('module','exports',uiCode)(m,m.exports);
  const c=require('../.desktop-build/core.cjs'),p=c.newCharacter(data,'Cerberus');p.setup.step=4;
  const html=m.exports.renderCharacterSetup(data,p,null,false);
  assert.match(html,/CHARACTER SETUP · Cerberus<\/div>/);
  for(const name of ['Ernest the Chicken','Song of the Elves','The Giant Dwarf','Skippy and the Mogres'])assert.ok(html.includes(`<label>${name}<select`),name);
  assert.doesNotMatch(html,/class="creature-(?:name|icon)"/);
  p.setup.step=3;const rewards=m.exports.renderCharacterSetup(data,p,null,false);
  assert.match(rewards,/<strong>Like a boss<\/strong>/);
  assert.equal((rewards.match(/class="creature-icon"/g)||[]).length,Object.keys(data.unlocks).length);
  assert.equal(context.module.exports.decorateCreatureText,undefined);
  assert.equal(context.module.exports.creatureText,undefined);
});

const pickerCode=buildSync({entryPoints:['src/ui/creature-picker.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
const pickerContext={module:{exports:{}},Event,CSS:{escape:v=>v}};vm.runInNewContext(pickerCode,pickerContext);
const {chooseCreature}=pickerContext.module.exports;
test('only marked creature selectors are enhanced and the trigger uses option metadata',()=>{
  let trigger;
  pickerContext.document={createElement:()=>({dataset:{},setAttribute(){},addEventListener(){}})};
  const select={options:[{text:'Ernest the Chicken'}],selectedOptions:[{text:'Ernest the Chicken',dataset:{creatureId:'cerberus'}}],dataset:{},id:'test-creature',getAttribute:()=>null,after:button=>{trigger=button;}};
  pickerContext.module.exports.enhanceCreaturePickers({querySelectorAll:selector=>{
    assert.equal(selector,'select[data-creature-picker]:not([data-creature-enhanced])');return [select];
  }});
  assert.ok(trigger.innerHTML.includes(creatureIcon('cerberus')));
  assert.ok(!trigger.innerHTML.includes(creatureIcon('chicken')));
  assert.match(trigger.innerHTML,/<span>Ernest the Chicken<\/span>/);
});
test('an open picker commits through the live selector after a worker replaces the original view',()=>{
  const events=[];
  const current={value:'hellhounds',options:[{value:'hellhounds',disabled:false},{value:'basilisks',disabled:false}],dispatchEvent:event=>events.push(event)};
  const root={querySelector:selector=>{assert.equal(selector,'select[data-picker-source="0:assignmentId"]');return current;}};
  assert.equal(chooseCreature(root,'0:assignmentId','basilisks'),true);
  assert.equal(current.value,'basilisks');assert.equal(events.length,1);
  assert.equal(events[0].type,'change');assert.equal(events[0].bubbles,true);
});
test('a stale or disabled picker option cannot commit an unsupported selection',()=>{
  const current={value:'hellhounds',options:[{value:'basilisks',disabled:true}],dispatchEvent:()=>assert.fail('Must not emit change')};
  assert.equal(chooseCreature({querySelector:()=>current},'target','basilisks'),false);
  assert.equal(chooseCreature({querySelector:()=>current},'target','unknown'),false);
  assert.equal(chooseCreature({querySelector:()=>null},'target','hellhounds'),false);
  assert.equal(current.value,'hellhounds');
});
