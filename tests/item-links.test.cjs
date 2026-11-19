const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {buildSync}=require('esbuild');
const vm=require('node:vm');
const code=buildSync({entryPoints:['src/ui/item-links.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
const context={module:{exports:{}}};vm.runInNewContext(code,context);
const {itemText,hasItemIcon}=context.module.exports;
const atlas=require('../src/ui/item-art.json');
const g=require('../.desktop-build/guide.cjs');

test('item artwork is bundled with complete pinned provenance and valid frames',()=>{
 const png=fs.readFileSync('assets/items.png');
 assert.equal(png.readUInt32BE(16),atlas.columns*atlas.cell);assert.equal(png.readUInt32BE(20),atlas.rows*atlas.cell);
 const frames=new Set();
 for(const entry of Object.values(atlas.entries)){
  assert.ok(entry.source.includes(atlas.sourceCommit));assert.match(entry.sha256,/^[a-f0-9]{64}$/);
  assert.ok(entry.frame>=0&&entry.frame<atlas.columns*atlas.rows);frames.add(entry.frame);
 }
 assert.equal(frames.size,Object.keys(atlas.entries).length);
 for(const ref of Object.values(atlas.aliases))if(ref.itemId!==null)assert.ok(atlas.entries[ref.itemId]);
});

test('compound recommendations link each real item once, retain prose and escape unsafe text',()=>{
 const text=itemText('Anti-venom+ or extended anti-venom+ <script>x</script>');
 assert.equal((text.match(/<a /g)||[]).length,2);assert.match(text,/\/Anti-venom%2B/);assert.match(text,/\/Extended_anti-venom%2B/);
 assert.match(text,/&lt;script&gt;/);assert.doesNotMatch(text,/<script>|https:\/\/raw|<img/);
 assert.match(itemText("V's shield"),/V%27s_shield|V&#39;s_shield/);
 assert.doesNotMatch(itemText('NotAnAbyssal whipSuffix'),/<a /);
 const generic=itemText("Blessed d'hide body");assert.match(generic,/Blessed_dragonhide_armour/);assert.match(generic,/Icon: Saradomin/);
 assert.doesNotMatch(itemText('None — two-handed weapon'),/<a /);
});

test('every generated gear item has an icon, while spells link without posing as inventory items',()=>{
 for(const record of Object.values(g.GUIDE.records))for(const approach of g.APPROACHES)for(const onTask of [true,false]){
  const state={...g.defaultGuideState(),variantId:record.id,formId:record.defaultForm,approach,onTask};
  const form=g.guideForm(record,state),loc=g.selectedLocation(record,form,state),plan=g.fightPlan(record,form,state,loc);
  for(const tier of ['mid','max'])for(const row of g.gearSet(record,form,plan,state,loc,tier).slots){
   if(row.item.startsWith('None'))continue;
   if(row.slot==='Spell'){assert.match(itemText(row.item),/<a /);continue;}
   assert.equal(hasItemIcon(row.item),true,row.item);
  }
 }
 for(const label of ['Prayer potions','super restores','Ranging potion','Magic potion','Super combat potion','Extended antifire','Antidote++','moonlight potions','Sanfew serum'])assert.equal(hasItemIcon(label),true,label);
});
