import raw from '../../data/quest-points.json';
import type {Profile} from '../domain/types';

export const QUEST_POINTS=raw;
export const questNameKey=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
export const pointQuestNames=new Map(raw.quests.flatMap(q=>[q.name,...q.aliases].map(name=>[questNameKey(name),q.name] as const)));
export interface QuestPointTotal {minimum:number;complete:boolean;missing:number;unmapped:string[]}
export function derivedQuestPoints(p:Profile):QuestPointTotal{
  const states=new Map<string,number>();
  // Manual quest overrides have the same precedence as access derivation.
  for(const group of [p.questImport?.states,p.questImport?.pointStates,p.quests])for(const [name,state]of Object.entries(group||{})){
    const canonical=pointQuestNames.get(questNameKey(name));if(canonical&&state!=null)states.set(canonical,state);
  }
  let minimum=0,missing=0;
  for(const q of raw.quests.filter(q=>q.points>0&&!q.part&&q.name!=='Recipe for Disaster')){
    const state=states.get(q.name);if(state===undefined&&!p.questImport)missing++;else if(state===2)minimum+=q.points;
  }
  const parent=states.get('Recipe for Disaster'),parts=raw.quests.filter(q=>q.part);
  const partPoints=parts.reduce((n,q)=>n+(states.get(q.name)===2?q.points:0),0);
  if(parent===2)minimum+=10;
  else if(parent===0&&partPoints===0){/* A not-started parent establishes zero points. */}
  else {minimum+=partPoints;if(!p.questImport)missing+=parts.filter(q=>states.get(q.name)===undefined).length;}
  const unmapped=p.questImport?.unknownPointQuests||[];
  return {minimum,complete:missing===0&&!unmapped.length,missing,unmapped};
}
export function questPointAllowance(p:Profile):{minimum:number;complete:boolean}{
  return p.questPoints!==null?{minimum:p.questPoints,complete:true}:derivedQuestPoints(p);
}
