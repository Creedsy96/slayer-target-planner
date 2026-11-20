import type {Profile,Method,Variant} from '../domain/types';
import {GUIDE,defaultGuideState,guideForm,selectedLocation,rankLocations,fightPlan} from '../guide/model';
import {bestOwnedGear} from './optimise';
import {resolveAccess} from '../rules/access';
import {encounter} from '../guide/encounters';
export function withCalculatedTiming(p:Profile,v:Variant,method:Method):Method{
 const {calculated,combatNote,...base}=method;method=base;
 if(!p.combat?.enabled||method.timing!=='dps'||method.manualCombat)return method;
 const record=GUIDE.records[v.id];if(!record)return {...method,combatNote:'No individual creature DPS mapping; using configured timing.'};
 const mechanics=encounter(record);
 if(mechanics.boss||mechanics.hybrid)return {...method,combatNote:'Boss/phase/switch encounter: using configured full-fight timing.'};
 const state={...defaultGuideState(),variantId:v.id,formId:record.defaultForm,location:method.location,onTask:true,stackSize:method.stackSize,approach:(method.combatStyle||p.combat.style||'auto')==='auto'?'auto':(method.combatStyle||p.combat.style)+'-tank' as ReturnType<typeof defaultGuideState>['approach']};
 if(!state.location&&v.id==='dust-devil'&&resolveAccess('location:Catacombs of Kourend',p).value===1)state.location='Catacombs of Kourend';
 if(state.location){
  const match=record.forms.find(form=>rankLocations(record,form,state).some(location=>location.name===state.location));
  if(!match)return {...method,combatNote:'Selected location does not match a supported creature form; using configured timing.'};
  state.formId=match.id;
 }
 const form=guideForm(record,state),location=selectedLocation(record,form,state),recommended=fightPlan(record,form,{...state,approach:'auto'},location).defence;
 const result=bestOwnedGear(p,record,form,state,location,method.combatDefence??recommended);
 if(!result.supported)return {...method,combatNote:result.reason+' Using configured timing.'};
 return {...method,calculated:{ttk:(result.effectiveTtk??result.ttk)/(p.combat.uptime/100),batchTtk:result.ttk/(p.combat.uptime/100),targets:result.targets||1,dps:result.aggregateDps??result.dps,weaponId:result.loadout.weapon||0},combatNote:'Owned-gear '+result.family+' DPS'+((result.targets||1)>1?' · '+result.targets+'-target stack estimate':'')+' at '+(location?.name||'default location')+' / '+(result.armourPriority==='prayer'?'prayer':'tank')+' armour fallback and expected hits-to-kill; '+p.combat.uptime+'% attack uptime. Legacy creature DPS multipliers are not applied.'};
}
