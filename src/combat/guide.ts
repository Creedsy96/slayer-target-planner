import type {Profile} from '../domain/types';
import type {GuideState,Family,GearSet,GuideRecord,GuideForm,FightPlan,LocationPlan} from '../guide/types';
import type {CombatResult} from './types';
import {GUIDE,guideForm,fightPlan,selectedLocation,gearSet} from '../guide';
import {bestOwnedGear,exampleLoadout} from './optimise';
import {calculateCombat,combatStyles,familyOf,isWildernessCombat,emptyCombat} from './calculate';
import {applyAreaDamage} from './area-damage';

export interface GuideCombat {mid:CombatResult;max:CombatResult;styles:Record<Family,CombatResult>}
export function exampleCombat(p:Profile,record:GuideRecord,form:GuideForm,state:GuideState,location:LocationPlan|undefined,set:GearSet,plan:FightPlan):CombatResult{
 const loadout=exampleLoadout(set),spell=set.slots.find(row=>row.slot==='Spell')?.item||null;
 let result=emptyCombat('No supported attack style in this example.');
 for(const style of combatStyles(loadout.weapon||0).filter(s=>familyOf(s)===plan.family)){
  if(plan.family==='melee'&&['stab','slash','crush'].includes(plan.attack)&&style.type!==plan.attack)continue;
  const calculated=calculateCombat(p,record,form,loadout,style,spell,state.onTask,isWildernessCombat(record,location));
  if(calculated.supported&&calculated.dps>result.dps||!result.supported&&!calculated.supported)result=calculated;
 }
 result.source='example';result.armourPriority=plan.defence;return applyAreaDamage(result,record,location,state.stackSize);
}
export function calculateGuideCombat(p:Profile,state:GuideState,progress?:(done:number,current:string)=>void):GuideCombat{
 const record=GUIDE.records[state.variantId],form=guideForm(record,state),location=selectedLocation(record,form,state,p),plan=fightPlan(record,form,state,location);
 if(p.restrictBasicAccess&&!location){
  const unavailable=()=>emptyCombat('No available location remains for this form. Review this character’s location pool in Settings.');
  return {mid:unavailable(),max:unavailable(),styles:{melee:unavailable(),ranged:unavailable(),magic:unavailable()}};
 }
 const example=(tier:'mid'|'max')=>exampleCombat(p,record,form,state,location,gearSet(record,form,plan,state,location,tier,p),plan);
 progress?.(0,'Mid-level example');const mid=example('mid');progress?.(1,'Max example');const max=example('max');
 const styles={} as Record<Family,CombatResult>;
 for(const [n,family]of (['melee','ranged','magic'] as const).entries()){
  progress?.(n+2,record.name+' · '+family+' owned equipment');
  styles[family]=bestOwnedGear(p,record,form,{...state,approach:family+'-'+plan.defence as GuideState['approach']},location);
 }
 progress?.(5,'Equipment ready');return {mid,max,styles};
}
