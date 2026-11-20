import type {EquipmentItem,Loadout} from './types';
import {equipmentItem} from './equipment';

/** Conservative autocast compatibility; manual cast rotations are not assumed.
 * https://oldschool.runescape.wiki/w/Autocast
 * https://oldschool.runescape.wiki/w/Demonbane_spells
 */
export function canAutocast(weapon:EquipmentItem|null|undefined,spell:string,loadout:Loadout):boolean{
 if(!weapon||/Powered/i.test(weapon.category))return false;
 const name=weapon.name;
 if(/Burst|Barrage/.test(spell)){
  if(/Ancient (staff|sceptre)|ancient sceptre|Master wand|Kodai wand|Blue Moon spear|Thammaron|Accursed sceptre/i.test(name))return true;
  if(/Nightmare staff/i.test(name)&&!/Harmonised/i.test(name))return true;
  if(/Ahrim.s staff/i.test(name))return ['head','body','legs','neck'].every(slot=>{
   const item=equipmentItem(loadout[slot as keyof Loadout]||0);
   return slot==='neck'?/Amulet of the damned/i.test(item?.name||''):/Ahrim/i.test(item?.name||'');
  });
  return false;
 }
 if(/Demonbane/.test(spell))return /Purging staff|Slayer.s staff|(?:Toxic )?staff of the dead|Blue Moon spear|Thammaron|Accursed sceptre/i.test(name);
 if(spell==='Magic Dart')return /Slayer.s staff|(?:Toxic )?staff of the dead|Staff of (light|balance)/i.test(name);
 if(spell==='Flames of Zamorak')return /Zamorak staff|(?:Toxic )?staff of the dead/i.test(name);
 return !/Slayer.s staff/i.test(name)||/Wave|Surge/.test(spell);
}
