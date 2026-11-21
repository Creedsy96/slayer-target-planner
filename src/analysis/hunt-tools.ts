import type {Catalogue,Plan,Profile,Row} from '../domain/types';
import {paidSkipFraction,shouldReset,skipPreference} from '../rules/task-policy';
import {evaluate} from './planner';

export function taskAdvice(data:Catalogue,plan:Plan,p:Profile,row:Row):{action:string;detail:string}{
  if(row.reason)return {action:'Unavailable',detail:row.reason};
  if(row.blocked)return {action:'Block',detail:'Excluded by this proposed block list.'};
  if(row.isTarget&&row.locationOutcomes&&row.targetFraction<1)return {action:'Check offered location',detail:`Only ${(row.targetFraction*100).toFixed(1)}% of the available assignment locations support a selected target. Check Konar’s location roll below for each area's creature and skip/reset/completion action. Saved keep/protect preferences apply to every location.`};
  if(row.isTarget&&plan.master.id==='konar'&&row.targetFraction>0&&row.targetFraction<1&&shouldReset(plan.master,{...row,isTarget:false},p,data.masters.find(m=>m.id==='turael')!))return {action:'Check offered location',detail:`Keep this offer if its location supports your target variant (${(row.targetFraction*100).toFixed(1)}% of locations in this scenario). Otherwise reset it through Turael under this policy. Your keep/protect preferences take priority.`};
  if(row.isTarget)return {action:'Complete target',detail:row.methodReason||'Protected hunt target. Keep the assignment; confirm its offered location can satisfy the selected variant.'};
  if(p.preferences[row.id]==='keep'||p.preferences[row.id]==='protect')return {action:'Complete',detail:'Your keep/protect preference takes priority.'};
  if(shouldReset(plan.master,row,p,data.masters.find(m=>m.id==='turael')!))return {action:'Reset',detail:'Replace through Turael. This resets the selected master’s streak; complete the replacement task.'};
  const fraction=paidSkipFraction(row,p),saved=Math.max(0,row.minutes-p.skipSeconds/60);
  if(fraction>1e-9)return {action:fraction>=1-1e-9?'Skip':`Skip ${(fraction*100).toFixed(1)}%`,detail:`${skipPreference(p,row)?'Saved skip preference.':'Time saved per point spent or foregone determines the automatic order.'} About ${saved.toFixed(1)} minutes saved per skip; costs ${plan.master.skipCost} points and forgoes an estimated ${row.reward.toFixed(1)} completion points. ${fraction<1-1e-9?'Complete remaining offers to balance the budget. ':''}Paid skips preserve the reserve.${row.methodReason?' Completion fallback needs a valid method: '+row.methodReason:''}`};
  return {action:'Complete',detail:row.methodReason|| (p.strategy==='none'?'Skipping is disabled.':p.objective==='points'?'Point-saving objective keeps automatic paid skips off.':'Completing this task funds skips or takes less time than skipping.')};
}
export function fundingForecast(plan:Plan,p:Profile){
  const setup=p.applySetup?plan.setupCost:0;
  const spendable=p.points===null?null:Math.max(0,p.points-setup-p.reserve);
  return {setup,spendable,affordable:spendable===null?null:plan.master.skipCost?Math.floor(spendable/plan.master.skipCost):null,
    setupAffordable:p.points===null?null:p.points-setup>=p.reserve,
    drift:plan.pointsEarned===null||plan.pointsSpent===null?null:plan.pointsEarned-plan.pointsSpent};
}
export function blockPreview(data:Catalogue,plan:Plan,p:Profile){
  const actual=p.blocks[plan.master.group]||[],added=plan.blocks.filter(id=>!actual.includes(id)),removed=actual.filter(id=>!plan.blocks.includes(id));
  const scenario={...p,applySetup:false};
  const before=evaluate(data,plan.master,scenario,actual),after=evaluate(data,plan.master,scenario,plan.blocks);
  return {added,removed,cost:added.length*plan.master.blockCost,before,after,
    minutesSaved:before.hours!==null&&after.hours!==null?(before.hours-after.hours)*60:null,
    chanceGain:before.chance!==null&&after.chance!==null?after.chance-before.chance:null};
}
