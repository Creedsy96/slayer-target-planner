import type {Catalogue,Profile} from '../domain/types';
import {parseBankImport,parseCharacterLevels,applyBankSnapshots,type BankPreview} from './bank';
import {parseQuestImport,applyQuestImport,type QuestPreview} from './quest-import';
export interface ExportFile {name:string;text:string}
export interface AccountExportPreview {account:string|null;levels:Record<string,number>|null;containers:BankPreview[];quests:QuestPreview|null;diaries:Partial<Profile['diaries']>;files:string[];notes:string[]}
const accountKey=(s:string)=>s.toLowerCase().replace(/[_\u00a0]/g,' ').trim();
function safe(value:unknown,depth=0):void{
 if(depth>25)throw Error('Export nesting is too deep.');
 if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))throw Error('Unsafe export key.');safe(item,depth+1);}
}
export function parseAccountExports(data:Catalogue,files:ExportFile[]):AccountExportPreview{
 if(!files.length||files.length>10||files.reduce((n,f)=>n+f.text.length,0)>20_000_000)throw Error('Choose 1–10 export files, up to 20 MB in total.');
 const result:AccountExportPreview={account:null,levels:null,containers:[],quests:null,diaries:{},files:[],notes:[]},seen=new Set<string>(),accounts=new Set<string>(),sessions=new Set<string>();
 for(const file of files){
  const name=file.name.toLowerCase();if(seen.has(name))throw Error('Choose one '+name+' file.');seen.add(name);
  if(['collection_log.json','combat_achievements.json','seed_vault.json','status.json','recent_events.json'].includes(name)){
   result.notes.push(name==='combat_achievements.json'?'Combat achievements are not applied: Character Export 0.6.0 has a reported task-mapping problem. Confirm combat unlocks manually.':name==='collection_log.json'?'Collection-log entries record past discoveries, not currently owned gear; use bank/equipment snapshots.':name==='seed_vault.json'?'Seed-vault contents are not equipment and are not needed for Slayer planning.':name+' is diagnostic metadata and is not imported.');continue;
  }
  if(!['character.json','bank.json','inventory.json','equipment.json','group_storage.json','quests.json','diaries.json'].includes(name))throw Error('Unsupported export file: '+file.name+'. Choose the named Character Export JSON files.');
  if(file.text.length>5_000_000)throw Error(file.name+' exceeds 5 MB.');
  const raw=JSON.parse(file.text.replace(/^\uFEFF/,''));safe(raw);if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Choose a JSON export object.');
  const account=raw.account_name??raw.player?.username??raw.player?.name??raw.player_name??null;
  if(account!==null&&name!=='group_storage.json'){if(typeof account!=='string'||!account.trim()||account.length>30)throw Error('Invalid export account.');accounts.add(accountKey(account));result.account=account;}
  if(name!=='group_storage.json'&&typeof raw.session_id==='string')sessions.add(raw.session_id);
  if(name==='character.json')result.levels=parseCharacterLevels(file.text).levels;
  else if(name==='quests.json')result.quests=parseQuestImport(data,file.text);
  else if(name==='diaries.json'){
   if(!raw.diaries||typeof raw.diaries!=='object'||Array.isArray(raw.diaries))throw Error('Choose diaries.json with named regions.');
   const aliases:Record<string,keyof Profile['diaries']>={lumbridgedraynor:'lumbridge',lumbridgeanddraynor:'lumbridge',kourendkebos:'kourend',kourendandkebos:'kourend',westernprovinces:'western'};
   for(const [name,tiers]of Object.entries(raw.diaries)){
    const key=aliases[name.toLowerCase().replace(/[^a-z]/g,'')],complete=(tiers as {elite?:{complete?:unknown}})?.elite?.complete;
    if(key){if(typeof complete!=='boolean')throw Error('Missing elite diary completion flag for '+name+'.');result.diaries[key]=complete?1:0;}
   }
   if(!Object.keys(result.diaries).length)throw Error('No supported elite diaries in this file.');
  }else {const container=parseBankImport(file.text,name==='group_storage.json'?'group_storage':undefined);result.containers.push(container);result.notes.push(...container.warnings);}
  result.files.push(name);
 }
 if(!result.files.length)throw Error('No usable account exports selected.');
 if(accounts.size>1)throw Error('The selected files belong to different accounts.');
 if(sessions.size>1)throw Error('The files come from different RuneLite sessions. Sync Available and select a matching set.');
 if(result.account&&result.quests&&!result.quests.playerName)result.quests.playerName=result.account;
 if(!result.account)result.notes.push('No account name supplied. Verify every file came from the same character folder.');
 if(!result.levels)result.notes.push('Character levels were not selected; existing levels will be preserved.');
 if(!result.quests)result.notes.push('Quest states were not selected. Unanswered quest requirements stay unknown.');
 result.notes.push('Quest points, Slayer points/streaks, purchased rewards, prayer unlocks and partial miniquest steps are not supplied by these exports.');
 return result;
}
export function applyAccountExports(data:Catalogue,p:Profile,preview:AccountExportPreview,now:string):Profile{
 const accounts=[p.bank?.account,p.questImport?.playerName,preview.account].filter((s):s is string=>!!s);
 if(new Set(accounts.map(accountKey)).size>1)throw Error('These exports belong to another character. Create a separate character first.');
 let copy=applyBankSnapshots(p,preview.containers,preview.levels,preview.account,p.combat?.enabled===true||preview.containers.length>0);
 if(preview.quests)copy=applyQuestImport(data,copy,preview.quests,true,now);
 for(const [key,value]of Object.entries(preview.diaries))if(copy.diaries[key as keyof Profile['diaries']]==null)copy.diaries[key as keyof Profile['diaries']]=value;
 return copy;
}
