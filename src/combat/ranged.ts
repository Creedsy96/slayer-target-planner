import {ammoApplicability,AmmoApplicability,canonicalId} from '../../vendor/osrs-dps/runtime.js';
import type {EquipmentItem} from './types';

// Dart caps: Wiki Blowpipe ammunition table; Rosewood's July 2026 rune upgrade.
const dartCaps={'Toxic blowpipe':35,'Blazing blowpipe':35,'Camphor blowpipe':17,'Ironwood blowpipe':17,'Rosewood blowpipe':26} as const;
export const isBlowpipe=(weapon:EquipmentItem|null|undefined):weapon is EquipmentItem&{name:keyof typeof dartCaps}=>!!weapon&&Object.hasOwn(dartCaps,weapon.name);
export const isCrossbow=(weapon:EquipmentItem):boolean=>weapon.category==='Crossbow';
export function usableAmmo(weapon:EquipmentItem,ammo:EquipmentItem,family:string):boolean{
 if(isBlowpipe(weapon))return family==='ranged'&&/^(Bronze|Iron|Steel|Black|Mithril|Adamant|Rune|Amethyst|Dragon) dart$/.test(ammo.name)&&! /poison/i.test(ammo.version.replace('Unpoisoned',''))&&ammo.bonuses.ranged_str<=dartCaps[weapon.name];
 const applicability=ammoApplicability(canonicalId(weapon.id),canonicalId(ammo.id));
 return applicability!==AmmoApplicability.INVALID&&(family==='ranged'&&applicability===AmmoApplicability.INCLUDED||ammo.bonuses.prayer>0);
}
export function uniqueEquipment(items:EquipmentItem[]):EquipmentItem[]{
 return [...new Map(items.map(item=>[canonicalId(item.id),item])).values()];
}
/** Collapse only the ordinary metal progression; retain distinct ammunition families. */
export function rangedWeaponCandidates(items:EquipmentItem[],usable:(item:EquipmentItem)=>boolean=()=>true):EquipmentItem[]{
 const unique=uniqueEquipment(items),ordinary=(item:EquipmentItem)=>/^(?:Crossbow|Phoenix crossbow|(?:Bronze|Blurite|Iron|Steel|Mithril|Adamant|Rune) crossbow(?: \(or\))?)$/.test(item.name);
 const best=unique.filter(item=>ordinary(item)&&usable(item)).sort((a,b)=>b.offensive.ranged-a.offensive.ranged||a.id-b.id)[0];
 return unique.filter(item=>!ordinary(item)||item.id===best?.id);
}
/** Crossbows retain their strongest non-enchanted bolt and every owned enchantment. */
export function rangedAmmoCandidates(owned:EquipmentItem[],weapon:EquipmentItem):EquipmentItem[]{
 const compatible=uniqueEquipment(owned.filter(item=>(item.slot==='ammo'||isBlowpipe(weapon))&&usableAmmo(weapon,item,'ranged')))
  .sort((a,b)=>b.bonuses.ranged_str-a.bonuses.ranged_str||Number(/poison/i.test(a.version.replace('Unpoisoned','')))-Number(/poison/i.test(b.version.replace('Unpoisoned','')))||a.id-b.id);
 if(isBlowpipe(weapon))return compatible.slice(0,1);
 if(!isCrossbow(weapon))return compatible.slice(0,8);
 return [...compatible.filter(item=>!item.name.endsWith('(e)')).slice(0,1),...compatible.filter(item=>item.name.endsWith('(e)'))];
}
