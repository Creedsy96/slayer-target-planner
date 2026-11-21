import type {Catalogue,Plan,Profile} from '../domain/types';
import {requiredTargetUnlocks} from '../analysis/target-unlocks';
import {canRankPlan} from './planner-ranking';
import {assignmentName} from './creature-art';
import {escapeHtml as esc} from './html';

export function canShowAvailableMaster(data:Catalogue,plan:Plan|undefined,p:Profile):boolean{
  return !!plan&&(canRankPlan(plan,p)||requiredTargetUnlocks(data,plan,p).length>0);
}
export function masterOptionLabel(data:Catalogue,plan:Plan,p:Profile):string{
  const unlocks=requiredTargetUnlocks(data,plan,p);
  return plan.master.name+(unlocks.length?' — Requires '+unlocks.map(u=>u.label).join(', '):plan.reason?' — review issues':'');
}
export function renderTargetUnlockWarning(data:Catalogue,plan:Plan,p:Profile,compact=false):string{
  const unlocks=requiredTargetUnlocks(data,plan,p);if(!unlocks.length)return '';
  return `<div class="target-unlock-warning" role="note"><strong>Master available</strong>${unlocks.map(u=>`<p>Requires <strong>${esc(u.label)}</strong> for ${u.assignments.map(id=>assignmentName(data,id)).join(', ')}.</p><button class="text-button" data-issue-route="account" data-issue-unlock="${esc(u.key)}" data-issue-filter="${esc(u.label)}">Review ${esc(u.label)}</button>`).join('')}${compact?'':`<p class="small">${plan.chance===null?'Purchase the required reward in game, then record it as owned to calculate this target’s hunt.':'Current estimates include only targets permitted by your recorded rewards and assumptions.'} Reviewing the reward does not purchase or enable it.</p>`}</div>`;
}
export function renderMasterStatus(data:Catalogue,plan:Plan,p:Profile):string{
  return renderTargetUnlockWarning(data,plan,p,true)||`<small>${esc(plan.reason||(p.objective==='kills-hour'&&plan.targetRateReason)||plan.unknown.length+' unconfirmed facts')}</small>`;
}
export function renderUnlockHuntNotice():string{
  return '<div class="notice"><strong>Your target requires a Slayer unlock.</strong><p>Available masters remain selectable below. Review the highlighted reward and record it only after purchasing it in game; this target’s odds and KPH remain pending until then.</p></div>';
}
export function renderPlanCosts(data:Catalogue,plan:Plan,p:Profile):string{
  if(plan.chance===null&&requiredTargetUnlocks(data,plan,p).length)return '<td>—</td><td>—</td><td>—</td>';
  const points=plan.pointsEarned===null||plan.pointsSpent===null?'Use simulation':plan.pointsEarned.toFixed(1)+' earned<br>'+plan.pointsSpent.toFixed(1)+' spent';
  return `<td>${plan.blocks.length}</td><td>${plan.setupCost}</td><td>${points}</td>`;
}
