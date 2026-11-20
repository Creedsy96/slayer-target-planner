import type {Catalogue,Master,Profile,Method} from '../domain/types';
import type {GuideState} from '../guide/types';
import {defaultMethod} from '../state/profiles';
import {withCalculatedTiming} from './timing';
import {calculateGuideCombat,type GuideCombat} from './guide';

export function configuredMethod(data:Catalogue,p:Profile,assignment:string,variantId:string):Method{
 return {...defaultMethod(data,p,assignment),...(p.methods[assignment]?.variantId===variantId?p.methods[assignment]:{}),...p.methods[assignment+'::'+variantId],variantId};
}
export function prioritisedMasters(data:Catalogue,p:Profile):Master[]{
 const targets=new Set(p.goal.targets.map(t=>t.assignmentId));
 return [...data.masters].sort((a,b)=>Number(b.tasks.some(t=>targets.has(t.id)))-Number(a.tasks.some(t=>targets.has(t.id))));
}
export function prioritisedTasks(m:Master,p:Profile):typeof m.tasks{
 const targets=new Set(p.goal.targets.map(t=>t.assignmentId));
 return [...m.tasks].sort((a,b)=>Number(targets.has(b.id))-Number(targets.has(a.id)));
}
/** Populate the same worker cache used by the remaining master calculations. */
export function preparePriorityCombat(data:Catalogue,p:Profile,guide:GuideState|undefined,guideFirst:boolean,progress:(done:number,total:number,current:string)=>void,ready:(result:GuideCombat)=>void):number{
 const targets=[...new Map([...p.goal.targets].sort((a,b)=>b.priority-a.priority).map(t=>[t.assignmentId+'::'+t.variantId,t])).values()];
 const total=targets.length+(guide?5:0)+data.masters.length;let done=0;
 const hunt=()=>{for(const target of targets){
  const variant=data.variants.find(v=>v.id===target.variantId);if(!variant)continue;
  progress(done,total,'Priority hunt creature / '+variant.name);
  withCalculatedTiming(p,variant,configuredMethod(data,p,target.assignmentId,variant.id));done++;
 }};
 const selectedGuide=()=>{if(guide){ready(calculateGuideCombat(p,guide,(n,current)=>progress(done+n,total,'Priority guide / '+current)));done+=5;}};
 if(guideFirst){selectedGuide();hunt();}else{hunt();selectedGuide();}
 return done;
}
