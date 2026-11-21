import type {Simulation} from '../domain/types';

export function renderSimulationTotals(result:Simulation):string{
 const w=result.meanWorkload;
 const metrics=[['Total assigned kills',w.assignedKills],['Creatures killed',w.kills],['Tasks completed',w.tasksCompleted],['Tasks skipped',w.tasksSkipped]] as const;
 return `<section aria-label="Simulated hunt totals"><h3>Average totals per hunt</h3><div class="metrics">${metrics.map(([label,value])=>`<div class="metric"><small>${label}</small><strong>${value.toLocaleString('en-GB',{maximumFractionDigits:1})}</strong></div>`).join('')}</div><p class="small muted">Across all ${result.trials.toLocaleString('en-GB')} trials${result.unresolved?', including unfinished hunts at their stopping point':''}. Includes target and non-target tasks, plus boosting/reset filler tasks. Assigned kills are the full counts of tasks taken for combat (remaining count for a starting task); skipped offers and an offer-only target are excluded. Actual kills account for bracelets and stopping mid-task. Skips: ${w.paidSkips.toFixed(1)} paid + ${w.resets.toFixed(1)} Turael resets per hunt.</p></section>`;
}

export function exampleWorkloadText(result:Simulation):string{
 const w=result.exampleWorkload;
 return `Example trial totals: ${w.assignedKills} assigned kills; ${w.kills} creatures killed; ${w.tasksCompleted} tasks completed; ${w.tasksSkipped} tasks skipped (${w.paidSkips} paid, ${w.resets} resets).`;
}
