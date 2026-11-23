import type {Profile,Method,Variant} from '../domain/types';
import {GUIDE,defaultGuideState,guideForm,selectedLocation,rankLocations,fightPlan} from '../guide/model';
import {defaultCombat} from '../state/bank';
import {bestOwnedGear,cachedOwnedGear} from './optimise';
import {resolveAccess} from '../rules/access';
import {encounter} from '../guide/encounters';
let deferred=false;
/** Worker-local mode: never run a gear search while an interactive hunt is waiting. */
export function deferCombatTiming(value:boolean):void{deferred=value;}
export function configuredTimingReason(p:Profile,method:Method):string|undefined{
 if(!p.combat?.enabled&&!method.useSelectedGear)return 'Automatic combat timing is off for this character. Enable it in Combat settings to use calculated DPS.';
 if(method.timing==='kills-hour')return 'Measured kills per hour is selected; that measured rate takes priority over calculated DPS.';
 if(method.timing==='task-minutes')return 'Measured combat minutes per task is selected; that full-task rate takes priority over calculated DPS.';
 if(method.manualCombat)return 'This method is set to keep its manual DPS instead of automatic combat timing.';
}
export function withCalculatedTiming(p:Profile,v:Variant,method:Method):Method{
 const {calculated,combatNote,...base}=method;method=base;
 const retained=configuredTimingReason(p,method);if(retained)return {...method,combatNote:retained};
 const config=p.combat??defaultCombat();
 const record=GUIDE.records[v.id];if(!record)return {...method,combatNote:'No individual creature DPS mapping; using configured timing.'};
 const mechanics=encounter(record);
 if(mechanics.boss||mechanics.hybrid)return {...method,combatNote:'Boss/phase/switch encounter: using configured full-fight timing.'};
 const state={...defaultGuideState(),variantId:v.id,formId:record.defaultForm,location:method.location,onTask:true,stackSize:method.stackSize,approach:(method.combatStyle||config.style||'auto')==='auto'?'auto':(method.combatStyle||config.style)+'-tank' as ReturnType<typeof defaultGuideState>['approach']};
 if(!state.location&&v.id==='dust-devil'&&resolveAccess('location:Catacombs of Kourend',p).value===1)state.location='Catacombs of Kourend';
 if(state.location){
  const match=record.forms.find(form=>rankLocations(record,form,state,p).some(location=>location.name===state.location));
  if(!match)return {...method,combatNote:'Selected location does not match a supported creature form; using configured timing.'};
  state.formId=match.id;
 }
 const form=guideForm(record,state),location=selectedLocation(record,form,state,p),recommended=fightPlan(record,form,{...state,approach:'auto'},location).defence;
 if(!location&&record.locations.length>0)return {...method,combatNote:'No available location remains for this creature; review the character location pool.'};
 const priority=method.combatDefence??recommended;
 const result=deferred?cachedOwnedGear(p,record,form,state,location,priority):bestOwnedGear(p,record,form,state,location,priority);
 if(!result)return {...method,timing:'dps',dps:5,combatNote:'Provisional 5 DPS while owned-gear calculations run in the background. This row updates when its combat result is ready.'};
 if(!result.supported)return {...method,combatNote:result.reason+' Using configured timing.'};
 return {...method,calculated:{ttk:(result.effectiveTtk??result.ttk)/(config.uptime/100),batchTtk:result.ttk/(config.uptime/100),targets:result.targets||1,dps:result.aggregateDps??result.dps,weaponId:result.loadout.weapon||0},combatNote:'Owned-gear '+result.family+' DPS'+((result.targets||1)>1?' · '+result.targets+'-target stack estimate':'')+' at '+(location?.name||'default location')+' / '+(result.armourPriority==='prayer'?'prayer':'tank')+' armour fallback and expected hits-to-kill; '+config.uptime+'% attack uptime. Legacy creature DPS multipliers are not applied.'};
}
