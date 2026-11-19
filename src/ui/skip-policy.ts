import type {Catalogue,Plan,Profile} from '../domain/types';
import {skipRecommendations} from '../analysis/skip-policy';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderSkipPolicy(data:Catalogue,plan:Plan,p:Profile):string{
  if(plan.reason&&plan.reason!=='Cape repeat policies require simulation; analytical ranking is unavailable.')return '<h3>Skip policy</h3><p class="small muted">Resolve the plan issues above to see skip recommendations.</p>';
  const {full,partial,resets}=skipRecommendations(data,plan,p);
  const manual=full.some(item=>item.manual);
  return `<div class="skip-policy"><h3>Skip policy</h3><p>${(plan.skipRate*100).toFixed(1)}% of offers skipped in the stationary model.</p>
    <h4>Skip whenever affordable (${full.length})</h4>
    ${full.length?`<ul class="skip-list">${full.map(({row,manual})=>`<li>${esc(row.name)}${manual?' <span class="badge">Saved preference</span>':''}</li>`).join('')}</ul>`:'<p class="small muted">No fully skipped tasks.</p>'}
    ${partial.length?`<h4>Sometimes skip (${partial.length})</h4><ul class="skip-list">${partial.map(({row,fraction})=>`<li>${esc(row.name)} <strong>${(fraction*100).toFixed(1)}%</strong> of its offers</li>`).join('')}</ul><p class="small muted">These frequencies balance the long-run point budget; complete the remaining offers.</p>`:''}
    ${resets.length?`<h4>Reset through Turael (${resets.length})</h4><ul class="skip-list">${resets.map(row=>`<li>${esc(row.name)}</li>`).join('')}</ul><p class="small muted">Resets change the selected master's streak. Complete the replacement Turael task.</p>`:''}
    ${!full.length&&!partial.length&&!resets.length?'<p>No tasks to skip under this policy.</p>':''}
    <p class="small muted">Paid skips must preserve your point reserve. Protected target assignments are never skipped.${manual?' Saved skip/avoid preferences also apply in simulation and may differ from the stationary estimate.':''}${p.strategy.startsWith('boost')?' This list covers the selected master; filler tasks are completed between milestones.':''}${plan.master.id==='mortimer'?' With multiple choices, choose a compatible target first; otherwise the simulation compares the offered options.':''}</p></div>`;
}
