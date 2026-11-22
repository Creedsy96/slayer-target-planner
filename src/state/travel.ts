import raw from '../../data/travel-options.json';
import type {Profile} from '../domain/types';
import {questState} from '../rules/access';

export interface Teleport {id:string;name:string;kind:'permanent'|'consumable';quest?:string;questGrant?:boolean;partialQuest?:boolean;items:number[];note:string;source:string}
export const TELEPORTS=raw.teleports as Teleport[];
export const TRAVEL_ITEM_IDS=new Set(TELEPORTS.flatMap(t=>t.items));
export const TRAVEL_QUESTS=[...new Set(TELEPORTS.flatMap(t=>t.quest?[t.quest]:[]))];
export interface TeleportState {enabled:boolean;blocked:boolean;reason:string;automatic:boolean}
export function travelStock(p:Profile):Record<string,number>{
 const stock:Record<string,number>={};
 for(const [kind,snapshot]of Object.entries(p.bank?.snapshots||{})){
  if(kind==='group_storage'&&!p.bank?.includeGroup)continue;
  for(const [id,n]of Object.entries({...snapshot?.items,...snapshot?.travelItems}))if(TRAVEL_ITEM_IDS.has(Number(id)))stock[id]=(stock[id]||0)+n;
 }
 for(const [id,n]of Object.entries(p.bank?.manual||{}))if(TRAVEL_ITEM_IDS.has(Number(id)))stock[id]=n;
 if(p.bank?.includeGroup)for(const [id,n]of Object.entries(p.bank.groupManual))if(TRAVEL_ITEM_IDS.has(Number(id)))stock[id]=(stock[id]||0)+n;
 return stock;
}
export function teleportState(p:Profile,t:Teleport):TeleportState{
 const state=t.quest?questState(p,t.quest):2;
 if(t.quest&&(state===0||state===1&&!t.partialQuest))return {enabled:false,blocked:true,reason:'Requires '+t.quest+'. Update the quest fact in Account & access.',automatic:true};
 const stock=travelStock(p),owned=t.items.some(id=>(stock[id]||0)>0);
 const detected=owned||p.travel?.learned?.includes(t.id)||t.questGrant&&state===2||p.id==='builtin-maxed';
 const manual=p.travel?.overrides?.[t.id];
 const enabled=manual??!!detected;
 return {enabled,blocked:false,automatic:manual===undefined,reason:manual!==undefined?'Manual travel choice.':owned?'Detected in imported items.':p.travel?.learned?.includes(t.id)?'Previously confirmed unlimited teleport.':t.questGrant&&state===2?'Confirmed by '+t.quest+'.':p.id==='builtin-maxed'?'Available under the Maxed travel assumption.':t.quest&&state!==2?'Quest progress or destination needs confirmation.':'Not detected; confirm availability manually.'};
}
export function travelIdentity(p:Profile):string{return JSON.stringify(TELEPORTS.map(t=>[t.id,teleportState(p,t).enabled]));}
export function setTeleport(p:Profile,id:string,enabled:boolean):void{
 const t=TELEPORTS.find(t=>t.id===id);if(!t)throw Error('Unknown teleport.');
 if(enabled&&teleportState(p,t).blocked)throw Error('Complete or correct '+t.quest+' before enabling this destination.');
 p.travel??={overrides:{},learned:[]};p.travel.overrides[id]=enabled;
 if(enabled&&t.kind==='permanent'&&!p.travel.learned.includes(id))p.travel.learned.push(id);
}
export function learnImportedTeleports(p:Profile):void{
 const stock=travelStock(p);
 const learned=TELEPORTS.filter(t=>t.kind==='permanent'&&t.items.some(id=>(stock[id]||0)>0)&&!teleportState(p,t).blocked).map(t=>t.id);
 if(learned.length){p.travel??={overrides:{},learned:[]};p.travel.learned=[...new Set([...p.travel.learned,...learned])];}
}
export function validateTravel(p:Profile):void{
 if(p.travel===undefined)return;
 const v=p.travel,ids=new Set(TELEPORTS.map(t=>t.id));
 if(!v||typeof v!=='object'||!v.overrides||Array.isArray(v.overrides)||typeof v.overrides!=='object'||Object.entries(v.overrides).some(([id,n])=>!ids.has(id)||typeof n!=='boolean')||!Array.isArray(v.learned)||v.learned.length>TELEPORTS.length||v.learned.some(id=>!TELEPORTS.some(t=>t.id===id&&t.kind==='permanent')))throw Error('Invalid travel choices.');
 p.travel={overrides:{...v.overrides},learned:[...new Set(v.learned)]};
}
