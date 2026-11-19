import type {Catalogue,Master,Profile,Row,Plan} from '../domain/types';
import {clone,defaultMethod} from '../state/profiles';
import {check,masterEligibility,blockSlots,variantEligibility,locationFraction,targetAssignments} from '../rules/eligibility';
import {basePoints,modifierKinds,meanModifierPoints,choices} from '../rules/points';
import {resetEstimate} from './reset-estimate';
import {taskTiming} from './timing';
import {selectionProbabilities} from './offers';
import {resolveAccess} from '../rules/access';
import {methodLocationRestriction} from '../rules/variant-additions';
import {protectedTask,skipPreference,shouldReset,paidSkipFraction} from '../rules/task-policy';
const sum=(rows:Row[],fn:(r:Row)=>number)=>rows.reduce((s,r)=>s+fn(r),0);
export function prepareRows(data:Catalogue,m:Master,p:Profile):Row[]{
  return m.tasks.map(entry=>{
    const a=data.assignments.find(a=>a.id===entry.id)!;
    const targets=p.goal.targets.filter(t=>t.assignmentId===entry.id);
    const ordered=[...targets].sort((a,b)=>b.priority-a.priority);
    const target=ordered.find(t=>variantEligibility(data.variants.find(v=>v.id===t.variantId)!,p,m,entry.id).eligible)||ordered[0];
    const variantId=target?.variantId||p.methods[entry.id]?.variantId||a.variantIds[0];
    let method={...defaultMethod(data,p,entry.id),...(p.methods[entry.id]?.variantId===variantId?p.methods[entry.id]:{}),...p.methods[entry.id+'::'+variantId],variantId};
    let v=data.variants.find(v=>v.id===method.variantId)!;
    if(!target&&!p.methods[entry.id]&&!p.methods[entry.id+'::'+variantId]){
      const available=a.variantIds.map(id=>data.variants.find(v=>v.id===id)!).filter(v=>variantEligibility(v,p,m,entry.id).eligible);
      if(available.length){v=available.reduce((best,next)=>best.hp/best.multiplier<=next.hp/next.multiplier?best:next);method={...method,...p.methods[entry.id+'::'+v.id],variantId:v.id};}
    }
    const eligibility=check(entry.requirements,p),variant=variantEligibility(v,p,m,entry.id),loc=locationFraction(entry,v,method,m,p);
    if(m.id==='konar'&&entry.locations?.length&&entry.locations.every(l=>resolveAccess('location:'+l,p).value===0))eligibility.failed.push('No accessible assignment location');
    const methodAccess=method.location?resolveAccess('location:'+method.location,p):null;
    if(methodAccess?.value===0)variant.failed.push(`Method location ${method.location} is locked: ${methodAccess.reason}`);
    if(methodAccess?.value===null)variant.unknown.push(`Method location ${method.location}: ${methodAccess.reason}`);
    const locationRestriction=methodLocationRestriction(v,m,method.location);
    if(locationRestriction)variant.failed.push(locationRestriction);
    variant.eligible=!variant.failed.length;
    const timing=taskTiming(entry,v,method);
    const modifier=modifierKinds(p.mortimerTasks??0,entry);
    let reward=basePoints(m,p)*1.775;
    if(m.id==='mortimer')reward=meanModifierPoints(entry)/modifier.length;
    // Preference to avoid a task means skip it, not remove it from the offer pool.
    const weight=entry.unlockWeight&&p.unlocks[entry.unlockWeight.key]===1?entry.unlockWeight.weight:entry.weight;
    const weightUnknown=entry.unlockWeight&&p.unlocks[entry.unlockWeight.key]==null?['Frost dragon weighting reward is unknown']:[];
    return {entry,id:entry.id,name:a.name,variant:v,method,weight,...timing,meanKills:timing.kills,reward,probability:0,skip:0,targetFraction:target&&variant.eligible?loc.fraction:0,isTarget:!!target,blocked:false,reason:eligibility.failed.join('; '),unknown:[...eligibility.unknown,...variant.unknown,...weightUnknown,...(target?loc.unknown:[])],methodReason:variant.failed.join('; '),modifierKinds:modifier};
  });
}
function balanceSkips(rows:Row[],m:Master,p:Profile,data:Catalogue):void{
  if(p.strategy==='none')return;
  const filler=data.masters.find(m=>m.id==='turael')!;
  for(const row of rows)if(!protectedTask(p,row)&&skipPreference(p,row)&&!shouldReset(m,row,p,filler))row.skip=1;
  if(p.objective==='points'||['boost-turael','boost-mazchna','reset-turael'].includes(p.strategy))return;
  let budget=Math.max(0,sum(rows,r=>r.probability*((1-r.skip)*r.reward-r.skip*m.skipCost)));
  const choices=rows.filter(r=>!protectedTask(p,r)&&!skipPreference(p,r))
    .sort((a,b)=>(b.minutes-p.skipSeconds/60)/(m.skipCost+b.reward)-(a.minutes-p.skipSeconds/60)/(m.skipCost+a.reward)||a.id.localeCompare(b.id));
  for(const row of choices){
    if(p.strategy==='funded'){row.skip=row.minutes>p.skipSeconds/60?1:0;continue;}
    const cost=row.probability*(m.skipCost+row.reward);
    if(row.minutes<=p.skipSeconds/60)continue;
    row.skip=cost>1e-14?Math.min(1,Math.max(0,budget/cost)):budget>0?1:0;
    budget=Math.max(0,budget-row.skip*cost);
  }
}
/** Completion method used when Konar offers the right assignment in the wrong location. */
export function completionFallbacks(data:Catalogue,m:Master,p:Profile,rows:Row[]):Map<Row,Row>{
  const result=new Map<Row,Row>();if(m.id!=='konar')return result;
  const q=clone(p);q.goal.targets=[];
  for(const row of rows.filter(r=>r.isTarget))delete q.methods[row.id];
  const alternatives=prepareRows(data,m,q);
  for(const row of rows){const other=alternatives.find(r=>r.id===row.id);if(other&&row.isTarget)result.set(row,other);}
  return result;
}
export function evaluate(data:Catalogue,m:Master,p:Profile,blocks:string[],quality='Evaluated configuration'):Plan{
  const rows=prepareRows(data,m,p),status=masterEligibility(m,p),slots=blockSlots(m,p),targets=targetAssignments(data,p);
  const conflicts:string[]=[];
  if(blocks.length>slots.slots)conflicts.push(`Block list exceeds ${slots.slots} slots.`);
  for(const id of blocks){if(targets.has(id))conflicts.push(`Target ${id} is blocked.`);if(p.preferences[id]==='protect')conflicts.push(`Protected task ${id} is blocked.`);if(!m.tasks.some(t=>t.id===id))conflicts.push(`Master cannot assign ${id}.`);}
  rows.forEach(r=>r.blocked=blocks.includes(r.id));
  const active=rows.filter(r=>!r.reason&&!r.blocked);
  selectionProbabilities(active,m.id==='mortimer'?choices(p):1);
  balanceSkips(active,m,p,data);
  const fillerMaster=data.masters.find(master=>master.id==='turael')!;
  const fallback=p.strategy==='reset-turael'?completionFallbacks(data,m,p,rows):new Map<Row,Row>();
  const resets=(r:Row)=>p.strategy==='reset-turael'&&(!r.isTarget||r.targetFraction<1)&&shouldReset(m,fallback.get(r)||r,p,fillerMaster);
  const rowUnknown=(r:Row):string[]=>{
    const original=resets(r)&&!r.isTarget?[...check(r.entry.requirements,p).unknown,...(r.entry.unlockWeight&&p.unlocks[r.entry.unlockWeight.key]==null?['Frost dragon weighting reward is unknown']:[])]:r.unknown;
    const other=fallback.get(r);
    return [...original,...(other&&r.targetFraction<1&&!resets(r)?other.unknown:[])];
  };
  const targetProb=sum(active,r=>r.isTarget?r.probability*r.targetFraction:0);
  const numerator=sum(active,r=>r.probability*((1-(r.isTarget?r.targetFraction:0))*(1-r.skip)*r.minutes+r.skip*p.skipSeconds/60));
  const noSkip=sum(active,r=>r.probability*(1-(r.isTarget?r.targetFraction:0))*r.minutes);
  const cycle=sum(active,r=>r.probability*((1-r.skip)*r.minutes+r.skip*p.skipSeconds/60));
  const kept=sum(active,r=>r.probability*(1-r.skip));
  const unknown=[...new Set([...status.unknown,...active.flatMap(rowUnknown),...(slots.unknown?['Block-slot eligibility']:[]),...(m.id==='mortimer'&&p.mortimerTasks===null?['Mortimer progression']:[])])];
  let reason=status.failed.join('; ');
  for(const id of blocks)if(!(p.blocks[m.group]||[]).includes(id)&&rows.find(r=>r.id===id)?.reason)conflicts.push('Cannot newly block an ineligible assignment: '+id);
  if(!reason&&conflicts.length)reason=conflicts.join(' ');
  if(!reason&&!targetProb&&!active.some(resets))reason=rows.filter(r=>r.isTarget).map(r=>r.reason||r.methodReason||'No compatible target location').join('; ')||'Cannot assign any selected target';
  if(!reason&&unknown.length&&!p.assumeUnknown)reason='Incomplete requirements: confirm account facts or enable a conditional scenario.';
  if(!reason&&active.some(r=>!r.isTarget&&r.methodReason&&r.skip<1&&!resets(r)))reason='A non-target assignment has no available completion method; change the method or block/skip it.';
  if(!reason&&p.cape)reason='Cape repeat policies require simulation; analytical ranking is unavailable.';
  const actual=p.blocks[m.group]||[],setupCost=blocks.filter(id=>!actual.includes(id)).length*m.blockCost;
  if(p.applySetup&&p.points!==null&&p.points-setupCost<p.reserve)reason='Insufficient points to apply this block list while preserving the reserve.';
  let chance=reason?null:targetProb,hours=chance? (numerator+p.requestMinutes)/chance/60:null;
  let spend=targetProb?sum(active,r=>r.probability*r.skip*m.skipCost)/targetProb+(p.applySetup?setupCost:0):Infinity;
  let reset:Plan['reset'];
  if(active.some(resets)){
    // Replacement tasks use the recorded beginner block list. Proposed/automatic
    // filler blocks are not free purchases and must not change reset legality.
    const fp={...p,strategy:'boost-turael' as const,cape:false,applySetup:false};
    const filler=evaluate(data,fillerMaster,fp,[...(p.blocks[fillerMaster.group]||[])]);
    reset=resetEstimate(m,active,filler,p,fallback);
    const available=filler.rows.filter(r=>!r.reason&&!r.blocked);
    const access=masterEligibility(fillerMaster,p);
    unknown.push(...filler.unknown.filter(value=>!unknown.includes(value)));
    if(!reason&&active.some(r=>r.targetFraction<1&&!resets(r)&&(fallback.get(r)||r).methodReason&&paidSkipFraction(fallback.get(r)||r,p)<1))reason='A kept assignment has no available completion method; review methods.';
    if(!reason&&!available.length)reason='No eligible Turael replacement tasks.';
    if(!reason&&access.failed.length)reason='Turael replacement access: '+access.failed.join('; ');
    if(!reason&&filler.conflicts.some(c=>!c.startsWith('Target ')&&!c.startsWith('Protected ')))reason='Review the recorded Turael block list: '+filler.conflicts.join(' ');
    if(!reason&&available.some(r=>r.methodReason&&r.targetFraction<1&&paidSkipFraction(r,p)<1))reason='A Turael replacement task has no available completion method; review Turael methods.';
    if(!reason&&unknown.length&&!p.assumeUnknown)reason='Incomplete Turael replacement requirements: confirm account facts or enable a conditional scenario.';
    if(!reason&&reset.successPerCycle<=0)reason='No compatible target from this master or Turael replacements.';
    chance=reason?null:reset.successPerCycle/reset.requestsPerCycle;
    hours=reason||reset.successPerCycle<=0?null:reset.cycleMinutes/reset.successPerCycle/60;
    spend=reset.successPerCycle?reset.paidSkipsPerCycle*m.skipCost/reset.successPerCycle+(p.applySetup?setupCost:0):Infinity;
    quality+='; reset renewal model includes recorded Turael blocks, replacement task time and both task requests; simulate finite points and streaks';
  }
  const objectiveValue=reason?Infinity:p.objective==='chance'?-(chance??0):p.objective==='points'?(hours!==null&&hours<=p.simulation.sessionHours?spend+hours*1e-9:Infinity):hours??Infinity;
  return {reset,master:m,rows,blocks,setupCost,chance,hours,noSkipHours:!reason&&targetProb?(noSkip+p.requestMinutes)/targetProb/60:null,offers:chance?1/chance:null,average:kept?sum(active,r=>r.probability*(1-r.skip)*r.minutes)/kept:0,skipRate:reset?reset.paidSkipsPerCycle/reset.requestsPerCycle:sum(active,r=>r.probability*r.skip),pointsEarned:reset?null:cycle?sum(active,r=>r.probability*(1-r.skip)*r.reward)*60/cycle:0,pointsSpent:reset?null:cycle?sum(active,r=>r.probability*r.skip*m.skipCost)*60/cycle:0,boundary:active.filter(r=>r.skip>1e-9&&r.skip<1-1e-9).map(r=>`${r.name}: ${(r.skip*100).toFixed(1)}%`).join(', '),unknown,reason,quality,objectiveValue,searchEvaluations:1,conflicts};
}
export function optimise(data:Catalogue,m:Master,p:Profile,maxEvaluations=700):Plan{
  const rows=prepareRows(data,m,p),targets=targetAssignments(data,p),slots=blockSlots(m,p).slots;
  const fixed=p.proposed[m.group]||[];
  if(Object.hasOwn(p.proposed,m.group))return evaluate(data,m,p,[...fixed],'Fixed proposed list');
  const candidates=rows.filter(r=>!r.reason&&!targets.has(r.id)&&p.preferences[r.id]!=='protect');
  const count=Math.min(slots,candidates.length);
  const score=(r:Row)=>p.objective==='chance'?r.weight:r.weight*r.minutes;
  const sorted=[...candidates].sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
  let best=evaluate(data,m,p,p.objective==='points'?(p.blocks[m.group]||[]):sorted.slice(0,count).map(r=>r.id));let evaluations=1;
  const combinations=p.objective==='points'?Array.from({length:count+1},(_,k)=>chooseCount(candidates.length,k)).reduce((a,b)=>a+b,0):chooseCount(candidates.length,count);
  if(combinations<=maxEvaluations){
    function visit(start:number,selected:string[],size=count):void{
      if(selected.length===size){const plan=evaluate(data,m,p,selected);evaluations++;if(plan.objectiveValue<best.objectiveValue-1e-12)best=plan;return;}
      for(let i=start;i<=candidates.length-(size-selected.length);i++)visit(i+1,[...selected,candidates[i].id],size);
    }
    if(p.objective==='points'){for(let k=0;k<=count;k++)visit(0,[],k);}else visit(0,[]);best.quality='Exact enumeration of legal block sets (fixed method/skip policy)';
  }else if(m.id!=='mortimer'&&p.objective!=='points'&&p.strategy==='none'&&p.goal.kind==='offer'&&!p.cape){
    best.quality='Exact blocks for stationary single-draw offers (fixed methods)';
  }else{
    let improved=true;
    while(improved&&evaluations<maxEvaluations){improved=false;const current=[...best.blocks];
      for(let i=0;i<current.length&&evaluations<maxEvaluations;i++)for(const replacement of candidates){
        if(current.includes(replacement.id)||evaluations>=maxEvaluations)continue;
        const next=[...current];next[i]=replacement.id;const plan=evaluate(data,m,p,next);evaluations++;
        if(plan.objectiveValue<best.objectiveValue-1e-10){best=plan;improved=true;}
      }
    }
    best.quality=`Best found by bounded block swaps (${evaluations} evaluations); not a certified global optimum`;
  }
  if(best.reset)best.quality+='; reset renewal model includes recorded Turael blocks and replacement tasks; simulate points and streaks';
  best.searchEvaluations=evaluations;
  if(m.id==='mortimer')best.quality+='; modifier-aware policies evaluated by simulation';
  if(p.strategy==='funded'||p.goal.kind!=='offer'||p.objective==='points')best.quality+='; analytical offer estimate only — use strategy simulation for this objective';
  return best;
}
function chooseCount(n:number,k:number):number{let total=1;for(let i=1;i<=k;i++)total=total*(n-i+1)/i;return total;}
