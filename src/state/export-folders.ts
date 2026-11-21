export const CHARACTER_EXPORT_FILES=['character.json','bank.json','inventory.json','equipment.json','quests.json','diaries.json'];
export interface FolderFile {name:string;relativePath:string}
/** Inspect names only. Contents of other characters are not read. */
export function groupExportFolders(files:readonly FolderFile[]):Record<string,number[]>{
 if(files.length>5000)throw Error('Too many files. Choose the specific RuneLite character folder.');
 const groups=new Map<string,number[]>();
 files.forEach((file,index)=>{
  if(!CHARACTER_EXPORT_FILES.includes(file.name.toLowerCase()))return;
  const parts=file.relativePath.replace(/\\/g,'/').split('/');
  if(parts.length<2||parts.length>3||parts.some(p=>!p||p==='.'||p==='..'||p.includes(':'))||parts.at(-1)!==file.name)return;
  const folder=parts.slice(0,-1).join('/');if(!groups.has(folder))groups.set(folder,[]);groups.get(folder)!.push(index);
 });
 const direct=[...groups.keys()].find(folder=>!folder.includes('/'));
 return Object.fromEntries(direct?[[direct,groups.get(direct)!]]:groups);
}
