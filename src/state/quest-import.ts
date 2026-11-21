import type {Catalogue,Profile,QuestImport} from '../domain/types';
import {pointQuestNames,questNameKey} from '../rules/quest-points';
import {relevantQuests} from '../rules/access';
import {clone,validateProfile} from './profiles';

export interface QuestPreview extends QuestImport {ignored:string[];total:number;warnings:string[]}
const normal=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const STATE:Record<string,number>={NOT_STARTED:0,IN_PROGRESS:1,STARTED:1,FINISHED:2,COMPLETED:2};

function safe(value:unknown,depth=0):void {
  if(depth>25)throw Error('Quest file nesting is too deep.');
  if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){
    if(['__proto__','prototype','constructor'].includes(key))throw Error('Unsafe quest file key.');
    safe(item,depth+1);
  }
}

export function parseQuestImport(data:Catalogue,text:string):QuestPreview {
  if(text.length>2_000_000)throw Error('Quest file exceeds 2 MB.');
  const value=JSON.parse(text.replace(/^\uFEFF/,''));safe(value);
  if(!value||typeof value!=='object'||!Array.isArray(value.quests)||!value.quests.length||value.quests.length>1000)throw Error('Choose a RuneLite quest export containing a non-empty quests array.');
  if(value.schemaVersion!==undefined&&value.schemaVersion!==1)throw Error('Unsupported RuneLite export schema version.');
  const names=new Map(relevantQuests(data).map(name=>[normal(name),name]));
  const pointStates:Record<string,number>={},unknownPointQuests:string[]=[];
  const states:Record<string,number>={},seen=new Map<string,number>(),ignored:string[]=[];
  for(const row of value.quests){
    if(!row||typeof row!=='object'||typeof row.name!=='string'||typeof row.state!=='string')throw Error('Quest entries need a name and textual RuneLite state.');
    const title=typeof row.displayName==='string'?row.displayName:row.name;
    if(!title.trim()||title.length>120)throw Error('Invalid quest name.');
    if(!Object.hasOwn(STATE,row.state))throw Error(`Unsupported state for ${title}: ${row.state}.`);
    const state=STATE[row.state],key=normal(title),name=names.get(key)||names.get(normal(row.name));
    if(seen.has(key)&&seen.get(key)!==state)throw Error(`Conflicting duplicate quest: ${title}.`);
    seen.set(key,state);
    const pointName=pointQuestNames.get(questNameKey(title))||pointQuestNames.get(questNameKey(row.name));
    if(pointName){if(Object.hasOwn(pointStates,pointName)&&pointStates[pointName]!==state)throw Error(`Conflicting aliases for ${pointName}.`);pointStates[pointName]=state;}
    else if(state>0&&!unknownPointQuests.includes(title))unknownPointQuests.push(title);
    if(name){if(Object.hasOwn(states,name)&&states[name]!==state)throw Error(`Conflicting aliases for ${name}.`);states[name]=state;}
    else if(!ignored.includes(title))ignored.push(title);
  }
  if(!Object.keys(states).length&&!Object.keys(pointStates).length)throw Error('No quests in this file match the planner requirements.');
  const playerName=typeof value.player?.username==='string'?value.player.username.replace(/\u00a0/g,' ').trim():null;
  if(playerName!==null&&!/^[A-Za-z0-9 _-]{1,12}$/.test(playerName))throw Error('Invalid account name in quest export.');
  const rawDate=value.exported_at??value.lastUpdated;
  const exportedAt=typeof rawDate==='string'&&Number.isFinite(Date.parse(rawDate))?new Date(rawDate).toISOString():null;
  const warnings:string[]=[];
  if(!playerName)warnings.push('This export does not identify the account. Check that you chose the correct character folder.');
  if(!exportedAt)warnings.push('The export has no valid timestamp; its age is unknown.');
  return {format:value.exported_at!==undefined?'Character Export':value.player?.username&&value.schemaVersion===1?'OSRS MCP Companion':'RuneLite quest JSON',playerName,exportedAt,importedAt:null,states,pointStates,unknownPointQuests,ignored,total:value.quests.length,warnings};
}

export function questOverridesAfterImport(p:Profile,preview:QuestPreview,preserve:boolean):Profile['quests']{
  return Object.fromEntries(Object.entries(p.quests).filter(([key])=>preserve||!Object.hasOwn(preview.states,key)&&!Object.hasOwn(preview.pointStates||{},pointQuestNames.get(questNameKey(key))||'')));
}
export function applyQuestImport(data:Catalogue,p:Profile,preview:QuestPreview,preserveOverrides:boolean,now:string):Profile {
  if(!Number.isFinite(Date.parse(now)))throw Error('Invalid import timestamp.');
  const copy=clone(p);
  copy.questImport={format:preview.format,playerName:preview.playerName,exportedAt:preview.exportedAt,importedAt:now,states:clone(preview.states),pointStates:clone(preview.pointStates||{}),unknownPointQuests:clone(preview.unknownPointQuests||[])};
  copy.quests=questOverridesAfterImport(p,preview,preserveOverrides);
  return validateProfile(data,copy);
}
