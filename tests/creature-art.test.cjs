const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {buildSync}=require('esbuild');
const vm=require('node:vm');
const code=buildSync({entryPoints:['src/ui/creature-art.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
const context={module:{exports:{}}};vm.runInNewContext(code,context);
const {creatureId,creatureIcon,creatureText}=context.module.exports;
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
    assert.ok(creatureId(variant.name),variant.name);
  }
  assert.equal(frames.size,data.variants.length);
  for(const assignment of data.assignments)assert.ok(creatureId(assignment.name),assignment.name);
  assert.deepEqual(fs.readFileSync('dist/creatures.png'),png);
});

test('creature decorations preserve readable names, escape markup and avoid matching word fragments',()=>{
  const input='Cerberus, BLACK DRAGONS and Basilisk Knight; rates and batched data. <script>alert(1)</script>';
  const html=creatureText(input);
  assert.equal((html.match(/class="creature-name"/g)||[]).length,3);
  assert.ok(html.includes('aria-hidden="true"'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('rates and batched data'));
  assert.equal(creatureText(input),html,'Repeated renders must reset matcher state');
  assert.equal(creatureIcon('unknown-creature'),'');
});

test('longest creature names get one specific badge instead of overlapping generic badges',()=>{
  const html=creatureText('Brutal black dragon and Black dragon (level 227)');
  assert.equal((html.match(/class="creature-name"/g)||[]).length,2);
  assert.equal(creatureId('  CERBERUS '),'cerberus');
  assert.ok(creatureIcon('cerberus',true).includes('creature-icon--large'));
});

const pickerCode=buildSync({entryPoints:['src/ui/creature-picker.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
const pickerContext={module:{exports:{}},Event,CSS:{escape:v=>v}};vm.runInNewContext(pickerCode,pickerContext);
const {chooseCreature}=pickerContext.module.exports;
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
