import {locationAccess} from '../rules/location-pool';
import {addKonarOutcomes,locationActions,assignLocationProbabilities} from './konar-outcomes';
import {KONAR_AUDIT} from '../rules/konar-locations';
import {withCalculatedTiming} from '../combat/timing';
import {configuredMethod,prioritisedTasks} from '../combat/priority';
import type {Catalogue,Master,Profile,Row,Plan} from '../domain/types';
import {clone,defaultMethod} from '../state/profiles';
import {check,masterEligibility,blockSlots,variantEligibility,locationFraction,targetAssignments} from '../rules/eligibility';
import {basePoints,modifierKinds,meanModifierPoints,choices,pointRewardUnknown} from '../rules/points';
import {boostEstimate} from './boost-estimate';
import {offerMoments} from './offer-moments';
import {resetEstimate} from './reset-estimate';
import {taskTiming} from './timing';
import {selectionProbabilities} from './offers';
import {resolveAccess,questState} from '../rules/access';
import {resolveCreatureAccess} from '../rules/creature-access';
import {methodLocationRestriction} from '../rules/variant-additions';
import {protectedTask,skipPreference,shouldReset,paidSkipFraction} from '../rules/task-policy';
const sum=(rows:Row[],fn:(r:Row)=>number)=>rows.reduce((s,r)=>s+fn(r),0);
export function prepareRows(data:Catalogue,m:Master,p:Profile,progress?:(done:number,total:number,current:string)=>void):Row[]{
  if(m.id!=='konar')return prepareBaseRows(data,m,p,progress);
  const total=m.tasks.length+m.tasks.reduce((s,e)=>s+(KONAR_AUDIT[e.id]?.locations.length||0),0);
  const rows=prepareBaseRows(data,m,p,(done,_,current)=>progress?.(done,total,current));let done=m.tasks.length;
  return addKonarOutcomes(data,m,p,rows,(master,scenario)=>prepareBaseRows(data,master,scenario),current=>progress?.(done++,total,'Konar location / '+current));
}
function prepareBaseRows(data:Catalogue,m:Master,p:Profile,progress?:(done:number,total:number,current:string)=>void):Row[]{
  const rows=prioritisedTasks(m,p).map((entry,index)=>{
    const a=data.assignments.find(a=>a.id===entry.id)!;
    const targets=p.goal.targets.filter(t=>t.assignmentId===entry.id);
    const ordered=[...targets].sort((a,b)=>b.priority-a.priority);
    const target=ordered.find(t=>variantEligibility(data.variants.find(v=>v.id===t.variantId)!,p,m,entry.id).eligible)||ordered[0];
    const variantId=target?.variantId||p.methods[entry.id]?.variantId||a.variantIds[0];
    let method=configuredMethod(data,p,entry.id,variantId);
    let v=data.variants.find(v=>v.id===method.variantId)!;
    if(!target&&!p.methods[entry.id]&&!p.methods[entry.id+'::'+variantId]){
      const available=a.variantIds.map(id=>data.variants.find(v=>v.id===id)!).map(variant=>({variant,status:variantEligibility(variant,p,m,entry.id)})).filter(choice=>choice.status.eligible);
      const confirmed=available.filter(choice=>!choice.status.unknown.length),choices=confirmed.length?confirmed:available;
      // A low-HP unreviewed spawn must not displace a confirmed ordinary method.
      if(choices.length){v=choices.map(choice=>choice.variant).reduce((best,next)=>best.hp/best.multiplier<=next.hp/next.multiplier?best:next);method={...method,...p.methods[entry.id+'::'+v.id],variantId:v.id};}
    }
    method.extended=p.extensions?.[entry.id]??method.extended;
    const eligibility=check(entry.requirements,p),variant=variantEligibility(v,p,m,entry.id),loc=locationFraction(entry,v,method,m,p);
    if(m.id==='konar'&&entry.locations?.length&&entry.locations.every(l=>resolveAccess('location:'+l,p).value===0))eligibility.failed.push('No accessible assignment location');
    const methodAccess=method.location?(p.restrictBasicAccess?locationAccess(method.location,p):resolveAccess('location:'+method.location,p)):null;
    const creaturePlace=method.location?resolveCreatureAccess('variant:'+v.id,p,resolveAccess,questState,method.location):undefined;
    if(creaturePlace?.value===0)variant.failed.push(creaturePlace.reason);
    if(creaturePlace?.value===null)variant.unknown.push(creaturePlace.reason);
    if(methodAccess?.value===0)variant.failed.push(`Method location ${method.location} is locked: ${methodAccess.reason}`);
    if(methodAccess?.value===null)variant.unknown.push(`Method location ${method.location}: ${methodAccess.reason}`);
    const locationRestriction=methodLocationRestriction(v,m,method.location);
    if(locationRestriction)variant.failed.push(locationRestriction);
    variant.eligible=!variant.failed.length;
    progress?.(index,m.tasks.length,v.name);
    method=withCalculatedTiming(p,v,method);
    const timing=taskTiming(entry,v,method);
    const modifier=modifierKinds(p.mortimerTasks??0,entry);
    let reward=basePoints(m,p)*1.775;
    if(m.id==='mortimer')reward=meanModifierPoints(entry)/modifier.length;
    // Preference to avoid a task means skip it, not remove it from the offer pool.
    const weight=entry.unlockWeight&&p.unlocks[entry.unlockWeight.key]===1?entry.unlockWeight.weight:entry.weight;
    const weightUnknown=entry.unlockWeight&&p.unlocks[entry.unlockWeight.key]==null?['Frost dragon weighting reward is unknown']:[];
    return {entry,id:entry.id,name:a.name,variant:v,method,weight,...timing,meanKills:timing.kills,reward,probability:0,skip:0,targetFraction:target&&variant.eligible?loc.fraction:0,isTarget:!!target,blocked:false,reason:eligibility.failed.join('; '),unknown:[...eligibility.unknown,...variant.unknown,...weightUnknown,...(target?loc.unknown:[])],methodReason:variant.failed.join('; '),modifierKinds:modifier};
  });
  // Preparation order is independent of the published assignment order.
  return rows.sort((a,b)=>m.tasks.indexOf(a.entry)-m.tasks.indexOf(b.entry));
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
  const result=new Map<Row,Row>();if(rows.some(r=>!!r.locationOutcomes)||!rows.some(r=>r.isTarget&&r.targetFraction<1))return result;
  const q=clone(p);q.goal.targets=[];
  for(const row of rows.filter(r=>r.isTarget))delete q.methods[row.id];
  const alternatives=prepareRows(data,m,q);
  for(const row of rows){const other=alternatives.find(r=>r.id===row.id);if(other&&row.isTarget&&row.targetFraction<1)result.set(row,other);}
  return result;
}
export function buildFillerPlan(data:Catalogue,m:Master,p:Profile,blocks:string[]):Plan{
  const id=p.strategy==='boost-mazchna'?'mazchna':'turael',master=data.masters.find(m=>m.id===id);
  if(!master)throw Error('The filler master is missing from this catalogue.');
  const scenario={...p,strategy:p.strategy==='none'?'none' as const:'boost-turael' as const,cape:false,applySetup:false};
  return evaluate(data,master,scenario,master.group===m.group?[...blocks]:[...(p.blocks[master.group]||[])],'Recorded filler block list',true);
}
export function fillerIssue(data:Catalogue,filler:Plan,p:Profile):string{
  const status=masterEligibility(filler.master,p),rows=filler.rows.filter(r=>!r.reason&&!r.blocked);
  if(status.failed.length)return filler.master.name+' access: '+status.failed.join('; ');
  if(!rows.length)return 'No eligible '+filler.master.name+' filler tasks.';
  if(filler.unknown.length&&!p.assumeUnknown)return 'Confirm '+filler.master.name+' filler requirements: '+filler.unknown.join('; ');
  const fallback=completionFallbacks(data,filler.master,p,filler.rows);
  if(rows.some(r=>(fallback.get(r)||r).methodReason&&r.targetFraction<1&&paidSkipFraction(fallback.get(r)||r,p)<1))return 'A '+filler.master.name+' filler task has no available completion method.';
  return '';
}
export function evaluate(data:Catalogue,m:Master,p:Profile,blocks:string[],quality='Evaluated configuration',asFiller=false,baseRows?:Row[]):Plan{
  const rows=baseRows?structuredClone(baseRows):prepareRows(data,m,p),status=masterEligibility(m,p),slots=blockSlots(m,p),targets=targetAssignments(data,p);
  const conflicts:string[]=[];
  if(blocks.length>slots.slots&&!slots.unknown)conflicts.push(`Block list exceeds ${slots.slots} slots.`);
  if(blocks.length>7)conflicts.push('Block list exceeds the maximum of 7 slots.');
  for(const id of blocks){if(targets.has(id))conflicts.push(`Target ${id} is blocked.`);if(p.preferences[id]==='protect')conflicts.push(`Protected task ${id} is blocked.`);if(!m.tasks.some(t=>t.id===id)&&!asFiller&&!(p.blocks[m.group]||[]).includes(id))conflicts.push(`Master cannot assign ${id}.`);}
  rows.forEach(r=>r.blocked=blocks.includes(r.id));
  const assignments=rows.filter(r=>!r.reason&&!r.blocked);
  selectionProbabilities(assignments,m.id==='mortimer'?choices(p):1);
  assignLocationProbabilities(rows);
  const active=locationActions(assignments);
  balanceSkips(active,m,p,data);
  for(const row of rows)if(row.locationOutcomes)row.skip=row.locationOutcomes.reduce((s,o)=>s+o.weight*o.row.skip,0);
  const fillerMaster=data.masters.find(master=>master.id==='turael')!;
  const fallback=completionFallbacks(data,m,p,rows);
  const boosting=p.strategy.startsWith('boost')&&!asFiller;
  const resets=(r:Row)=>p.strategy==='reset-turael'&&(!r.isTarget||r.targetFraction<1)&&shouldReset(m,fallback.get(r)||r,p,fillerMaster);
  const rowUnknown=(r:Row):string[]=>{
    const original=resets(r)&&!r.isTarget?[...check(r.entry.requirements,p).unknown,...(r.entry.unlockWeight&&p.unlocks[r.entry.unlockWeight.key]==null?['Frost dragon weighting reward is unknown']:[])]:r.unknown;
    const other=fallback.get(r);
    const unnecessary=!r.isTarget&&r.skip>=1-1e-9?new Set(check(r.variant.requirements,p).unknown):new Set<string>();
    if(!r.isTarget&&r.skip>=1-1e-9&&r.method.location){const place=resolveCreatureAccess('variant:'+r.variant.id,p,resolveAccess,questState,r.method.location);if(place?.value===null)unnecessary.add(place.reason);}
    const required=original.filter(message=>!unnecessary.has(message));
    if(unnecessary.size)required.push(...check(r.entry.requirements,p).unknown);
    return [...required,...(other&&r.targetFraction<1&&!resets(r)?other.unknown:[])];
  };
  const targetProb=sum(active,r=>r.isTarget?r.probability*r.targetFraction:0);
  const moments=offerMoments(active,p,fallback);
  const numerator=moments.beforeTarget-p.requestMinutes;
  const noSkip=sum(active,r=>r.probability*(1-(r.isTarget?r.targetFraction:0))*r.minutes);
  const cycle=moments.full;
  const kept=sum(active,r=>r.probability*(1-r.skip));
  const unknown=[...new Set([...status.unknown,...pointRewardUnknown(m,p),...active.flatMap(rowUnknown),...(slots.unknown&&blocks.length>slots.slots?['Block-slot eligibility']:[]),...(m.id==='mortimer'&&p.mortimerTasks===null?['Mortimer progression']:[])])];
  let reason=status.failed.join('; ');
  if(!reason&&boosting&&m.streakGroup!=='normal')reason='Boosting requires a milestone master in the normal streak group.';
  for(const id of blocks)if(!(p.blocks[m.group]||[]).includes(id)&&rows.find(r=>r.id===id)?.reason)conflicts.push('Cannot newly block an ineligible assignment: '+id);
  if(!reason&&conflicts.length)reason=conflicts.join(' ');
  if(!reason&&!targetProb&&!active.some(resets)&&!boosting)reason=rows.filter(r=>r.isTarget).map(r=>r.reason||r.methodReason||'No compatible target location').join('; ')||'Cannot assign any selected target';
  if(!reason&&unknown.length&&!p.assumeUnknown)reason='Incomplete requirements: '+unknown[0].slice(0,240)+(unknown.length>1?' Review the remaining requirements below.':'');
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
    const filler=evaluate(data,fillerMaster,fp,[...(p.blocks[fillerMaster.group]||[])],'Recorded Turael blocks',true);
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
  let boost:Plan['boost'],simulationOnly=false;
  if(boosting&&m.streakGroup==='normal'){
    const filler=buildFillerPlan(data,m,p,blocks),issue=fillerIssue(data,filler,p);
    unknown.push(...filler.unknown.filter(value=>!unknown.includes(value)));
    if(!reason&&issue)reason=issue;
    if(!reason&&!Number.isInteger(p.streaks.normal))reason='Enter a whole-number normal streak for the boosting schedule.';
    if(!reason||reason==='Cape repeat policies require simulation; analytical ranking is unavailable.'){
      const main={master:m,rows} as Plan;
      boost=boostEstimate(main,filler,p,new Map([...fallback,...completionFallbacks(data,filler.master,p,filler.rows)]));
      if(!reason&&boost.mainChance+boost.fillerChance<=0)reason='No compatible target from the milestone or filler master.';
      if(!reason&&boost.minutes===null){reason='Unlimited paid skipping stalls this boosting schedule; simulate with your actual point balance.';simulationOnly=true;}
      chance=reason||!boost.requests?null:1/boost.requests;
      hours=reason||boost.minutes===null?null:boost.minutes/60;
      spend=boost.paidSkips===null?Infinity:boost.paidSkips*m.skipCost+(p.applySetup?setupCost:0);
    }
  }
  const pointsRateReason=pointRewardUnknown(m,p).length&&!p.assumeUnknown?'Confirm the elite diary point bonus.':reset?'Reset streak rewards require simulation.':p.cape?'Cape repeat point rates require simulation.':m.id==='mortimer'?'Mortimer modifier-aware rewards require simulation.':undefined;
  const rate=boost?boost.targetKillsPerHour:reset?reset.targetKillsPerHour:moments.full>0?moments.targetKills*60/moments.full:null;
  const targetRateReason=reason||(m.id==='mortimer'?'Mortimer quantity and combat modifiers need simulation; a base-quantity rate would be misleading.':undefined)||((rate===null||!Number.isFinite(rate)||rate<0)?'No finite full-task cycle is available for this setup.':undefined);
  const targetKillsPerHour=targetRateReason?null:rate;
  const objectiveValue=reason?Infinity:p.objective==='kills-hour'?(targetKillsPerHour!==null&&targetKillsPerHour>0?-targetKillsPerHour:Infinity):p.objective==='chance'?-(chance??0):p.objective==='points'?(hours!==null&&hours<=p.simulation.sessionHours?spend+hours*1e-9:Infinity):hours??Infinity;
  return {targetKillsPerHour,targetRateReason,boost,simulationOnly,pointsRateReason,reset,master:m,rows,blocks,setupCost,chance,hours,noSkipHours:!reason&&targetProb?(noSkip+p.requestMinutes)/targetProb/60:null,offers:chance?1/chance:null,average:kept?sum(active,r=>r.probability*(1-r.skip)*r.minutes)/kept:0,skipRate:boost&&boost.requests&&boost.paidSkips!==null?boost.paidSkips/boost.requests:reset?reset.paidSkipsPerCycle/reset.requestsPerCycle:sum(active,r=>r.probability*r.skip),pointsEarned:pointsRateReason?null:boost?boost.pointsEarnedPerHour:cycle?sum(active,r=>r.probability*(1-r.skip)*r.reward)*60/cycle:0,pointsSpent:pointsRateReason?null:boost?boost.pointsSpentPerHour:cycle?sum(active,r=>r.probability*r.skip*m.skipCost)*60/cycle:0,boundary:active.filter(r=>r.skip>1e-9&&r.skip<1-1e-9).map(r=>`${r.name}: ${(r.skip*100).toFixed(1)}%`).join(', '),unknown,reason,quality,objectiveValue,searchEvaluations:1,conflicts};
}
export function optimise(data:Catalogue,m:Master,p:Profile,maxEvaluations=700,progress?:(fraction:number,current:string)=>void):Plan{
  const rows=prepareRows(data,m,p,(done,total,current)=>progress?.(.7*done/Math.max(1,total),'Gear / '+current)),targets=targetAssignments(data,p),slots=blockSlots(m,p).slots;
  let reported=0;
  const scorePlan=(blocks:string[],quality='Evaluated configuration')=>{progress?.(.7+.29*Math.min(1,reported++/maxEvaluations),'Blocks and skips / candidate '+reported);return evaluate(data,m,p,blocks,quality,false,rows);};
  const fixed=p.proposed[m.group]||[];
  if(Object.hasOwn(p.proposed,m.group))return scorePlan([...fixed],'Fixed proposed list');
  const candidates=rows.filter(r=>!r.reason&&!targets.has(r.id)&&p.preferences[r.id]!=='protect');
  const count=Math.min(slots,candidates.length);
  const rateObjective=p.objective==='kills-hour',variableSize=rateObjective||p.objective==='points';
  const score=(r:Row)=>p.objective==='chance'?r.weight:r.weight*(r.minutes+(rateObjective?p.requestMinutes:0));
  const sorted=[...candidates].sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
  let best=scorePlan(p.objective==='points'?(p.blocks[m.group]||[]):sorted.slice(0,count).map(r=>r.id));let evaluations=1;
  const combinations=variableSize?Array.from({length:count+1},(_,k)=>chooseCount(candidates.length,k)).reduce((a,b)=>a+b,0):chooseCount(candidates.length,count);
  if(combinations+(rateObjective?1:0)<=maxEvaluations){
    function visit(start:number,selected:string[],size=count):void{
      if(selected.length===size){const plan=scorePlan(selected);evaluations++;if(plan.objectiveValue<best.objectiveValue-1e-12)best=plan;return;}
      for(let i=start;i<=candidates.length-(size-selected.length);i++)visit(i+1,[...selected,candidates[i].id],size);
    }
    if(variableSize){for(let k=0;k<=count;k++)visit(0,[],k);}else visit(0,[]);best.quality='Exact enumeration of legal block sets (fixed method/skip policy)';
  }else if(!rateObjective&&m.id!=='mortimer'&&p.objective!=='points'&&p.strategy==='none'&&p.goal.kind==='offer'&&!p.cape){
    best.quality='Exact blocks for stationary single-draw offers (fixed methods)';
  }else{
    if(rateObjective){
      const seeds=[[],p.blocks[m.group]||[],...Array.from({length:count},(_,n)=>sorted.slice(0,n+1).map(r=>r.id))];
      for(const seed of seeds){
        if(evaluations>=maxEvaluations)break;
        if(seed.length>count||seed.some(id=>!candidates.some(r=>r.id===id)))continue;
        const plan=scorePlan([...seed]);evaluations++;
        if(plan.objectiveValue<best.objectiveValue-1e-10)best=plan;
      }
    }
    let improved=true;
    while(improved&&evaluations<maxEvaluations){improved=false;const current=[...best.blocks];
      if(rateObjective){
        const neighbours=[...current.map(id=>current.filter(other=>other!==id)),...(current.length<count?candidates.filter(r=>!current.includes(r.id)).map(r=>[...current,r.id]):[])];
        for(const blocks of neighbours){
          if(evaluations>=maxEvaluations)break;
          const plan=scorePlan(blocks);evaluations++;
          if(plan.objectiveValue<best.objectiveValue-1e-10){best=plan;improved=true;}
        }
      }
      for(let i=0;i<current.length&&evaluations<maxEvaluations;i++)for(const replacement of candidates){
        if(current.includes(replacement.id)||evaluations>=maxEvaluations)continue;
        const next=[...current];next[i]=replacement.id;const plan=scorePlan(next);evaluations++;
        if(plan.objectiveValue<best.objectiveValue-1e-10){best=plan;improved=true;}
      }
    }
    best.quality=`Best found by bounded block ${rateObjective?'adds/removals/swaps':'swaps'} (${evaluations} evaluations); not a certified global optimum`;
  }
  if(best.boost)best.quality+='; periodic boosting estimate includes filler tasks and current streak; point rates use a 1000-completion cycle';
  if(best.reset)best.quality+='; reset renewal model includes recorded Turael blocks and replacement tasks; simulate points and streaks';
  best.searchEvaluations=evaluations;
  if(blockSlots(m,p).unknown)best.quality+='; baseline uses confirmed block capacity only — enter quest points and Lumbridge Elite status to optimise additional slots';
  if(m.id==='mortimer')best.quality+='; modifier-aware policies evaluated by simulation';
  if(rateObjective)best.quality+='; ranked by selected target creatures killed per hour over repeated full task cycles';
  if(!rateObjective&&(p.strategy==='funded'||p.goal.kind!=='offer'||p.objective==='points'))best.quality+='; analytical offer estimate only — use strategy simulation for this objective';
  return best;
}
function chooseCount(n:number,k:number):number{let total=1;for(let i=1;i<=k;i++)total=total*(n-i+1)/i;return total;}
