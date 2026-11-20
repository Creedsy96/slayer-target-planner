import {combatSeconds} from './timing';
import type {Catalogue,Plan,Profile,Row,Simulation,Master} from '../domain/types';
import {clone} from '../state/profiles';
import {choices,complete,completionReward,modifierKinds,ledger,pay,resetStreak,rangeValues,pointRewardUnknown,type Ledger} from '../rules/points';
import {rollMortimer,MORTIMER_VERSION} from '../rules/mortimer';
import {buildFillerPlan,completionFallbacks,evaluate,fillerIssue,prepareRows} from './planner';
import {sampleOffer} from './offers';
import {sampleQuantity,sampleKills} from './timing';
import {observedOfferGoal} from './observed-goal';
import {actualTargetCompatibility as actualTarget,paidSkipFraction,shouldReset} from '../rules/task-policy';
export function random(seed:number):()=>number{
  let state=seed>>>0;return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}
interface Option {masterId?:string;row:Row;kind:string;points:number;quantity:number;target:boolean;modifierValue?:number|null}
interface Trial {success:boolean;hours:number;exhausted:boolean;spent:number;remaining:number;earned:number;trace:string[]}
export function wilson(successes:number,total:number):[number,number]{
  if(!total)return [0,1];const z=1.95996398454,p=successes/total,d=1+z*z/total;
  const centre=(p+z*z/2/total)/d,half=z*Math.sqrt(p*(1-p)/total+z*z/4/total**2)/d;return [Math.max(0,centre-half),Math.min(1,centre+half)];
}
function validateStartingMortimer(data:Catalogue,p:Profile):void{
  const pendingMaster=data.masters.find(m=>m.id===p.current.masterId);
  if(p.current.kind!=='new'&&pendingMaster?.id==='mortimer'){
    if(p.current.kind==='task'&&(!p.current.modifier||p.current.modifier==='none'))throw Error('Every Mortimer task has a modifier. Enter the actual current-task modifier.');
    if(p.current.kind==='offer'&&p.current.options?.some(o=>o.modifier==='none'))throw Error('Every Mortimer offer has a modifier. Enter a modifier for each pending option.');
    if(p.mortimerTasks===null)throw Error('Enter completed Mortimer tasks before simulating an actual Mortimer assignment.');
    const options=p.current.kind==='offer'?(p.current.options||[]): [{assignmentId:p.current.assignmentId,modifier:p.current.modifier||'none',points:p.current.modifierPoints}];
    for(const option of options){
      const entry=pendingMaster.tasks.find(t=>t.id===option.assignmentId);
      if(!entry||!modifierKinds(p.mortimerTasks,entry).includes(option.modifier))throw Error('Choose an unlocked actual Mortimer modifier.');
      completionReward(pendingMaster,p,p.streaks.mortimer??0,entry,option.modifier,option.points);
      if(p.current.kind==='offer'&&option.modifier==='quantity'&&!rangeValues(entry.quantityModifier).includes((option as {quantity?:number}).quantity??0))throw Error('Enter a valid actual Mortimer quantity modifier.');
    }
  }
}
export function simulate(data:Catalogue,plan:Plan,p:Profile,onProgress?:(done:number)=>void):Simulation{
  if(p.points===null)throw Error('Enter current points before simulating legal funded actions.');
  validateStartingMortimer(data,p);
  const observed=observedOfferGoal(data,p);if(observed)return observed;
  if(plan.reason&&!plan.simulationOnly&&plan.reason!=='Cape repeat policies require simulation; analytical ranking is unavailable.')throw Error(plan.reason);
  if(p.streaks[plan.master.streakGroup]==null)throw Error('Enter the current '+plan.master.streakGroup+' streak before simulation.');
  if(plan.master.id==='mortimer'&&p.mortimerTasks===null)throw Error('Enter completed Mortimer tasks before simulation.');
  if(p.current.kind==='task'&&p.streaks[data.masters.find(m=>m.id===p.current.masterId)!.streakGroup]==null)throw Error('Enter the streak for the current task master.');
  if(p.current.kind==='offer'&&!p.current.options?.length)throw Error('Supply the actual pending offer options.');
  if(p.current.kind==='task'&&p.current.remaining<=0)throw Error('Enter positive remaining task count, or choose Requesting a new offer for a completed task.');
  if(p.cape&&plan.master.id==='mortimer')throw Error('Mortimer cape choice policies are not modelled; disable the cape for this scenario.');
  const filler=buildFillerPlan(data,plan.master,p,plan.blocks);
  if(p.strategy.startsWith('boost')&&plan.master.streakGroup!=='normal')throw Error('Boosting requires a milestone master in the normal streak group.');
  if(p.strategy.startsWith('boost')||p.strategy==='reset-turael'){
    const issue=fillerIssue(data,filler,p);if(issue)throw Error(issue);
  }
  const pendingMaster=data.masters.find(m=>m.id===p.current.masterId);
  if(p.current.kind!=='new'&&pendingMaster&&p.streaks[pendingMaster.streakGroup]===null)throw Error('Enter the current-task master streak before simulation.');
  const pending=p.current.kind==='offer'&&pendingMaster?evaluate(data,pendingMaster,{...p,cape:false},p.blocks[pendingMaster.group]||[],'Pending actual offer',true):undefined;
  if(p.current.kind==='offer'&&!pending)throw Error('Choose a valid pending-offer master.');
  if(p.cape&&p.current.kind==='new'&&!p.previousMasterId)throw Error('Choose the actual previous task master before simulating cape repeats.');
  if(p.cape&&p.current.kind==='new'&&p.previousMasterId){
    const master=data.masters.find(m=>m.id===p.previousMasterId)!;
    const row=prepareRows(data,master,p).find(r=>r.id===p.previousTask);
    if(!row)throw Error('The previous master cannot assign that previous task.');
    actualTarget(row,p.previousTargetCompatible,'previous');
  }
  const fallback=new Map<Row,Row>();
  for(const candidate of [plan,filler,...(pending?[pending]:[])])for(const [row,other]of completionFallbacks(data,candidate.master,p,candidate.rows))fallback.set(row,other);
  const rng=random(p.simulation.seed),trials:Trial[]=[],count=Math.floor(p.simulation.trials);
  for(let i=0;i<count;i++){
    trials.push(runTrial(data,plan,filler,p,rng,i===0,fallback,pending));
    if(i%100===0)onProgress?.(i);
  }
  const success=trials.filter(t=>t.success).sort((a,b)=>a.hours-b.hours),unresolved=count-success.length;
  const quantile=(q:number)=>{const index=Math.max(0,Math.ceil(q*count)-1),candidate=success[index]?.hours;return candidate!==undefined&&!trials.some(t=>!t.success&&t.hours<candidate)?candidate:null;};
  const hit=success.filter(t=>t.hours<=p.simulation.sessionHours).length;
  const max=Math.max(p.simulation.sessionHours,quantile(.9)??0,.25);
  const curve=Array.from({length:21},(_,i)=>{const hours=max*i/20,hits=success.filter(t=>t.hours<=hours).length;const [low]=wilson(hits,count),censored=trials.filter(t=>!t.success&&t.hours<hours).length;const high=wilson(hits+censored,count)[1];return {hours,chance:hits/count,low,high};});
  const notes=[...plan.unknown.map(s=>'Conditional: '+s),'Task quantities use a uniform integer range scenario. Timings use configured rates; random kill-time variance is not modelled.'];
  if(unresolved)notes.push(`${unresolved} trials did not reach the goal within ${p.simulation.horizonOffers} offers. Mean is withheld; unresolved runs are not discarded.`);
  if(trials.some(t=>!t.success&&t.hours<p.simulation.sessionHours))notes.push('Session success is a lower bound because some unfinished trials stopped before the session ended; the displayed interval includes unresolved outcomes plus Wilson sampling uncertainty, not model error.');
  if(plan.master.id==='mortimer')notes.push(`Mortimer rules ${MORTIMER_VERSION}: every offer has one uniformly selected unlocked modifier. Each valid five-step value is equally likely under the confirmed planning rule. Choice policy remains a time/points heuristic. Clue, XP and superior bonuses are recorded but do not simulate XP or superior loot.`);
  const rewardUnknown=[...new Set([plan.master,filler.master,...(pending?[pending.master]:[])].flatMap(master=>pointRewardUnknown(master,p)))];
  if(rewardUnknown.length&&p.assumeUnknown)notes.push('Conditional reward assumption: '+rewardUnknown.join(', ')+' treated as completed. Confirm diaries for exact rewards.');
  if(p.cape)notes.push('Cape repeats are always accepted in this scenario. They use the last assigned task from the same master, including after a paid skip; Konar location compatibility is retained. Optimal accept/decline decisions are not modelled.');
  if(p.strategy.startsWith('boost'))notes.push('Boosting uses the normal completion streak: paid skips do not advance the milestone. The filler master uses recorded actual blocks unless its block group is shared with the proposed milestone list. Rewards are credited only for completed tasks; the 1000-completion point rate excludes the fresh-streak warm-up.');
  if(p.goal.kind==='offer')notes.push('An offered target ends the hunt before combat; its future completion reward is not earned.');
  if(p.strategy==='reset-turael')notes.push('Turael replacements use the recorded actual beginner block list; no automatic or proposed filler blocks are purchased. Only the cancelled master’s streak is reset. Turael completion then increments the normal streak. Reset timing uses seconds per reset, each task request, and configured Turael combat/travel rates.');
  if(p.goal.kind==='drop')notes.push('Drop goal includes the selected direct per-kill drop only. Superior spawns and their separate drop tables are not included.');
  return {trials:count,successes:success.length,unresolved,meanHours:unresolved?null:success.reduce((s,t)=>s+t.hours,0)/count,medianHours:quantile(.5),p90Hours:quantile(.9),sessionChance:hit/count,sessionInterval:[wilson(hit,count)[0],wilson(hit+trials.filter(t=>!t.success&&t.hours<p.simulation.sessionHours).length,count)[1]],exhaustionChance:trials.filter(t=>t.exhausted).length/count,meanSpent:trials.reduce((s,t)=>s+t.spent,0)/count,meanRemaining:trials.reduce((s,t)=>s+t.remaining,0)/count,meanEarned:trials.reduce((s,t)=>s+t.earned,0)/count,curve,seed:p.simulation.seed,notes,trace:trials[0]?.trace||[]};
}
function runTrial(data:Catalogue,plan:Plan,filler:Plan,p:Profile,rng:()=>number,record:boolean,fallback:Map<Row,Row>,pendingPlan?:Plan):Trial{
  const l=ledger(p),trace:string[]=[];let minutes=0,exhausted=false,progress=0,nextFiller=false,previous:Option|undefined;
  const add=(message:string)=>{if(record&&trace.length<40)trace.push(`${minutes.toFixed(1)} min · ${message} · ${l.points.toFixed(0)} points`);};
  const result=(success:boolean):Trial=>({success,hours:minutes/60,exhausted,spent:l.spent,remaining:l.points,earned:l.earned,trace});
  if(p.applySetup&&!pay(l,plan.setupCost,p.reserve)){add('Cannot afford block setup');return result(false);}
  if(p.cape&&p.previousTask&&p.previousMasterId){
    const master=data.masters.find(m=>m.id===p.previousMasterId)!;
    const rows=prepareRows(data,master,p),row=rows.find(r=>r.id===p.previousTask);
    if(row){const target=actualTarget(row,p.previousTargetCompatible,'previous'),other=completionFallbacks(data,master,p,rows).get(row)||row;previous={row:target?row:other,masterId:master.id,kind:'none',points:0,quantity:0,target};}
  }
  if(p.current.kind==='task'){
    const currentMaster=data.masters.find(m=>m.id===p.current.masterId)!;
    const currentRows=prepareRows(data,currentMaster,p),original=currentRows.find(r=>r.id===p.current.assignmentId);
    const target=original?actualTarget(original,p.current.targetCompatible,'current'):false;
    const row=original&&!target?(completionFallbacks(data,currentMaster,p,currentRows).get(original)||original):original;
    if(!row){add('Current task has no valid completion method');return result(false);}
    if(shouldReset(currentMaster,row,p,filler.master)){
      resetStreak(l,currentMaster);minutes+=p.skipSeconds/60;nextFiller=true;add(`Reset current ${row.name}; ${currentMaster.streakGroup} streak reset`);
    }else{
      if(row.methodReason){add('Current task has no valid completion method');return result(false);}
      if(target&&p.goal.kind==='offer'){add('Target task already assigned');return result(true);}
      const actual=sampleKills(p.current.remaining,row.method,rng);
      const done=finishCombat(row,actual,target,p,rng,progress);
      minutes+=row.method.travel+combatSeconds(done.kills,row.method,row.seconds)/60;progress=done.progress;
      if(!done.success||done.kills===actual)complete(l,currentMaster,p,row.entry,p.current.modifier,p.current.modifierPoints);
      if(done.success){add('Goal reached during current task'+(done.kills===actual?'; task completion rewarded':''));return result(true);}
      previous={row,masterId:currentMaster.id,kind:p.current.modifier||'none',points:p.current.modifierPoints??0,quantity:0,target};
      add('Completed current assignment');
    }
  }
  for(let offer=0;offer<p.simulation.horizonOffers;offer++){
    const boost=p.strategy.startsWith('boost')&&((l.streaks.normal||0)+1)%p.milestone!==0;
    const pending=offer===0&&p.current.kind==='offer';
    const current=pending?pendingPlan!:(nextFiller||boost?filler:plan);nextFiller=false;
    const m=current.master,rows=current.rows.filter(r=>!r.reason&&(pending||!r.blocked));
    if(!rows.length){add('No eligible assignments');return result(false);}
    if(!(offer===0&&p.current.kind==='offer'))minutes+=p.requestMinutes;
    const repeat=p.cape&&previous?.masterId===m.id&&rows.some(r=>r.id===previous!.row.id)&&rng()<.1;
    const supplied=pending?p.current.options!.map(o=>{const row=rows.find(r=>r.id===o.assignmentId);if(!row)throw Error('Pending offer is not eligible under this setup.');if(row.isTarget&&o.target&&row.targetFraction<=0)throw Error('This pending option cannot fulfil the target variant.');const target=row.isTarget&&o.target,other=!target?(fallback.get(row)||row):row;return {row:{...other,blocked:false},masterId:m.id,kind:o.modifier,points:o.points,quantity:o.quantity,target};}):null;
    const offered=supplied|| (repeat?[previous!]:sampleOffer(rows,m.id==='mortimer'?choices({...p,mortimerTasks:l.mortimerTasks}):1,rng).map(row=>makeOption(row,m,p,l,rng,fallback)));
    const targets=offered.filter(o=>o.target);
    const chosen=(targets.length?targets:offered).reduce((a,b)=>score(a,p,m)<score(b,p,m)?a:b);
    previous=chosen;
    if(chosen.target&&p.goal.kind==='offer'){add(`Target offered: ${chosen.row.variant.name} (${modifierLabel(chosen)})`);return result(true);}
    const fraction=paidSkipFraction(chosen.row,p);
    const skip=!chosen.target&&fraction>0&&(fraction>=1||rng()<fraction);
    if(!chosen.target&&shouldReset(m,chosen.row,p,filler.master)){
      resetStreak(l,m);minutes+=p.skipSeconds/60;nextFiller=true;add(`Reset ${chosen.row.name}; ${m.streakGroup} streak reset`);continue;
    }
    if(skip){
      if(pay(l,m.skipCost,p.reserve)){minutes+=p.skipSeconds/60;add(`Skipped ${chosen.row.name}`);continue;}
      exhausted=true;add(`Skip unaffordable; complete ${chosen.row.name} instead`);
    }
    if(chosen.row.methodReason){add('Chosen method is not available');return result(false);}
    const quantity=sampleQuantity(chosen.row.entry,chosen.row.method,rng,chosen.kind==='quantity'?chosen.quantity:0);
    const kills=sampleKills(quantity,chosen.row.method,rng);
    const done=finishCombat(chosen.row,kills,chosen.target,p,rng,progress);progress=done.progress;
    minutes+=chosen.row.method.travel+combatSeconds(done.kills,chosen.row.method,chosen.row.seconds)/60;
    if(!done.success||done.kills===kills)complete(l,m,p,chosen.row.entry,chosen.kind,chosen.points);
    if(done.success){add(`Goal reached at ${chosen.row.variant.name}${done.kills===kills?'; task completion rewarded':''}`);return result(true);}
    add(`Completed ${chosen.row.name} (${modifierLabel(chosen)})`);
  }
  add('Offer horizon reached');return result(false);
}

