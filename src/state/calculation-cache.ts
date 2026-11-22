import type {Profile} from '../domain/types';
import type {CombatCacheSnapshot} from '../combat/cache';
import {combatIdentity} from '../combat/cache';
import {configuredMethod} from '../combat/priority';
import catalogue from '../../data/catalogue.json';
import type {Catalogue} from '../domain/types';
import {IndexedCalculationStorage,type CalculationStorage} from './calculation-storage';
import {travelIdentity} from './travel';
declare const CALCULATION_BUILD:string;
export const CALCULATION_VERSION=typeof CALCULATION_BUILD==='string'?CALCULATION_BUILD:'test-build';
export interface CalculationRequest {id:number;kind:string;profile:Profile;[key:string]:any}
export interface CalculationMessage {id:number;kind:string;[key:string]:any}
interface SavedResult {messages:CalculationMessage[];guide:string}
/** Key ordering and export timestamps do not change a calculation. */
export function canonical(value:unknown):string{
 if(value===undefined)return 'null';
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
}
export function calculationInputs(request:CalculationRequest):unknown{
 const {id,combatCache,guideFirst,profile,guide,...settings}=request;
 const {name,notes,setup,huntPresets,taskHistory,questImport,bank,...facts}=profile;
 const combat={id:profile.id,combat:combatIdentity(profile),access:profile.access,travel:travelIdentity(profile)};
 if(request.kind==='method-timing')return [settings,{...combat,gear:profile.gearOverrides?.[request.variantId]},configuredMethod(catalogue as Catalogue,profile,request.assignmentId,request.variantId)];
 if(request.kind==='gear'||request.kind==='gear-detail')return [settings,{...combat,gear:profile.gearOverrides?.[guide?.variantId]},guide];
 // The guide is only a priority pre-calculation for plans, never a hunt input.
 const {variantId,variantIds,...plannerSettings}=settings;
 return [request.kind==='gear-selection'?settings:plannerSettings,{...facts,travel:travelIdentity(profile),bank:combatIdentity(profile),importedQuests:Object.fromEntries([...new Set([...Object.keys(profile.quests),...Object.keys(questImport?.states||{})])].map(key=>[key,profile.quests[key]??questImport?.states[key]??null]))},request.kind==='gear-selection'?guide:undefined];
}
async function digest(value:string):Promise<string>{
 if(typeof crypto==='undefined'||!crypto.subtle)return value;
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
}
export function validCalculation(message:CalculationMessage,kind:string):boolean{
 if(!message||message.kind!==kind)return false;
 if(['plans','gear-selection'].includes(kind))return Array.isArray(message.plans)&&(kind!=='plans'||message.plans.length===catalogue.masters.length)&&message.plans.every((p:any)=>p?.master?.id&&Array.isArray(p.rows));
 if(kind==='gear'||kind==='priority-gear')return !!message.result?.styles&&['melee','ranged','magic'].every(f=>typeof message.result.styles[f]?.supported==='boolean');
 if(kind==='simulation')return Number.isInteger(message.result?.trials)&&Array.isArray(message.result?.curve);
 if(kind==='hunt')return !!message.plan?.master?.id&&Array.isArray(message.plan?.rows)&&Number.isInteger(message.result?.trials);
 if(kind==='strategies')return Array.isArray(message.results);
 if(kind==='method-timing')return typeof message.result?.variantId==='string';
 if(kind==='gear-detail')return Array.isArray(message.result?.rows);
 return false;
}
export class CalculationCache {
 warning='';private failed=false;private ownerEpochs=new Map<string,number>();
 constructor(private storage:CalculationStorage|undefined=typeof indexedDB==='undefined'?undefined:new IndexedCalculationStorage(),private version=CALCULATION_VERSION){}
 get available():boolean{return !!this.storage&&!this.failed;}
 async key(request:CalculationRequest):Promise<string>{return this.version+':job:'+await digest(canonical(calculationInputs(request)));}
 async load(request:CalculationRequest):Promise<CalculationMessage[]|undefined>{
  if(!this.available)return;
  try{
   const saved=await this.storage!.read(await this.key(request)) as SavedResult|undefined;
   if(!saved||!Array.isArray(saved.messages)||!validCalculation(saved.messages.at(-1)!,request.kind))return;
   if(saved.messages.slice(0,-1).some(message=>!validCalculation(message,'priority-gear')))return;
   return saved.messages.filter(m=>m.kind!=='priority-gear'||saved.guide===canonical(request.guide)).map(m=>({...m,id:request.id,fromCache:true}));
  }catch{this.fail();}
 }
 async save(request:CalculationRequest,messages:CalculationMessage[]):Promise<void>{
  if(!this.available||!validCalculation(messages.at(-1)!,request.kind))return;
  const owner=request.profile.id,epoch=this.ownerEpochs.get(owner);
  try{const key=await this.key(request);if(this.ownerEpochs.get(owner)!==epoch)return;await this.write(key,owner,'jobs',{messages,guide:canonical(request.guide)});}catch{this.fail();}
 }
 async combat(profile:Profile):Promise<CombatCacheSnapshot|undefined>{
  if(!this.available)return;
  try{
   const identity=combatIdentity(profile),context=this.version+':combat:'+await digest(canonical([profile.id,identity])),rows=await this.storage!.context(context) as CombatCacheSnapshot['entries'];
   return {identity,entries:rows.filter(row=>Array.isArray(row)&&typeof row[0]==='string'&&typeof row[1]?.supported==='boolean').slice(-5000)};
  }catch{this.fail();}
 }
 async saveCombat(profile:Profile,key:string,result:unknown):Promise<void>{
  if(!this.available)return;
  const epoch=this.ownerEpochs.get(profile.id);
  try{const context=this.version+':combat:'+await digest(canonical([profile.id,combatIdentity(profile)])),entry=context+':'+await digest(key);if(this.ownerEpochs.get(profile.id)!==epoch)return;await this.write(entry,profile.id,context,[key,result]);}catch{this.fail();}
 }
 async removeCharacter(id:string):Promise<void>{this.ownerEpochs.set(id,(this.ownerEpochs.get(id)||0)+1);try{await this.storage?.removeOwner(id);}catch{this.fail();}}
 private async write(key:string,owner:string,context:string,value:unknown):Promise<void>{
  const bytes=new TextEncoder().encode(JSON.stringify(value)).byteLength;if(bytes>8*1024*1024)return;
  await this.storage!.write({key,owner,context,version:this.version,updated:Date.now(),bytes,value});
 }
 private fail():void{this.failed=true;this.warning='Calculation storage is unavailable. Results work in this session, but may need recalculation next time.';}
}
export const calculationCache=new CalculationCache();
