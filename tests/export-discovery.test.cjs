const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {exportRoot,findCharacterExports}=require('../desktop/character-exports.cjs');
const c=require('../.desktop-build/core.cjs');
async function fixture(t){const home=await fs.mkdtemp(path.join(os.tmpdir(),'slayer-exports-'));t.after(()=>fs.rm(home,{recursive:true,force:true}));return home;}
async function writeCharacter(home,name='Test Player',files={'character.json':'{"stats":{}}','bank.json':'{"items":[]}'}){
 const folder=path.join(exportRoot(home),name);await fs.mkdir(folder,{recursive:true});for(const [name,text]of Object.entries(files))await fs.writeFile(path.join(folder,name),text);return folder;
}
test('one exported character is detected at the actual RuneLite home path without opening a picker',async t=>{
 const home=await fixture(t),folder=await writeCharacter(home);await fs.writeFile(path.join(folder,'collection_log.json'),'private unrelated data');await fs.writeFile(path.join(folder,'notes.txt'),'do not read');await fs.mkdir(path.join(exportRoot(home),'empty-character'));
 let calls=0;const result=await findCharacterExports({home,chooseFolder:async()=>{calls++;return null;}});
 assert.equal(exportRoot(home),path.join(home,'.runelite','character-exporter'));assert.equal(calls,0);assert.equal(result.source,'automatic');assert.equal(result.folder,'Test Player');assert.deepEqual(result.files.map(f=>f.name),['character.json','bank.json']);assert.ok(result.files.every(f=>!f.text.includes('private')));
});
test('several character exports open the directory picker at character-exporter and read only the chosen folder',async t=>{
 const home=await fixture(t);await writeCharacter(home,'First',{'character.json':'not selected'});const selected=await writeCharacter(home,'Second',{'bank.json':'selected'});let request;
 const result=await findCharacterExports({home,chooseFolder:async options=>{request=options;return selected;}});
 assert.equal(request.defaultPath,exportRoot(home));assert.deepEqual(request.properties,['openDirectory']);assert.equal(result.source,'selected');assert.equal(result.folder,'Second');assert.deepEqual(result.files,[{name:'bank.json',text:'selected'}]);
});
test('an explicit folder choice works even with a single automatic match; cancellation reads nothing',async t=>{
 const home=await fixture(t),selected=await writeCharacter(home,'Test');let calls=0;
 assert.equal(await findCharacterExports({home,chooseFolder:async()=>{calls++;return null;}},'choose'),null);assert.equal(calls,1);
 const result=await findCharacterExports({home,chooseFolder:async()=>selected},'choose');assert.equal(result.source,'selected');
});
test('missing or empty exports open the nearest existing folder without creating directories',async t=>{
 const home=await fixture(t);let request;assert.equal(await findCharacterExports({home,chooseFolder:async options=>{request=options;return null;}}),null);assert.equal(request.defaultPath,home);await assert.rejects(fs.stat(path.join(home,'.runelite')),/ENOENT/);
 await fs.mkdir(path.join(home,'.runelite'));await findCharacterExports({home,chooseFolder:async options=>{request=options;return null;}});assert.equal(request.defaultPath,path.join(home,'.runelite'));
 await fs.mkdir(exportRoot(home));await findCharacterExports({home,chooseFolder:async options=>{request=options;return null;}});assert.equal(request.defaultPath,exportRoot(home));
});
test('empty selections and unsafe modes fail with actionable errors; oversized exports are bounded',async t=>{
 const home=await fixture(t);await assert.rejects(findCharacterExports({home},'../../bank.json'),/Unknown export/);
 await assert.rejects(findCharacterExports({home,chooseFolder:async()=>home},'choose'),/character subfolder/);
 const folder=await writeCharacter(home,'Large',{'bank.json':'x'.repeat(5_000_001)});await assert.rejects(findCharacterExports({home,chooseFolder:async()=>folder}),/5 MB/);
});
test('linked character folders are not searched or accepted as selected export folders',async t=>{
 const home=await fixture(t),outside=path.join(home,'external');await fs.mkdir(outside);await fs.writeFile(path.join(outside,'bank.json'),'not an export');await fs.mkdir(exportRoot(home),{recursive:true});
 await fs.symlink(outside,path.join(exportRoot(home),'linked'),process.platform==='win32'?'junction':'dir');let calls=0;
 assert.equal(await findCharacterExports({home,chooseFolder:async()=>{calls++;return null;}}),null);assert.equal(calls,1);
 await assert.rejects(findCharacterExports({home,chooseFolder:async()=>path.join(exportRoot(home),'linked')},'choose'),/regular character/);
});
test('folder imports group character exports by their own folder, ignoring unrelated and nested backup files',()=>{
 const f=(relativePath)=>({name:relativePath.split('/').at(-1),relativePath});
 assert.deepEqual(c.groupExportFolders(['exports/First/character.json','exports/First/bank.json','exports/Second/quests.json','exports/debug.log','exports/Second/collection_log.json','exports/First/backup/bank.json'].map(f)),{'exports/First':[0,1],'exports/Second':[2]});
 assert.deepEqual(c.groupExportFolders(['First/character.json','First/bank.json','First/backup/bank.json'].map(f)),{First:[0,1]});
 assert.deepEqual(c.groupExportFolders(['exports/../bank.json','/First/bank.json','C:/bank.json','bank.json'].map(f)),{});
 assert.throws(()=>c.groupExportFolders(Array.from({length:5001},()=>f('First/bank.json'))),/Too many files/);
});