function score(o:Option,p:Profile,m:Master):number{
  const priority=p.goal.targets.find(t=>t.assignmentId===o.row.id&&t.variantId===o.row.variant.id)?.priority||1;
  if(o.target)return -1e9*priority+o.row.seconds;
  return Math.max(.01,o.row.minutes+(o.kind==='quantity'?o.quantity*o.row.seconds/60:0))/(1+o.points/Math.max(1,m.skipCost));
}
function makeOption(row:Row,m:Master,p:Profile,l:Ledger,rng:()=>number,fallback:Map<Row,Row>):Option{
  let kind='none',points=0,quantity=0,modifierValue:number|null|undefined;
  if(m.id==='mortimer'){
    const roll=rollMortimer(row.id,l.mortimerTasks,rng);kind=roll.kind;modifierValue=roll.value;
    if(kind==='points')points=roll.value??0;
    if(kind==='quantity')quantity=roll.value??0;
  }
  const target=row.isTarget&&rng()<row.targetFraction;
  return {masterId:m.id,row:row.isTarget&&!target?(fallback.get(row)||row):row,kind,points,quantity,target,modifierValue};
}
function modifierLabel(o:Option):string{
  if(o.modifierValue===undefined)return o.kind;
  if(o.modifierValue===null)return o.kind+'; no numeric range published';
  const unit=o.kind==='quantity'?' kills':o.kind==='points'?' points':'%';
  return o.kind+' '+(o.modifierValue>0&&o.kind!=='points'?'+':'')+o.modifierValue+unit;
}
function finishCombat(row:Row,kills:number,target:boolean,p:Profile,rng:()=>number,progress:number):{success:boolean;kills:number;progress:number}{
  if(!target)return {success:false,kills,progress};
  if(p.goal.kind==='kills'){
    const needed=Math.max(0,p.goal.quantity-progress);return {success:kills>=needed,kills:Math.min(kills,needed),progress:progress+Math.min(kills,needed)};
  }
  if(p.goal.kind==='drop'){
    const probability=p.goal.customDropRate??row.variant.drops.find(d=>d.id===p.goal.dropId)?.onTask;
    if(probability===undefined||probability<=0)throw Error(`No positive drop probability for ${row.variant.name}. Select a sourced drop or supply an explicit custom rate.`);
    const until=probability===1?1:Math.max(1,Math.ceil(Math.log(1-rng())/Math.log(1-probability)));
    return {success:until<=kills,kills:Math.min(kills,until),progress};
  }
  return {success:false,kills,progress};
}
