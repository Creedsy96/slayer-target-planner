import type {Profile} from '../domain/types';
import type {CombatResult} from './types';

export interface CombatCacheSnapshot {identity:string;entries:[string,CombatResult][]}
/** Hunt goals/method preferences do not change the underlying combat inputs. */
export function combatIdentity(p:Profile):string{
 return JSON.stringify([p.assumeAllGear===true,p.bank,p.levels,p.combat,p.diaries.kourend,p.quests,p.questImport?.states,p.restrictBasicAccess===true,p.restrictBasicAccess?p.access:undefined]);
}
/** Session-only LRU storage; never part of a saved/exported profile. */
export class CombatCacheStore {
 private contexts=new Map<string,Map<string,CombatResult>>();
 constructor(private entryLimit=500,private contextLimit=3){}
 get(identity:string,key:string):CombatResult|undefined{
  const entries=this.contexts.get(identity),value=entries?.get(key);if(!value)return;
  entries!.delete(key);entries!.set(key,value);this.touch(identity,entries!);return structuredClone(value);
 }
 put(identity:string,key:string,result:CombatResult):void{
  const entries=this.contexts.get(identity)||new Map<string,CombatResult>();
  entries.delete(key);entries.set(key,structuredClone(result));
  while(entries.size>this.entryLimit)entries.delete(entries.keys().next().value!);
  this.touch(identity,entries);
 }
 snapshot(identity:string):CombatCacheSnapshot{
  const entries=this.contexts.get(identity);if(entries)this.touch(identity,entries);
  return {identity,entries:structuredClone([...(entries||[])])};
 }
 restore(identity:string,snapshot?:CombatCacheSnapshot):void{
  if(snapshot?.identity!==identity)return;
  for(const [key,result]of snapshot.entries.slice(-this.entryLimit))this.put(identity,key,result);
 }
 clear():void{this.contexts.clear();}
 private touch(identity:string,entries:Map<string,CombatResult>):void{
  this.contexts.delete(identity);this.contexts.set(identity,entries);
  while(this.contexts.size>this.contextLimit)this.contexts.delete(this.contexts.keys().next().value!);
 }
}
