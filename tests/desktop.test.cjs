const test = require('node:test');
const assert = require('node:assert/strict');
const {allowedExternal, sameDocument} = require('../desktop/navigation.cjs');
const {offlineStyle} = require('../desktop/offline-style.cjs');

test('desktop links only open the supported source sites over HTTPS', () => {
  for (const url of ['https://docs.google.com/spreadsheets/d/source', 'https://oldschool.runescape.wiki/w/Basilisk','https://runelite.net/plugin-hub/show/character-export','https://secure.runescape.com/m=news/meet-mortimer-your-newest-slayer-master?oldschool=1']) assert.equal(allowedExternal(url), true);
  for (const url of ['file:///C:/Windows/system32/cmd.exe', 'javascript:alert(1)', 'http://docs.google.com', 'https://docs.google.com.evil.example', 'https://other.example', 'https://user:password@docs.google.com', 'https://docs.google.com:444', 'invalid']) assert.equal(allowedExternal(url), false);
});

test('desktop navigation remains in its packaged document', () => {
  const document = 'file:///C:/Planner/resources/app.asar/web/index.html';
  assert.equal(sameDocument(document+'#', document), true);
  assert.equal(sameDocument(document+'#help', document), true);
  for (const url of ['file:///C:/elsewhere.html', 'https://docs.google.com', document+'?remote=1', 'invalid']) assert.equal(sameDocument(url, document), false);
});

test('character export IPC keeps filesystem discovery behind the trusted packaged renderer',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),handlers={},calls=[],window={webContents:{}},electron={app:{setName(){},setAppUserModelId(){},getPath:()=>'/test-home',requestSingleInstanceLock:()=>true,on(){},whenReady:()=>({then:fn=>{}})},BrowserWindow:function(){},dialog:{showOpenDialog:async(parent,options)=>{calls.push({parent,options});return {canceled:true,filePaths:[]};}},shell:{},session:{},ipcMain:{handle:(name,fn)=>handlers[name]=fn}};
 const source=fs.readFileSync(require('node:path').join(__dirname,'../desktop/main.cjs'),'utf8')+'\nmainWindow=globalThis.testWindow;';
 const discovery=[];const sandbox={testWindow:window,__dirname:'/app',require:name=>name==='electron'?electron:name==='./character-exports.cjs'?{findCharacterExports:async(options,mode)=>{discovery.push(mode);assert.equal(options.home,'/test-home');await options.chooseFolder({defaultPath:'/test-home/.runelite/character-exporter'});return null;}}:name==='./navigation.cjs'?{allowedExternal,sameDocument}:name==='./compact.cjs'?{compactWindow(){}}:name==='./hiscores.cjs'?{lookup(){}}:require(name)};
 vm.runInNewContext(source,sandbox);const invoke=handlers['character-exports'];assert.equal(typeof invoke,'function');
 return (async()=>{for(const event of [{sender:{},senderFrame:{url:'file:///app/web/index.html'}},{sender:window.webContents,senderFrame:{url:'https://other.example'}}])await assert.rejects(invoke(event,'auto'),/Unknown request source/);assert.equal(discovery.length,0);await invoke({sender:window.webContents,senderFrame:{url:require('node:url').pathToFileURL('/app/web/index.html').href}},'auto');assert.deepEqual(discovery,['auto']);assert.equal(calls[0].parent,window);})();
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
