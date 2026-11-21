import type {Catalogue,Plan,Profile,Requirement,Source} from '../domain/types';
import {check,masterEligibility,variantEligibility,locationFraction} from '../rules/eligibility';
import {resolveAccess} from '../rules/access';
import {methodLocationRestriction} from '../rules/variant-additions';

export interface TargetUnlock {key:string;label:string;assignments:string[];source:Source}
/** Display-only availability: never grant rewards or alter the evaluated plan. */
export function requiredTargetUnlocks(data:Catalogue,plan:Plan,p:Profile):TargetUnlock[]{
  const master=masterEligibility(plan.master,p);
  if(!master.eligible||master.unknown.length&&!p.assumeUnknown)return [];
  const result=new Map<string,TargetUnlock>();
  for(const row of plan.rows.filter(r=>r.isTarget&&!r.blocked)){
    // Captured purchased-task gates are direct requirements. Alternative routes
    // keep their general requirement explanation rather than implying every
    // reward in an OR group must be purchased.
    const missing=[...row.entry.requirements,...row.variant.requirements].filter((r):r is Requirement&{key:string}=>r.kind==='unlock'&&!!r.key&&(r.min??1)>0&&(p.unlocks[r.key]??0)<(r.min??1)&&Object.hasOwn(data.unlocks,r.key));
    if(!missing.length)continue;
    const scenario={...p,unlocks:{...p.unlocks,...Object.fromEntries(missing.map(r=>[r.key,1]))}};
    const assignment=check(row.entry.requirements,scenario),variant=variantEligibility(row.variant,scenario,plan.master,row.id);
    if(!assignment.eligible||!variant.eligible||!p.assumeUnknown&&(assignment.unknown.length||variant.unknown.length))continue;
    const location=locationFraction(row.entry,row.variant,row.method,plan.master,scenario);
    if(location.fraction<=0||location.unknown.length&&!p.assumeUnknown||methodLocationRestriction(row.variant,plan.master,row.method.location))continue;
    const access=row.method.location?resolveAccess('location:'+row.method.location,scenario):null;
    if(access&&(access.value===0||access.value===null&&!p.assumeUnknown))continue;
    for(const requirement of missing){
      const existing=result.get(requirement.key);
      if(existing){if(!existing.assignments.includes(row.id))existing.assignments.push(row.id);}
      else result.set(requirement.key,{key:requirement.key,label:data.unlocks[requirement.key],assignments:[row.id],source:row.entry.source});
    }
  }
  return [...result.values()];
}
