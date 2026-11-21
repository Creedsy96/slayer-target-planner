const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue;
function moduleAt(file,globals={}){const source=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,mod={exports:{}};new Function('module','exports',...Object.keys(globals),source)(mod,mod.exports,...Object.values(globals));return mod.exports;}
const {History}=moduleAt('src/state/history.ts');
function fixture(){const maxed=c.maxedProfile(d),a=c.newProfile(d,'Same name'),b=c.newProfile(d,'Same name');a.bank=c.emptyBank();a.bank.manual['4151']=1;a.points=321;a.unlocks.basilocked=1;a.notes=['Preserved facts'];return {profiles:[maxed,a,b],activeId:a.id,a,b,maxed};}
test('deletion uses the character ID and preserves every other character and its facts',()=>{
 const r=fixture(),before=structuredClone(r),next=c.removeCharacter(r,r.a.id);
 assert.deepEqual(r,before);assert.deepEqual(next.profiles,[r.maxed,r.b]);assert.equal(next.profiles[1],r.b);assert.equal(next.activeId,r.b.id);assert.equal(next.profiles.filter(p=>p.name==='Same name').length,1);
});
test('removing a last-position or only custom character selects a valid remaining character',()=>{
 const r=fixture();assert.equal(c.removeCharacter({...r,activeId:r.b.id},r.b.id).activeId,r.a.id);
 assert.equal(c.removeCharacter({profiles:[r.maxed,r.a],activeId:r.a.id},r.a.id).activeId,r.maxed.id);
 assert.equal(c.removeCharacter({...r,activeId:r.maxed.id},r.a.id).activeId,r.maxed.id);
});
test('the Maxed preset, unknown IDs and deletion of the last remaining character are protected',()=>{
 const r=fixture();assert.throws(()=>c.removeCharacter(r,r.maxed.id),/Maxed/);assert.throws(()=>c.removeCharacter(r,'missing'),/no longer exists/);
 assert.throws(()=>c.removeCharacter({profiles:[r.a],activeId:r.a.id},r.a.id),/at least one/);
});
test('persisted deletion survives import/reload without recreating the removed custom character',()=>{
 const r=fixture(),saved=new Map(),next=c.persistCharacterRemoval(r,r.a.id,{setItem:(key,value)=>saved.set(key,value)});
 const imported=c.importProfiles(d,saved.get(c.STORAGE)),reloaded=c.withDefaultMaxedProfile(d,imported.profiles,imported.activeId);
 assert.equal(reloaded.activeId,next.activeId);assert.ok(reloaded.profiles.every(p=>p.id!==r.a.id));assert.ok(reloaded.profiles.some(p=>p.id===r.maxed.id));assert.deepEqual(reloaded.profiles.find(p=>p.id===r.b.id),r.b);
});
test('failed storage writes keep the original registry and all of its character data intact',()=>{
 const r=fixture(),before=structuredClone(r);assert.throws(()=>c.persistCharacterRemoval(r,r.a.id,{setItem(){throw Error('quota');}}),/character was kept/);assert.deepEqual(r,before);
});
test('session undo/redo restores full deleted character state including active selection and bank',()=>{
 const r=fixture(),original={profiles:r.profiles,activeId:r.activeId},h=new History();h.record(original);h.record(c.removeCharacter(r,r.a.id));
 assert.ok(h.canUndo);const restored=h.undo();assert.deepEqual(restored,original);assert.equal(restored.profiles.find(p=>p.id===r.a.id).bank.manual['4151'],1);
 const removed=h.redo();assert.ok(removed.profiles.every(p=>p.id!==r.a.id));assert.equal(removed.activeId,r.b.id);
});
test('confirmation names and escapes the character and explains scope and recovery',()=>{
 const {deleteCharacterContent}=moduleAt('src/ui/character-delete.ts'),html=deleteCharacterContent({name:'<img src=x onerror=alert(1)> & "name"'});
 assert.ok(!html.includes('<img'));assert.match(html,/&lt;img/);assert.match(html,/&amp;/);assert.match(html,/method="dialog"/);assert.match(html,/Other characters and RuneLite export files are kept/);assert.match(html,/Undo/);assert.match(html,/After reloading or closing/);assert.match(html,/<button value="cancel" autofocus>/);
});
for(const [value,expected]of [['delete',true],['cancel',false],['',false]])test('dialog '+(value||'Escape')+' returns '+expected+' and removes itself',async()=>{
 let close,removed=false,shown=false,cancelFocused=false;const attrs={};
 const dialog={returnValue:value,setAttribute:(k,v)=>attrs[k]=v,showModal:()=>shown=true,querySelector:()=>({focus:()=>cancelFocused=true}),addEventListener:(name,cb)=>{assert.equal(name,'close');close=cb;},remove:()=>removed=true};
 const document={createElement:tag=>{assert.equal(tag,'dialog');return dialog;},body:{append:value=>assert.equal(value,dialog)}};
 const {requestCharacterDeletion}=moduleAt('src/ui/character-delete.ts',{document});const pending=requestCharacterDeletion({name:'QA character'});assert.ok(shown);assert.ok(cancelFocused);assert.equal(attrs['aria-labelledby'],'delete-character-title');close();assert.equal(await pending,expected);assert.ok(removed);
});
