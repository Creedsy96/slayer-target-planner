import {equipment,canonicalId} from '../../vendor/osrs-dps/runtime.js';
import {canonicalInventoryId} from './item-ids';
import requirements from '../../data/equipment-requirements.json';
import reviews from '../../data/equipment-requirement-reviews.json';
import itemArt from '../ui/item-art.json';
import type {EquipmentItem,EquipmentSlot,Loadout} from './types';
import type {Profile} from '../domain/types';
import {ownedQuantities,emptyBank} from '../state/bank';

export const ITEMS=equipment;
export const ITEMS_BY_ID=new Map(ITEMS.map(item=>[item.id,item]));
const additions:Record<string,Record<string,number>>={
 '29589':{attack:77},'29591':{ranged:77},'29594':{attack:50,magic:77},
 '31575':{ranged:45},'31579':{ranged:55},'31583':{ranged:65},
 '26374':{ranged:80},'28869':{ranged:66,hunter:50},'34681':{ranged:80},
 '9177':{ranged:26},'21012':{ranged:70}
};
// Reviewed Wiki requirements for synapse weapons, crossbows and Sailing blowpipes.
const reqs:Record<string,Record<string,number>>=requirements.requirements;
const reviewed:Record<string,Record<string,number>>=Object.fromEntries(reviews.reviews.flatMap(review=>review.ids.map(id=>[id,review.requirements as Record<string,number>])));
export function equipmentItem(id:number):EquipmentItem|undefined{return ITEMS_BY_ID.get(canonicalInventoryId(id))||ITEMS_BY_ID.get(id);}
export function itemForLabel(label:string):EquipmentItem|undefined{
 const alias=Object.entries(itemArt.aliases).find(([name])=>name.toLowerCase()===label.toLowerCase())?.[1];
 if(alias?.itemId)return equipmentItem(alias.itemId);
 return ITEMS.filter(i=>i.name.toLowerCase()===label.toLowerCase()&&!/broken|uncharged|inactive|\b0\b/i.test(i.version)).sort((a,b)=>Number(!!a.version&&a.version.toLowerCase()!=='normal')-Number(!!b.version&&b.version.toLowerCase()!=='normal')||a.id-b.id)[0];
}
export function ownedItems(p:Profile):EquipmentItem[]{
 const owned=ownedQuantities(p.bank??emptyBank()),items=new Map<number,EquipmentItem>();
 for(const [id,n]of Object.entries(owned)){if(n<=0)continue;const item=equipmentItem(Number(id));if(item&&!/uncharged|empty|broken|inactive|\b0\b/i.test(item.version)&&!temporaryEquipment(item))items.set(item.id,item);}
 return [...items.values()].sort((a,b)=>a.id-b.id);
}
export function itemRequirements(item:EquipmentItem):Record<string,number>|null{
 // Keep an explicit per-ID requirement before inheriting the pinned engine's
 // equivalent cosmetic/charge variant. Never infer requirements from a name.
 const base=canonicalId(item.id);
 return reviewed[item.id]??additions[item.id]??reqs[item.id]??reviewed[base]??additions[base]??reqs[base]??null;
}
export function canEquip(item:EquipmentItem,p:Profile):boolean{
 const req=itemRequirements(item);
 if(req===null)return p.assumeAllGear===true||p.combat?.allowUnknownRequirements===true;
 return Object.entries(req).every(([key,level])=>(p.levels[key]??0)>=level);
}
export const slotNames:Record<EquipmentSlot,string>={head:'Head',cape:'Cape',neck:'Neck',ammo:'Ammo',weapon:'Weapon',body:'Body',shield:'Off-hand',legs:'Legs',hands:'Hands',feet:'Feet',ring:'Ring'};
export function loadoutItems(loadout:Loadout):EquipmentItem[]{return Object.values(loadout).flatMap(id=>{const item=equipmentItem(id!);return item?[item]:[];});}

/** Temporary activity equipment cannot be carried into ordinary Slayer fights. */
export function temporaryEquipment(item:EquipmentItem):boolean{
 return /\((basic|attuned|perfected)\)/i.test(item.name)||item.id>=22227&&item.id<=22230||/last man standing|emir.s arena|beta|tournament/i.test(item.version);
}
