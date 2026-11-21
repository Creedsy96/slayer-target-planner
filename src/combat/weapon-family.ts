import {styles} from '../../vendor/osrs-dps/runtime.js';
import type {EquipmentItem,CombatStyle} from './types';

/** Generic manual casting does not make every weapon a magic recommendation.
 * Plain staves' incidental bash attacks are excluded; Bladed Staff and
 * Salamander retain their genuine multiple combat styles. */
export function weaponStylesForFamily(item:EquipmentItem,family:string):CombatStyle[]{
 if(item.slot!=='weapon'||family==='melee'&&/^(Staff|Powered .*)$/.test(item.category))return [];
 return styles(item.category).filter(style=>style.stance!=='Manual Cast'&&
  (style.type==='magic'?'magic':style.type==='ranged'?'ranged':'melee')===family);
}
export function weaponSupportsFamily(item:EquipmentItem,family:string):boolean{
 return weaponStylesForFamily(item,family).length>0;
}
