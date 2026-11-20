import type {Profile} from '../domain/types';
import type {GuideState} from '../guide/types';
import type {CombatResult,EquipmentItem,EquipmentSlot} from './types';
import {GUIDE,guideForm,selectedLocation} from '../guide/model';
import {ownedItems,equipmentItem,canEquip,itemRequirements} from './equipment';
import {calculateCombat,combatStyles,familyOf,isWildernessCombat,candidateSpells} from './calculate';
import {requirementSlots,usableAmmo} from './optimise';
import {defenceScore} from './armour';
import {applyAreaDamage} from './area-damage';

export interface GearComparisonRow {id:number;name:string;selected:boolean;owned:boolean;dps:number|null;aggregateDps:number|null;delta:number|null;prayer:number;defensive:Record<string,number>;defence:number;reason:string}
export interface GearComparison {slot:EquipmentSlot;selectedId:number;reason:string;context:string;notes:string;rows:GearComparisonRow[]}

/** One-slot comparisons keep all other equipment fixed, including protection. */
export function compareOwnedSlot(p:Profile,state:GuideState,result:CombatResult,slot:EquipmentSlot):GearComparison{
 const record=GUIDE.records[state.variantId],form=guideForm(record,state),location=selectedLocation(record,form,state);
 const required=requirementSlots(record,state,location,p),selectedId=result.loadout[slot]||0;
 const fallback=result.armourFallback?.includes(slot),priority=result.armourPriority==='prayer'?'prayer bonus, then relevant defence':'relevant defence, then prayer bonus';
 let reason=required[slot]?'Required creature or location protection takes priority over DPS.':result.source==='example'?'Curated tier/style template, rather than a search of your bank. The comparison shows whether your owned alternatives improve this example setup.':fallback?'This slot was not a DPS upgrade. Selected for '+priority+' from style-compatible owned armour (or the least accuracy penalty when none is compatible).':'Selected by the bounded DPS search, with '+priority+' breaking equal-DPS ties.';
 const evaluate=(item:EquipmentItem):{dps:number|null;aggregateDps:number|null;reason:string}=>{
  if(!canEquip(item,p)){
   const requirements=itemRequirements(item),missing=requirements&&Object.entries(requirements).filter(([skill,level])=>(p.levels[skill]??0)<level).map(([skill,level])=>skill+' '+level);
   return {dps:null,aggregateDps:null,reason:missing?'Requires '+missing.join(', ')+'.':'Unreviewed skill requirements are disabled.'};
  }
  if(required[slot]&&!required[slot]!(item))return {dps:null,aggregateDps:null,reason:'Does not provide the required creature/location protection or weapon.'};
  const loadout={...result.loadout,[slot]:item.id},weapon=equipmentItem(loadout.weapon||0),ammo=equipmentItem(loadout.ammo||0);
  if(weapon?.isTwoHanded&&loadout.shield)return {dps:null,aggregateDps:null,reason:'Two-handed weapon conflicts with the equipped off-hand. Other slots are held fixed.'};
  if(ammo&&weapon&&!usableAmmo(weapon,ammo,result.family))return {dps:null,aggregateDps:null,reason:'Ammunition is incompatible with this weapon/style.'};
  const styles=slot==='weapon'?combatStyles(item.id).filter(s=>familyOf(s)===result.family&&!/defensive|longrange/i.test(s.stance)):[result.style];
  const spells=slot==='weapon'&&result.family==='magic'&&!/Powered/i.test(item.category)?candidateSpells(p):[slot==='weapon'?null:result.spell];
  let best:CombatResult|undefined,issue='No attack style in the selected combat family.';
  for(const style of styles)for(const spell of spells){
   const trial=applyAreaDamage(calculateCombat(p,record,form,{...loadout},style,spell,state.onTask,isWildernessCombat(record,location),false),record,location,state.stackSize);
   if(!trial.supported){issue=trial.reason;continue;}
   if(!best||(trial.aggregateDps??trial.dps)>(best.aggregateDps??best.dps))best=trial;
  }
  return best?{dps:best.dps,aggregateDps:best.aggregateDps??best.dps,reason:slot==='weapon'?best.style.type+' / '+best.style.stance+(best.spell?' / '+best.spell:'')+'. Best supported attack/spell within '+result.family+'; other gear held fixed.':'Other slots, attack style and spell held fixed.'}:{dps:null,aggregateDps:null,reason:issue};
 };
 const owned=ownedItems(p).filter(item=>item.slot===slot),selectedItem=equipmentItem(selectedId);
 const items=selectedItem&&!owned.some(item=>item.id===selectedId)?[selectedItem,...owned]:owned;
 const rows=items.map(item=>{
  const selected=item.id===selectedId,value=selected?{dps:result.dps,aggregateDps:result.aggregateDps??result.dps,reason:'Equipped recommendation.'}:evaluate(item);
  return {id:item.id,name:item.name,selected,owned:owned.some(i=>i.id===item.id),...value,delta:value.dps===null?null:value.dps-result.dps,prayer:item.bonuses.prayer,defensive:{...item.defensive},defence:defenceScore(item,form)};
 }).sort((a,b)=>Number(b.selected)-Number(a.selected)||(b.aggregateDps??-1)-(a.aggregateDps??-1)||b.prayer-a.prayer||a.id-b.id);
 if(!required[slot]&&!fallback&&result.source!=='example'){
  const bestAlternative=rows.filter(row=>!row.selected&&row.dps!==null).sort((a,b)=>(b.aggregateDps??0)-(a.aggregateDps??0))[0];
  reason+=!bestAlternative?' No other owned item can be used in this fixed setup.':(bestAlternative.aggregateDps??0)>(result.aggregateDps??result.dps)+1e-10?' A one-slot swap to '+bestAlternative.name+' scores higher; the bounded search missed this alternative.':' Best usable alternative: '+bestAlternative.name+' ('+bestAlternative.dps!.toFixed(3)+' single-target DPS).';
 }
 return {slot,selectedId,reason,context:record.name+' / '+form.label+' · '+(location?.name||'default location'),notes:'DPS is the whole setup with this item, not damage attributable to the item alone. Defence relevance averages bonuses against the listed NPC attacks ('+(form['attack style']||'unknown: all five')+'); it is not a damage-taken model. Alternatives are owned gear in this slot; an unowned example is labelled. Quest/diary item unlocks and charges still need review. Other gear is held fixed; weapon swaps try supported attacks/spells within the chosen combat family. A complete rebuild may produce a different ranking.',rows};
}
