import type {Catalogue,Plan,Profile} from '../domain/types';
import {assignmentName} from './creature-art';
import {taskAdvice} from '../analysis/hunt-tools';
import {skipRecommendations} from '../analysis/skip-policy';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderSkipPolicy(data:Catalogue,plan:Plan,p:Profile):string{
  if(plan.reason&&plan.reason!=='Cape repeat policies require simulation; analytical ranking is unavailable.')return '<h3>Skip policy</h3><p class="small muted">Resolve the plan issues above to see skip recommendations.</p>';
  const {full,partial,resets}=skipRecommendations(data,plan,p);
  const explanation=(row:typeof plan.rows[number])=>esc(taskAdvice(data,plan,p,row).detail);
  return `<div class="skip-policy"><h3>Skip policy</h3><p>${(plan.skipRate*100).toFixed(1)}% of offers skipped in the stationary model.</p>
    <h4>Skip whenever affordable (${full.length})</h4>
    ${full.length?`<ul class="skip-list">${full.map(({row,manual})=>`<li data-task="${esc(row.id)}"><details class="skip-explanation"><summary title="${explanation(row)}">${assignmentName(data,row.id,row.name)}${manual?' <span class="badge">Saved preference</span>':''}</summary><p>${explanation(row)}</p></details></li>`).join('')}</ul>`:'<p class="small muted">No fully skipped tasks.</p>'}
    ${partial.length?`<h4>Sometimes skip (${partial.length})</h4><ul class="skip-list">${partial.map(({row,fraction})=>`<li data-task="${esc(row.id)}"><details class="skip-explanation"><summary title="${explanation(row)}">${assignmentName(data,row.id,row.name)} <strong>${(fraction*100).toFixed(1)}%</strong> of its offers</summary><p>${explanation(row)}</p></details></li>`).join('')}</ul><p class="small muted">These frequencies balance the long-run point budget; complete the remaining offers.</p>`:''}
    ${resets.length?`<h4>Reset through Turael (${resets.length})</h4><ul class="skip-list">${resets.map(row=>`<li>${assignmentName(data,row.id,row.name)}</li>`).join('')}</ul><p class="small muted">Resets change the selected master's streak. Complete the replacement Turael task.</p>`:''}
    ${!full.length&&!partial.length&&!resets.length?'<p>No tasks to skip under this policy.</p>':''}
    <p class="small muted">Paid skips must preserve your point reserve. Compatible target offers are never skipped.${plan.master.id==='konar'?' Check Konar’s location roll for wrong-location offers and per-area actions.':''} Saved preferences use the same paid-skip rules in estimates and simulation.${p.strategy.startsWith('boost')?' This list covers the selected master; simulate to review filler-master actions between milestones.':''}${plan.master.id==='mortimer'?' With multiple choices, choose a compatible target first; otherwise the simulation compares the offered options.':''}</p></div>`;
}
