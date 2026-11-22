'use strict';
// Verify the actual assembled artifact before making its share ZIP.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process'),crypto=require('node:crypto'),asar=require('@electron/asar');
const root=path.resolve(__dirname,'../..'),folder=path.resolve(process.argv[2]||'');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const runtime=new Set(['Slayer Target Planner.exe','READ ME.txt','chrome_100_percent.pak','chrome_200_percent.pak','d3dcompiler_47.dll','dxcompiler.dll','electron_wer.dll','ffmpeg.dll','icudtl.dat','resources.pak','snapshot_blob.bin','v8_context_snapshot.bin','vk_swiftshader_icd.json','vk_swiftshader.dll','vulkan-1.dll']);
const directories=new Set(['documentation','source','resources','locales','share']);
assert.equal(path.basename(folder),`Slayer Target Planner ${pkg.version} - Windows`);
for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
 assert.ok(!entry.isSymbolicLink(),'Linked distribution entry');
 assert.ok((entry.isDirectory()?directories:runtime).has(entry.name),'Unexpected top-level entry: '+entry.name);
}
for(const name of runtime)assert.ok(fs.statSync(path.join(folder,name)).isFile(),name);
const archive=path.join(folder,'resources','app.asar');
assert.equal(JSON.parse(asar.extractFile(archive,'package.json')).version,pkg.version);
for(const file of ['planner.js','data-manifest.json','creatures.png','items.png','owned-items.png','index.html'])assert.deepEqual(asar.extractFile(archive,'web/'+file),fs.readFileSync(path.join(root,'dist',file)),file);
const offline=require('../../desktop/offline-style.cjs');
assert.equal(asar.extractFile(archive,'web/style.css').toString(),offline.offlineStyle(fs.readFileSync(path.join(root,'dist/style.css'),'utf8')));
for(const file of ['main.cjs','preload.cjs','navigation.cjs','hiscores.cjs','compact.cjs','character-exports.cjs','updates.cjs','update-feed.cjs','apply-update.ps1'])assert.deepEqual(asar.extractFile(archive,file),fs.readFileSync(path.join(root,'desktop',file)),file);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(folder,'resources/update-manifest.json'),'utf8')),{schema:1,version:pkg.version,platform:'win32',arch:'x64',repository:'Lolager23/slayer-target-planner'});
assert.ok(asar.listPackage(archive).every(name=>!/(\.git|profile|credential|fixture|hosting\.json)/i.test(name)));
const sourceRecord=fs.readFileSync(path.join(folder,'documentation/SOURCE-REVISION.txt'),'utf8');
const revision=/^Git commit: ([a-f0-9]{40})$/m.exec(sourceRecord.replace(/\r/g,''))?.[1];assert.ok(revision,'Missing source revision');
// Verify the recorded release, even when the checkout has later tooling fixes.
const sourceCheck=String.raw`import io,subprocess,sys,tarfile
from pathlib import Path
root,folder,revision=sys.argv[1:]
archive=subprocess.check_output(['git','archive','--format=tar',revision],cwd=root)
count=0
with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
 for entry in tar:
  if not entry.isfile():continue
  target=Path(folder)/'source'/entry.name
  assert target.resolve().is_relative_to((Path(folder)/'source').resolve()),entry.name
  assert target.read_bytes()==tar.extractfile(entry).read(),entry.name
  count+=1
print(count)
`;
const fileCount=Number(execFileSync('python',['-c',sourceCheck,root,folder,revision],{encoding:'utf8'}).trim());assert.ok(fileCount>0);
for(const file of ['documentation/COPYING-GPL-3.txt','documentation/THIRD_PARTY_NOTICES.txt','documentation/electron/LICENSE','documentation/electron/LICENSES.chromium.html','documentation/dependency-licences/axios-LICENSE','source/node_modules/d3-array/LICENSE','source/node_modules/lodash.mergewith/LICENSE','source/vendor/osrs-dps/source/src/lib/PlayerVsNPCCalc.ts'])assert.ok(fs.statSync(path.join(folder,file)).size,file);
const ui=asar.extractFile(archive,'web/planner.js').toString();
for(const value of ['GitHub homepage','Give feedback','https://github.com/Lolager23/slayer-target-planner/issues/new'])assert.ok(ui.includes(value),value);
const sums=path.join(folder,'resources/SHA256SUMS.txt');
if(fs.existsSync(sums)){
 let count=0;for(const line of fs.readFileSync(sums,'utf8').trim().split(/\r?\n/)){
  const match=/^([a-f0-9]{64})  (.+)$/.exec(line);assert.ok(match,'Malformed checksum');
  const file=path.resolve(folder,match[2]);assert.ok(file.startsWith(folder+path.sep));
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),match[1],match[2]);count++;
 }
 console.log(`Verified ${count} application checksums.`);
}
console.log(`Verified ${pkg.version}: clean root, native/web source parity, ${fileCount} corresponding source files at ${revision}, metadata, licences and Settings links.`);
