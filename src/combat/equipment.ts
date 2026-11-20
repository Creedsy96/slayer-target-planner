import {equipment} from '../../vendor/osrs-dps/runtime.js';
import {canonicalInventoryId} from './item-ids';
import requirements from '../../data/equipment-requirements.json';
import itemArt from '../ui/item-art.json';
import type {EquipmentItem,EquipmentSlot,Loadout} from './types';
import type {Profile} from '../domain/types';
import {ownedQuantities,emptyBank} from '../state/bank';

export const ITEMS=equipment;
export const ITEMS_BY_ID=new Map(ITEMS.map(item=>[item.id,item]));
const reqs:Record<string,Record<string,number>>=requirements.requirements;
export function equipmentItem(id:number):EquipmentItem|undefined{return ITEMS_BY_ID.get(canonicalInventoryId(id))||ITEMS_BY_ID.get(id);}
export function itemForLabel(label:string):EquipmentItem|undefined{
 const alias=Object.entries(itemArt.aliases).find(([name])=>name.toLowerCase()===label.toLowerCase())?.[1];
 if(alias?.itemId)return equipmentItem(alias.itemId);
 return ITEMS.filter(i=>i.name.toLowerCase()===label.toLowerCase()&&!/broken|uncharged|inactive|\b0\b/i.test(i.version)).sort((a,b)=>Number(!!a.version&&a.version.toLowerCase()!=='normal')-Number(!!b.version&&b.version.toLowerCase()!=='normal')||a.id-b.id)[0];
}
export function ownedItems(p:Profile):EquipmentItem[]{
 const owned=ownedQuantities(p.bank??emptyBank()),items=new Map<number,EquipmentItem>();
 for(const [id,n]of Object.entries(owned)){if(n<=0)continue;const item=equipmentItem(Number(id));if(item&&!/uncharged|broken|inactive|\b0\b/i.test(item.version))items.set(item.id,item);}
 return [...items.values()].sort((a,b)=>a.id-b.id);
}
export function itemRequirements(item:EquipmentItem):Record<string,number>|null{
 return reqs[item.id]??null;
}
export function canEquip(item:EquipmentItem,p:Profile):boolean{
 const req=itemRequirements(item);
 if(req===null)return p.combat?.allowUnknownRequirements===true;
 return Object.entries(req).every(([key,level])=>(p.levels[key]??0)>=level);
}
export const slotNames:Record<EquipmentSlot,string>={head:'Head',cape:'Cape',neck:'Neck',ammo:'Ammo',weapon:'Weapon',body:'Body',shield:'Off-hand',legs:'Legs',hands:'Hands',feet:'Feet',ring:'Ring'};
export function loadoutItems(loadout:Loadout):EquipmentItem[]{return Object.values(loadout).flatMap(id=>{const item=equipmentItem(id!);return item?[item]:[];});}
