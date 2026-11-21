import type {Plan,Profile} from '../domain/types';
import {escapeHtml as esc} from './html';
import {extensionDifference} from './task-extensions';

export function targetRateDescription(plan:Plan,p:Profile):string{
  if(plan.targetRateReason)return plan.targetRateReason;
  if(plan.targetKillsPerHour==null)return 'A target kill-rate estimate is not available.';
  const schedule=plan.boost?' Includes milestone and filler-master tasks over a complete repeating schedule.':plan.reset?' Includes Turael resets and replacement tasks.':'';
  const funding=p.strategy==='funded'?' Unlimited-funds benchmark; your finite balance can run out.':' Finite point balances and starting streaks can change a particular hunt.';
  return 'Estimated selected target creatures killed per hour over repeated full tasks, including target combat, intervening tasks, requests, skips and travel/banking. Compatible location chances, quantities, extensions, bracelets and configured combat timing are included.'+schedule+funding+' This is a long-run comparison, not kills before an offer/drop goal stops.'+(plan.unknown.length?' Conditional on the listed assumptions.':'');
}

export function renderTargetRateCell(plan:Plan,p:Profile):string{
  const rate=plan.targetKillsPerHour,label=rate==null?'—':rate.toFixed(1);
  const comparisons=plan.extensions?.filter(c=>c.quantities.length)||[];
  const extension=rate!=null&&comparisons.length===1&&comparisons[0].extendedRate!==null&&comparisons[0].normalRate!==null?`<small>${comparisons[0].enabled?'Extended · vs normal':'If extended: '+comparisons[0].extendedRate!.toFixed(1)} · ${extensionDifference(comparisons[0])}</small>`:'';
  return `<td class="target-kill-rate" title="${esc(targetRateDescription(plan,p))}">${label}${rate!=null&&p.strategy==='funded'?'<small>Unlimited funds</small>':''}${extension}</td>`;
}
