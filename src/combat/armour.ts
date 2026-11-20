import type {Family,GuideForm} from '../guide/types';
import type {EquipmentItem,Loadout} from './types';
import {equipmentItem} from './equipment';

export type ArmourPriority='tank'|'prayer';
export interface ArmourContext {family:Family;priority:ArmourPriority;form:GuideForm}

/** Equipment-bonus ranking against listed attacks, not an incoming-damage model. */
function defence(item:EquipmentItem,form:GuideForm):number{
 const style=(form['attack style']||'').toLowerCase(),keys=new Set<string>();
 if(/magic/.test(style))keys.add('magic');
 if(/ranged|missile/.test(style))keys.add('ranged');
 for(const key of ['stab','slash','crush'])if(style.includes(key))keys.add(key);
 if(!keys.size&&/melee/.test(style))for(const key of ['stab','slash','crush'])keys.add(key);
 if(!keys.size)for(const key of ['stab','slash','crush','ranged','magic'])keys.add(key);
 return [...keys].reduce((sum,key)=>sum+(item.defensive[key]||0),0)/keys.size;
}
function offence(item:EquipmentItem,family:Family):number{
 return family==='magic'?item.offensive.magic:family==='ranged'?item.offensive.ranged:Math.max(item.offensive.stab,item.offensive.slash,item.offensive.crush);
}
export function compareArmour(a:EquipmentItem,b:EquipmentItem,context:ArmourContext):number{
 const defenceDifference=defence(b,context.form)-defence(a,context.form),prayerDifference=b.bonuses.prayer-a.bonuses.prayer;
 return (context.priority==='prayer'?prayerDifference||defenceDifference:defenceDifference||prayerDifference)||a.id-b.id;
}
export function fallbackArmour(items:EquipmentItem[],context:ArmourContext):EquipmentItem[]{
 const compatible=items.filter(item=>offence(item,context.family)>=0);
 // Prefer armour that does not penalise this style's accuracy. If all owned
 // pieces do, use the least penalising tier and disclose the actual lower DPS.
 const bestOffence=Math.max(...items.map(item=>offence(item,context.family)));
 const pool=compatible.length?compatible:items.filter(item=>offence(item,context.family)===bestOffence);
 return pool.sort((a,b)=>compareArmour(a,b,context));
}
export function compareLoadoutSustain(a:Loadout,b:Loadout,context:ArmourContext):number{
 const totals=(loadout:Loadout)=>Object.values(loadout).reduce((sum,id)=>{
  const item=equipmentItem(id!);if(item){sum.defence+=defence(item,context.form);sum.prayer+=item.bonuses.prayer;}return sum;
 },{defence:0,prayer:0});
 const left=totals(a),right=totals(b),defenceDifference=left.defence-right.defence,prayerDifference=left.prayer-right.prayer;
 return context.priority==='prayer'?prayerDifference||defenceDifference:defenceDifference||prayerDifference;
}
