import type {Plan,Profile} from '../domain/types';
import {offerTimeLabel} from './strategy-summary';
import {escapeHtml as esc} from './html';

export function canRankPlan(plan:Plan|undefined,p:Profile):boolean{
  if(!plan)return false;
  return p.objective==='kills-hour'?!plan.reason&&Number.isFinite(plan.objectiveValue)&&plan.targetKillsPerHour!==null&&plan.targetKillsPerHour>0:plan.chance!==null;
}
export function recommendedPlan(plans:Plan[],p:Profile):Plan|undefined{
  return plans.filter(plan=>canRankPlan(plan,p)).sort((a,b)=>a.objectiveValue-b.objectiveValue||a.master.name.localeCompare(b.master.name))[0];
}
export function renderRecommendationMetric(plan:Plan,p:Profile,formatTime:(hours:number|null)=>string):string{
  if(p.objective==='kills-hour')return `<div class="metric"><small>Target creatures killed per hour</small><strong>${plan.targetKillsPerHour!.toFixed(1)}</strong><span>Full task cycles, including target combat and intervening tasks${p.strategy==='funded'?'; unlimited-funds benchmark':''}.</span></div>`;
  return `<div class="metric"><small>${esc(offerTimeLabel(p))}</small><strong>${formatTime(plan.hours)}</strong><span>Before target combat; not the full funded hunt</span></div>`;
}
