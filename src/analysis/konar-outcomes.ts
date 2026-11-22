import type {Catalogue,Master,Profile,Row,Variant,Method} from '../domain/types';
import {KONAR_AUDIT,konarPool,konarVariantAvailableAt,sameKonarLocation} from '../rules/konar-locations';
import {locationAccess} from '../rules/location-pool';
import {variantEligibility} from '../rules/eligibility';
import {configuredMethod} from '../combat/priority';
import {GUIDE} from '../guide/model';

/** Assignment weight is rolled once. Each child is one equally likely area,
 * with its own legal creature, combat timing and skip/reset decision. */
export function addKonarOutcomes(data:Catalogue,m:Master,p:Profile,rows:Row[],prepare:(m:Master,p:Profile)=>Row[],progress?:(current:string)=>void):Row[]{
  return rows.map(parent=>{
    if(KONAR_AUDIT[parent.id]?.mode!=='uniform')return parent;
    const pool=konarPool(parent.entry,p),targets=p.goal.targets.filter(t=>t.assignmentId===parent.id).sort((a,b)=>b.priority-a.priority);
    const available=data.variants.filter(v=>v.assignmentIds.includes(parent.id)&&variantEligibility(v,p,m,parent.id).eligible);
    const outcomes=pool.locations.map(location=>{
      const here=(v:Variant)=>konarVariantAvailableAt(parent.entry,v,location,p);
      const target=targets.find(t=>{const v=available.find(v=>v.id===t.variantId),method=configuredMethod(data,p,parent.id,t.variantId);return v&&here(v)&&(!method.location||sameKonarLocation(method.location,location)&&(!p.restrictBasicAccess||locationAccess(method.location,p).value!==0));});
      const choices=available.filter(here).sort((a,b)=>Number(variantEligibility(a,p,m,parent.id).unknown.length>0)-Number(variantEligibility(b,p,m,parent.id).unknown.length>0)||a.hp/a.multiplier-b.hp/b.multiplier);
      const saved=choices.find(v=>v.id===p.methods[parent.id]?.variantId);
      const variant=target?available.find(v=>v.id===target.variantId):saved||choices[0];
      progress?.(parent.name+' / '+location+' / '+(variant?.name||'completion access'));
      if(!variant){
        const expected=data.variants.filter(v=>v.assignmentIds.includes(parent.id)&&here(v));
        return {location,weight:1/pool.locations.length,row:{...parent,variant:expected[0]||parent.variant,locationOutcomes:undefined,isTarget:false,targetFraction:0,method:{...parent.method,location},methodReason:'No available completion method for '+(expected.map(v=>v.name).join(' / ')||parent.variant.name)+' at '+location+'. '+expected.flatMap(v=>variantEligibility(v,p,m,parent.id).failed).join('; '),unknown:[...pool.unknown]}};
      }
      // Resolve the assignment-area alias to the actual guide chamber name so
      // bursting and form-specific DPS use the assigned area, not a default pod.
      const actual=GUIDE.records[variant.id]?.locations.find(l=>(sameKonarLocation(l.name,location)||sameKonarLocation(l.page||'',location))&&(!p.restrictBasicAccess||locationAccess(l.name,p,l.page).value!==0))?.name||location;
      const method:Method={...configuredMethod(data,p,parent.id,variant.id),location:actual,locationChance:null};
      const scenario={...p,goal:{...p.goal,targets:target?[target]:[]},methods:{...p.methods,[parent.id]:method,[parent.id+'::'+variant.id]:method}};
      const row=prepare({...m,tasks:[parent.entry]},scenario)[0];
      return {location,weight:1/pool.locations.length,row:{...row,isTarget:!!target,targetFraction:target?1:0,unknown:[...row.unknown,...pool.unknown]}};
    });
    const matches=outcomes.filter(o=>o.row.isTarget);
    const custom=targets.length===1?configuredMethod(data,p,parent.id,targets[0].variantId).locationChance:null;
    if(custom!==null&&matches.length){
      if(matches.length===outcomes.length&&custom<1){
        const failures=outcomes.map(o=>({...o,weight:(1-custom)/outcomes.length,row:{...o.row,isTarget:false,targetFraction:0}}));
        outcomes.forEach(o=>o.weight=custom/matches.length);outcomes.push(...failures);
      }else outcomes.forEach(o=>o.weight=o.row.isTarget?custom/matches.length:(1-custom)/(outcomes.length-matches.length));
    }
    if(custom!==null)outcomes.forEach(o=>o.row.unknown.push('Custom Konar location probability'));
    const fraction=outcomes.reduce((s,o)=>s+(o.row.isTarget?o.weight:0),0),representative=matches[0]?.row||(parent.isTarget?parent:outcomes[0]?.row)||parent;
    const timed=matches.length?matches:outcomes,total=timed.reduce((s,o)=>s+o.weight,0);
    const mean=(key:'minutes'|'meanKills'|'seconds')=>total?timed.reduce((s,o)=>s+o.weight*o.row[key],0)/total:parent[key];
    const methodReason=parent.isTarget?(matches.length?'':parent.methodReason):outcomes.filter(o=>o.row.methodReason).map(o=>o.location+': '+o.row.methodReason).join('; ');
    return {...parent,variant:representative.variant,method:representative.method,methodReason,
      targetFraction:fraction,minutes:mean('minutes'),seconds:mean('seconds'),meanKills:mean('meanKills'),locationOutcomes:outcomes,locationExcluded:pool.excluded,
      reason:pool.locations.length?parent.reason:'No accessible assignment location',unknown:[...new Set([...pool.unknown,...outcomes.flatMap(o=>o.row.unknown),...(custom!==null?['Custom Konar location probability']:[])])]};
  });
}
export function locationActions(rows:Row[]):Row[]{return rows.flatMap(row=>row.locationOutcomes?.map(o=>o.row)||[row]);}
export function assignLocationProbabilities(rows:Row[]):void{
  for(const parent of rows)for(const outcome of parent.locationOutcomes||[]){
    outcome.row.probability=parent.probability*outcome.weight;outcome.row.blocked=parent.blocked;outcome.row.reason=parent.reason;outcome.row.skip=0;
  }
}
export function sampleLocation(row:Row,rng:()=>number,target?:boolean):Row{
  const outcomes=row.locationOutcomes?.filter(o=>target===undefined||o.row.isTarget===target);
  if(!outcomes?.length)return row;
  let roll=rng()*outcomes.reduce((s,o)=>s+o.weight,0);
  return (outcomes.find(o=>(roll-=o.weight)<0)||outcomes[outcomes.length-1]).row;
}
