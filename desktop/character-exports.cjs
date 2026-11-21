'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const FILES=['character.json','bank.json','inventory.json','equipment.json','quests.json','diaries.json'];
const FILE_LIMIT=5_000_000,TOTAL_LIMIT=20_000_000;
const exportRoot=home=>path.join(home,'.runelite','character-exporter');
const missing=error=>['ENOENT','ENOTDIR'].includes(error.code);

async function directoryExists(folder){
 try{const stat=await fs.lstat(folder);return stat.isDirectory()&&!stat.isSymbolicLink();}catch(error){if(missing(error))return false;throw error;}
}
async function exportNames(folder){
 const found=[];
 for(const name of FILES){
  try{const stat=await fs.lstat(path.join(folder,name));if(stat.isFile()&&!stat.isSymbolicLink())found.push(name);}
  catch(error){if(!missing(error))throw error;}
 }
 return found;
}
async function characterFolders(root){
 if(!await directoryExists(root))return [];
 const found=[];let count=0;
 for await(const entry of await fs.opendir(root)){
  if(++count>500)return [];
  if(!entry.isDirectory()||entry.isSymbolicLink())continue;
  const folder=path.join(root,entry.name);
  if((await exportNames(folder)).length)found.push(folder);
  // Two candidates already make the result ambiguous; do not scan other accounts.
  if(found.length===2)break;
 }
 return found;
}
async function readCharacterFolder(folder,source){
 if(!await directoryExists(folder))throw Error('Choose a regular character export folder, rather than a shortcut.');
 const names=await exportNames(folder);
 if(!names.length)throw Error('No character export files found. Select the character subfolder containing character.json or bank.json. In RuneLite, open the bank and use Sync Available first.');
 const files=[];let total=0;
 for(const name of names){
  const filename=path.join(folder,name),before=await fs.lstat(filename);
  if(before.isSymbolicLink()||!before.isFile())throw Error('Export files must be regular files.');
  if(before.size>FILE_LIMIT||(total+=before.size)>TOTAL_LIMIT)throw Error('Exports exceed the 5 MB per-file or 20 MB total import limit.');
  const handle=await fs.open(filename,'r');
  try{
   const opened=await handle.stat();
   if(opened.ino!==before.ino||opened.dev!==before.dev||!opened.isFile()||opened.size>FILE_LIMIT)throw Error('An export changed while reading. Sync Available and try again.');
   total+=opened.size-before.size;if(total>TOTAL_LIMIT)throw Error('Exports exceed the 20 MB total import limit.');
   const buffer=Buffer.alloc(opened.size+1);let offset=0;
   while(offset<buffer.length){const {bytesRead}=await handle.read(buffer,offset,buffer.length-offset,offset);if(!bytesRead)break;offset+=bytesRead;}
   const after=await handle.stat();
   if(offset!==opened.size||after.size!==opened.size||after.mtimeMs!==opened.mtimeMs)throw Error('An export is updating. Wait for RuneLite to finish syncing, then try again.');
   files.push({name,text:buffer.subarray(0,offset).toString('utf8')});
  }finally{await handle.close();}
 }
 return {source,folder:path.basename(folder),files};
}
async function pickerStart(root,home){
 for(const folder of [root,path.dirname(root),home]){
  try{if(await directoryExists(folder))return folder;}catch(error){if(!['EACCES','EPERM'].includes(error.code))throw error;}
 }
 return home;
}
async function findCharacterExports({home,chooseFolder},mode='auto'){
 if(!['auto','choose'].includes(mode))throw Error('Unknown export discovery action.');
 const root=exportRoot(home);
 if(mode==='auto'){
  let folders;
  try{folders=await characterFolders(root);}catch(error){if(!missing(error)&&!['EACCES','EPERM'].includes(error.code))throw error;folders=[];}
  if(folders.length===1)return readCharacterFolder(folders[0],'automatic');
 }
 const selected=await chooseFolder({defaultPath:await pickerStart(root,home),title:'Select your RuneLite character export folder',buttonLabel:'Use this character',properties:['openDirectory']});
 if(!selected)return null;
 return readCharacterFolder(selected,'selected');
}
module.exports={exportRoot,findCharacterExports};
