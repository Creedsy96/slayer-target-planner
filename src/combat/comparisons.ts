import type {Profile} from '../domain/types';
import type {GuideState} from '../guide/types';
import type {CombatResult,EquipmentItem,EquipmentSlot} from './types';
import {GUIDE,guideForm,selectedLocation} from '../guide/model';
import {availableItems} from './availability';
import {ownedItems,equipmentItem,canEquip,itemRequirements} from './equipment';
import {calculateCombat,combatStyles,familyOf,isWildernessCombat,candidateSpells} from './calculate';
import {requirementSlots,usableAmmo} from './optimise';
import {defenceScore} from './armour';
import {applyAreaDamage} from './area-damage';
import {isBlowpipe,rangedWeaponCandidates,rangedAmmoCandidates} from './ranged';

export interface GearComparisonRow {id:number;name:string;ammoId?:number;selected:boolean;owned:boolean;dps:number|null;aggregateDps:number|null;delta:number|null;prayer:number;defensive:Record<string,number>;defence:number;reason:string}
export interface GearComparison {assumed?:boolean;slot:EquipmentSlot;selectedId:number;reason:string;context:string;notes:string;rows:GearComparisonRow[]}

/** Ranged weapon comparisons pair compatible ammunition; protection stays required. */
export function compareOwnedSlot(p:Profile,state:GuideState,result:CombatResult,slot:EquipmentSlot):GearComparison{
 const record=GUIDE.records[state.variantId],form=guideForm(record,state),location=selectedLocation(record,form,state,p);
 const required=requirementSlots(record,state,location,p),selectedId=result.loadout[slot]||0;
 const fallback=result.armourFallback?.includes(slot),priority=result.armourPriority==='prayer'?'prayer bonus, then relevant defence':'relevant defence, then prayer bonus';
 let reason=required[slot]?'Required creature or location protection takes priority over DPS.':result.source==='example'?'Curated tier/style template, rather than a search of your bank. The comparison shows whether your available alternatives improve this example setup.':fallback?'This slot was not a DPS upgrade. Selected for '+priority+' from style-compatible available armour (or the least accuracy penalty when none is compatible).':'Selected by the bounded DPS search, with '+priority+' breaking equal-DPS ties.';
 const rangedWeapon=slot==='weapon'&&result.family==='ranged';
 const evaluate=(item:EquipmentItem,ammoId?:number):{dps:number|null;aggregateDps:number|null;reason:string}=>{
  if(!canEquip(item,p)){
   const requirements=itemRequirements(item),missing=requirements&&Object.entries(requirements).filter(([skill,level])=>(p.levels[skill]??0)<level).map(([skill,level])=>skill+' '+level);
   return {dps:null,aggregateDps:null,reason:missing?'Requires '+missing.join(', ')+'.':'Unreviewed skill requirements are disabled.'};
  }
  if(required[slot]&&!required[slot]!(item))return {dps:null,aggregateDps:null,reason:'Does not provide the required creature/location protection or weapon.'};
  const loadout={...result.loadout,[slot]:item.id};
  if(rangedWeapon){if(ammoId)loadout.ammo=ammoId;else delete loadout.ammo;}
  const weapon=equipmentItem(loadout.weapon||0),ammo=equipmentItem(loadout.ammo||0);
  const removeShield=rangedWeapon&&weapon?.isTwoHanded&&loadout.shield&&!required.shield;
  if(removeShield)delete loadout.shield;
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
  return best?{dps:best.dps,aggregateDps:best.aggregateDps??best.dps,reason:slot==='weapon'?best.style.type+' / '+best.style.stance+(best.spell?' / '+best.spell:'')+'. '+(rangedWeapon?(ammo?'With '+ammo.name+'. ':'No external ammunition needed. ')+(removeShield?'Optional off-hand removed for this two-handed weapon. ':''):'')+'Best supported attack/spell within '+result.family+'; remaining gear held fixed.':'Other slots, attack style and spell held fixed.'}:{dps:null,aggregateDps:null,reason:issue};
 };
 const actualOwned=new Set(ownedItems(p).map(item=>item.id));
 const available=availableItems(p),usable=available.filter(item=>canEquip(item,p));
 const currentWeapon=equipmentItem(result.loadout.weapon||0);
 const owned=rangedWeapon?rangedWeaponCandidates(available.filter(item=>item.slot==='weapon'),item=>canEquip(item,p)):slot==='ammo'&&isBlowpipe(currentWeapon)?available.filter(item=>usableAmmo(currentWeapon,item,'ranged')):available.filter(item=>item.slot===slot),selectedItem=equipmentItem(selectedId);
 const items=selectedItem&&!owned.some(item=>item.id===selectedId)?[selectedItem,...owned]:owned;
 const rows=items.flatMap(item=>{
  const options:(number|undefined)[]=rangedWeapon?rangedAmmoCandidates(usable,item).map(ammo=>ammo.id):[undefined];
  if(rangedWeapon&&item.id===selectedId&&result.loadout.ammo&&!options.includes(result.loadout.ammo))options.unshift(result.loadout.ammo);
  return (options.length?options:[undefined]).map(ammoId=>{
  const selected=item.id===selectedId&&(!rangedWeapon||ammoId===result.loadout.ammo),value=selected?{dps:result.dps,aggregateDps:result.aggregateDps??result.dps,reason:'Equipped recommendation.'}:evaluate(item,ammoId);
  return {id:item.id,name:item.name,ammoId,selected,owned:actualOwned.has(item.id)&&(!ammoId||actualOwned.has(ammoId)),...value,delta:value.dps===null?null:value.dps-result.dps,prayer:item.bonuses.prayer,defensive:{...item.defensive},defence:defenceScore(item,form)};
  });
 }).sort((a,b)=>Number(b.selected)-Number(a.selected)||(b.aggregateDps??-1)-(a.aggregateDps??-1)||b.prayer-a.prayer||a.id-b.id);
 if(!required[slot]&&!fallback&&result.source!=='example'){
  const bestAlternative=rows.filter(row=>!row.selected&&row.dps!==null).sort((a,b)=>(b.aggregateDps??0)-(a.aggregateDps??0))[0];
  reason+=!bestAlternative?' No other available item can be used in this fixed setup.':(bestAlternative.aggregateDps??0)>(result.aggregateDps??result.dps)+1e-10?' A '+(rangedWeapon?'weapon/ammo combination':'one-slot swap')+' with '+bestAlternative.name+' scores higher; the bounded search missed this alternative.':' Best usable alternative: '+bestAlternative.name+' ('+bestAlternative.dps!.toFixed(3)+' single-target DPS).';
 }
 return {slot,selectedId,reason,assumed:p.assumeAllGear===true,context:(p.assumeAllGear?'All gear assumed · ':'')+record.name+' / '+form.label+' · '+(location?.name||'default location'),notes:'DPS is the whole setup with this item, not damage attributable to the item alone. Defence relevance averages bonuses against the listed NPC attacks ('+(form['attack style']||'unknown: all five')+'); it is not a damage-taken model. Alternatives are available gear in this slot; assumed gear is not a bank-ownership claim. Quest/diary item unlocks and charges still need review. Other gear is held fixed; ranged weapons use compatible available ammunition and remove an optional off-hand for two-handed weapons. The best usable ordinary Rune-or-lower crossbow is retained alongside Dragon/higher and distinct ammunition families. Crossbows evaluate their strongest non-enchanted bolt by Ranged strength plus every available compatible enchanted bolt; blowpipes load their strongest compatible unpoisoned dart. Weapon swaps try supported attacks/spells within the chosen combat family. A complete rebuild may produce a different ranking.',rows};
}
