import type {Catalogue,Plan,Profile,Row,Simulation,Master} from '../domain/types';
import {clone} from '../state/profiles';
import {choices,complete,ledger,pay,resetStreak,type Ledger} from '../rules/points';
import {rollMortimer,MORTIMER_VERSION} from '../rules/mortimer';
import {optimise,prepareRows} from './planner';
import {sampleOffer} from './offers';
import {sampleQuantity,sampleKills} from './timing';
import {paidSkipFraction,shouldReset} from '../rules/task-policy';
export function random(seed:number):()=>number{
  let state=seed>>>0;return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}
interface Option {row:Row;kind:string;points:number;quantity:number;target:boolean;modifierValue?:number|null}
interface Trial {success:boolean;hours:number;exhausted:boolean;spent:number;remaining:number;trace:string[]}
export function wilson(successes:number,total:number):[number,number]{
  if(!total)return [0,1];const z=1.95996398454,p=successes/total,d=1+z*z/total;
  const centre=(p+z*z/2/total)/d,half=z*Math.sqrt(p*(1-p)/total+z*z/4/total**2)/d;return [Math.max(0,centre-half),Math.min(1,centre+half)];
}
export function simulate(data:Catalogue,plan:Plan,p:Profile,onProgress?:(done:number)=>void):Simulation{
  if(p.points===null)throw Error('Enter current points before simulating legal funded actions.');
  if(plan.reason&&plan.reason!=='Cape repeat policies require simulation; analytical ranking is unavailable.')throw Error(plan.reason);
  if(p.streaks[plan.master.streakGroup]==null)throw Error('Enter the current '+plan.master.streakGroup+' streak before simulation.');
  if(plan.master.id==='mortimer'&&p.mortimerTasks===null)throw Error('Enter completed Mortimer tasks before simulation.');
  if(p.current.masterId==='mortimer'&&p.current.kind==='task'&&(!p.current.modifier||p.current.modifier==='none'))throw Error('Every Mortimer task has a modifier. Enter the actual current-task modifier.');
  if(p.current.masterId==='mortimer'&&p.current.kind==='offer'&&p.current.options?.some(o=>o.modifier==='none'))throw Error('Every Mortimer offer has a modifier. Enter a modifier for each pending option.');
  if(p.current.kind==='task'&&p.streaks[data.masters.find(m=>m.id===p.current.masterId)!.streakGroup]==null)throw Error('Enter the streak for the current task master.');
  if(p.current.kind==='task'&&p.current.masterId==='mortimer'&&p.current.modifier==='points'&&p.current.modifierPoints===undefined)throw Error('Enter the actual point value on the current Mortimer task.');
  if(p.current.kind==='offer'&&(!p.current.options?.length||p.current.masterId!==plan.master.id))throw Error('Supply the actual pending offer options for this master.');
  if(p.cape&&plan.master.id==='mortimer')throw Error('Mortimer cape repeat modifier behaviour is not verified; disable the cape for this scenario.');
  const fillerId=p.strategy==='boost-mazchna'?'mazchna':'turael';
  const fillerMaster=data.masters.find(m=>m.id===fillerId)!;
  // Filler tasks honour explicit preferences, with automatic skips disabled.
  const fillerProfile={...clone(p),strategy:p.strategy==='none'?'none' as const:'boost-turael' as const};
  const filler=optimise(data,fillerMaster,fillerProfile,1);
  if(p.strategy.startsWith('boost')&&plan.master.streakGroup!=='normal')throw Error('Boosting comparison requires a master in the normal streak group.');
  if((p.strategy.startsWith('boost')||p.strategy==='reset-turael')&&filler.rows.filter(r=>!r.reason&&!r.blocked).length===0)throw Error('No eligible filler tasks.');
  const fallback=new Map<Row,Row>();
  for(const candidate of [plan,filler])if(candidate.master.id==='konar'){const q=clone(p);q.goal.targets=[];for(const row of candidate.rows.filter(r=>r.isTarget))delete q.methods[row.id];const alternatives=prepareRows(data,candidate.master,q);for(const row of candidate.rows){const other=alternatives.find(r=>r.id===row.id);if(other)fallback.set(row,other);}}
  const rng=random(p.simulation.seed),trials:Trial[]=[],count=Math.floor(p.simulation.trials);
  for(let i=0;i<count;i++){
    trials.push(runTrial(data,plan,filler,p,rng,i===0,fallback));
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
  if(p.goal.kind==='drop')notes.push('Drop goal includes the selected direct per-kill drop only. Superior spawns and their separate drop tables are not included.');
  return {trials:count,successes:success.length,unresolved,meanHours:unresolved?null:success.reduce((s,t)=>s+t.hours,0)/count,medianHours:quantile(.5),p90Hours:quantile(.9),sessionChance:hit/count,sessionInterval:[wilson(hit,count)[0],wilson(hit+trials.filter(t=>!t.success&&t.hours<p.simulation.sessionHours).length,count)[1]],exhaustionChance:trials.filter(t=>t.exhausted).length/count,meanSpent:trials.reduce((s,t)=>s+t.spent,0)/count,meanRemaining:trials.reduce((s,t)=>s+t.remaining,0)/count,curve,seed:p.simulation.seed,notes,trace:trials[0]?.trace||[]};
}
function runTrial(data:Catalogue,plan:Plan,filler:Plan,p:Profile,rng:()=>number,record:boolean,fallback:Map<Row,Row>):Trial{
  const l=ledger(p),trace:string[]=[];let minutes=0,exhausted=false,progress=0,nextFiller=false,previous:Option|undefined;
  const add=(message:string)=>{if(record&&trace.length<40)trace.push(`${minutes.toFixed(1)} min · ${message} · ${l.points.toFixed(0)} points`);};
  const result=(success:boolean):Trial=>({success,hours:minutes/60,exhausted,spent:l.spent,remaining:l.points,trace});
  if(p.applySetup&&!pay(l,plan.setupCost,p.reserve)){add('Cannot afford block setup');return result(false);}
  if(p.cape&&p.previousTask){const row=plan.rows.find(r=>r.id===p.previousTask&&!r.reason&&!r.blocked);if(row)previous={row,kind:p.current.modifier||'none',points:0,quantity:0,target:row.isTarget};}
  if(p.current.kind==='task'){
    const currentMaster=data.masters.find(m=>m.id===p.current.masterId)!;
    const row=prepareRows(data,currentMaster,p).find(r=>r.id===p.current.assignmentId);
    if(!row||row.methodReason){add('Current task has no valid completion method');return result(false);}
    if(row.isTarget&&p.goal.kind==='offer'){add('Target task already assigned');return result(true);}
    const actual=sampleKills(p.current.remaining,row.method,rng);
    const done=finishCombat(row,actual,row.isTarget,p,rng,progress);
    minutes+=row.method.travel+done.kills*row.seconds/60;progress=done.progress;
    if(done.success){add('Goal reached during current task');return result(true);}
    complete(l,currentMaster,p,row.entry,p.current.modifier,p.current.modifierPoints);
    const same=plan.rows.find(r=>r.id===row.id);previous=same?{row:same,kind:p.current.modifier||'none',points:p.current.modifierPoints??0,quantity:0,target:same.isTarget}:undefined;
    add('Completed current assignment');
  }
  for(let offer=0;offer<p.simulation.horizonOffers;offer++){
    const boost=p.strategy.startsWith('boost')&&((l.streaks.normal||0)+1)%p.milestone!==0;
    const current=nextFiller||boost?filler:plan;nextFiller=false;
    const m=current.master,rows=current.rows.filter(r=>!r.reason&&!r.blocked);
    if(!rows.length){add('No eligible assignments');return result(false);}
    if(!(offer===0&&p.current.kind==='offer'))minutes+=p.requestMinutes;
    const repeat=p.cape&&previous&&rows.some(r=>r===previous!.row)&&rng()<.1;
    const pending=offer===0&&p.current.kind==='offer';
    const supplied=pending?p.current.options!.map(o=>{const row=rows.find(r=>r.id===o.assignmentId);if(!row)throw Error('Pending offer is not eligible under this setup.');return {row,kind:o.modifier,points:o.points,quantity:o.quantity,target:row.isTarget&&o.target};}):null;
    const offered=supplied|| (repeat?[previous!]:sampleOffer(rows,m.id==='mortimer'?choices({...p,mortimerTasks:l.mortimerTasks}):1,rng).map(row=>makeOption(row,m,p,l,rng,fallback)));
    const targets=offered.filter(o=>o.target);
    const chosen=(targets.length?targets:offered).reduce((a,b)=>score(a,p,m)<score(b,p,m)?a:b);
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
    minutes+=chosen.row.method.travel+done.kills*chosen.row.seconds/60;
    if(done.success){add(`Goal reached at ${chosen.row.variant.name}`);return result(true);}
    complete(l,m,p,chosen.row.entry,chosen.kind,chosen.points);previous=chosen;
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
  return {row:row.isTarget&&!target?(fallback.get(row)||row):row,kind,points,quantity,target,modifierValue};
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
