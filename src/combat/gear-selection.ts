import type {Catalogue,Profile,Master} from '../domain/types';
import type {GuideState,Family} from '../guide/types';
import type {CombatResult,EquipmentSlot} from './types';
import {compareOwnedSlot} from './comparisons';
import {configuredMethod} from './priority';
import {equipmentItem} from './equipment';

export interface GearSelection {family:Family;slot:EquipmentSlot;id:number;ammoId?:number}
/** Accept a validated one-slot swap, never DPS figures supplied by the UI. */
export function selectCreatureGear(data:Catalogue,p:Profile,state:GuideState,result:CombatResult,choice:GearSelection):void{
 if(result.source!=='bank'||result.family!==choice.family||!result.supported)throw Error('Choose an available character gear setup first.');
 const comparison=compareOwnedSlot(p,state,result,choice.slot);
 const row=[...comparison.rows,...(comparison.outclassed||[])].find(row=>row.id===choice.id&&row.ammoId===choice.ammoId);
 if(!row||row.dps===null||!row.owned&&!p.assumeAllGear)throw Error('This item cannot be used in the current setup. Review its protection, levels and ammunition.');
 p.gearOverrides??={};p.gearOverrides[state.variantId]??={};
 const pins=p.gearOverrides[state.variantId][choice.family]??={};pins[choice.slot]=choice.id;
 if(choice.slot==='weapon'){
  if(choice.ammoId)pins.ammo=choice.ammoId;else delete pins.ammo;
  if(equipmentItem(choice.id)?.isTwoHanded)delete pins.shield;
 }
 // Selecting gear also selects this style for each assignment of this creature.
 // This action opts only these methods into calculated timing; retain rate fields
 // so measured/manual values can still be restored in Combat methods.
 const variant=data.variants.find(v=>v.id===state.variantId)!;
 for(const assignment of variant.assignmentIds){
  const method=configuredMethod(data,p,assignment,variant.id);
  p.methods[assignment+'::'+variant.id]={...method,combatStyle:choice.family,combatDefence:result.armourPriority,stackSize:state.stackSize??method.stackSize,timing:'dps',manualCombat:false,useSelectedGear:true};
 }
}

/** Include filler dependencies: changing a Turael task can change other masters. */
export function gearAffectedMasters(data:Catalogue,p:Profile,variantId:string):Master[]{
 const assignments=new Set(data.variants.find(v=>v.id===variantId)?.assignmentIds||[]);
 const direct=(master:Master)=>master.tasks.some(task=>assignments.has(task.id));
 const fillerId=p.strategy==='boost-mazchna'?'mazchna':p.strategy==='boost-turael'||p.strategy==='reset-turael'?'turael':undefined;
 const fillerChanged=!!fillerId&&data.masters.some(master=>master.id===fillerId&&direct(master));
 return data.masters.filter(master=>direct(master)||fillerChanged&&(p.strategy==='reset-turael'||master.streakGroup==='normal'));
}

export function resetCreatureGear(p:Profile,variantId:string,family:Family):void{
 delete p.gearOverrides?.[variantId]?.[family];
 if(p.gearOverrides?.[variantId]&&!Object.keys(p.gearOverrides[variantId]).length)delete p.gearOverrides[variantId];
}
