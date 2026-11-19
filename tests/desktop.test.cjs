const test = require('node:test');
const assert = require('node:assert/strict');
const {allowedExternal, sameDocument} = require('../desktop/navigation.cjs');
const {offlineStyle} = require('../desktop/offline-style.cjs');

test('desktop links only open the two source sites over HTTPS', () => {
  for (const url of ['https://docs.google.com/spreadsheets/d/source', 'https://oldschool.runescape.wiki/w/Basilisk']) assert.equal(allowedExternal(url), true);
  for (const url of ['file:///C:/Windows/system32/cmd.exe', 'javascript:alert(1)', 'http://docs.google.com', 'https://docs.google.com.evil.example', 'https://other.example', 'https://user:password@docs.google.com', 'https://docs.google.com:444', 'invalid']) assert.equal(allowedExternal(url), false);
});

test('desktop navigation remains in its packaged document', () => {
  const document = 'file:///C:/Planner/resources/app.asar/web/index.html';
  assert.equal(sameDocument(document+'#', document), true);
  assert.equal(sameDocument(document+'#help', document), true);
  for (const url of ['file:///C:/elsewhere.html', 'https://docs.google.com', document+'?remote=1', 'invalid']) assert.equal(sameDocument(url, document), false);
});

test('offline font removal preserves root colour and typography declarations', () => {
  const fs = require('node:fs');
  const css = fs.readFileSync(require('node:path').join(__dirname,'../dist/style.css'), 'utf8');
  const converted = offlineStyle(css);
  assert.ok(converted.startsWith(':root{'));
  assert.ok(converted.includes('--text:#edf1e9'));
  assert.ok(converted.includes("Segoe UI"));
  assert.ok(!converted.includes('@import'));
  assert.ok(!converted.includes('fonts.googleapis.com'));
  assert.equal(offlineStyle('@import url("https://font.example/a;b");\r\n:root{color:white}'), ':root{color:white}\n.desktop-brand-icon{width:48px;height:48px;object-fit:contain}\n');
});

const {hiscoresUrl,lookup}=require('../desktop/hiscores.cjs');
test('hiscores bridge has a fixed destination, validation and size bound',async()=>{
 assert.equal(hiscoresUrl('Test Name'),'https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player=Test%20Name');
 for(const name of ['https://evil','',null,'a'.repeat(13),'name&url=x'])assert.throws(()=>hiscoresUrl(name));
 assert.equal(await lookup('Test',async()=>new Response('{"skills":[]}')),'{"skills":[]}');
 await assert.rejects(lookup('Test',async()=>new Response('x'.repeat(100001))),/too large/);
 await assert.rejects(lookup('Test',async()=>new Response('',{status:404})),/not found/);
});
