import type {Profile} from '../domain/types';
import type {CombatResult} from './types';
import {ownedQuantities,defaultCombat} from '../state/bank';
import {isOpenArea} from '../rules/access';

export interface CombatCacheSnapshot {identity:string;entries:[string,CombatResult][]}
/** Hunt goals/method preferences do not change the underlying combat inputs. */
export function combatIdentity(p:Profile):string{
 const gear=p.bank?ownedQuantities(p.bank):{},questKeys=new Set([...Object.keys(p.quests),...Object.keys(p.questImport?.states||{})]);
 const sorted=(value:Record<string,unknown>)=>Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
 const quests=Object.fromEntries([...questKeys].sort().map(key=>[key,p.quests[key]??p.questImport?.states[key]??null]));
 // Ordinary entrance overrides are dormant outside restricted-account mode.
 // Special confirmations and gated entrances can still affect combat/location choice.
 const access=Object.fromEntries(Object.entries(p.access).filter(([key])=>p.restrictBasicAccess||!isOpenArea(key)));
 return JSON.stringify([p.assumeAllGear===true,p.assumeAllGear?[]:Object.keys(gear).filter(id=>gear[id]>0).sort(),sorted(p.levels),sorted({...defaultCombat(),...p.combat}),p.diaries.kourend,quests,p.restrictBasicAccess===true,sorted(access)]);
}
/** In-memory LRU, restored from disposable calculation storage by UI workers. */
export class CombatCacheStore {
 private contexts=new Map<string,Map<string,CombatResult>>();
 constructor(private entryLimit=5000,private contextLimit=3){}
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
