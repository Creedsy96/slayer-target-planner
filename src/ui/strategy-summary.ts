import type {Catalogue,Plan,Profile} from '../domain/types';
import {escapeHtml as esc} from './hunt-tools';
export function offerTimeLabel(p:Profile):string{
  return p.strategy.startsWith('boost')?'Boost schedule time to target offer':p.strategy==='funded'?'Offer time with unlimited points':p.strategy==='reset-turael'?'Reset time to target offer':'Stationary time to target offer';
}
export function renderBoostEstimate(data:Catalogue,plan:Plan):string{
  const b=plan.boost;if(!b)return '';
  const filler=data.masters.find(m=>m.id===b.fillerId)?.name||b.fillerId;
  return `<div class="notice"><h3>Boost schedule and rewards</h3><p>From a fresh request at normal streak ${b.startStreak}: Complete ${b.fillerCompletionsBeforeMain} ${esc(filler)} tasks before the next ${esc(plan.master.name)} request, for completion #${b.nextMainCompletion}. Completing that milestone task awards <strong>${b.nextMainReward} points</strong>; merely receiving it earns none.</p><p>The estimate includes filler requests, combat/travel and the current completion-count phase. Paid skips do not advance the schedule. Filler blocks: ${b.fillerBlocks.length} recorded actual blocks${plan.master.group===data.masters.find(m=>m.id===b.fillerId)?.group?' (shared with this proposed list)':''}.</p><p class="small muted">The point-farming rate covers both masters over a full 1,000-completion reward cycle (${b.rewardPer1000.toFixed(0)} points). It excludes the first four unrewarded tasks of a fresh streak. Simulate for actual funds, the current task, cape effects and the selected hunt stopping event.</p><button data-issue-route="tasks" data-issue-master="${esc(b.fillerId)}">Review filler blocks and methods</button></div>`;
}
