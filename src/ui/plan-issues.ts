import type {Catalogue,Plan,Profile} from '../domain/types';
import {explainPlanIssues} from '../analysis/plan-issues';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function renderPlanIssues(data:Catalogue,plan:Plan,p:Profile,expanded=false):string{
  const issues=explainPlanIssues(data,plan,p);if(!issues.length)return '';
  return `<details class="plan-issues" ${expanded?'open':''}><summary>${plan.reason?'Why unavailable?':'Assumptions to review'} (${issues.length})</summary><ul class="plan-issue-list">${issues.map(issue=>{
    const source=issue.source.url+(issue.source.revision?(issue.source.url.includes('?')?'&':'?')+'oldid='+issue.source.revision:'');
    return `<li><strong>${esc(issue.title)}</strong><p>${esc(issue.detail)}</p><div class="tools"><button data-issue-route="${issue.route}" data-issue-master="${plan.master.id}" data-issue-assignment="${esc(issue.assignmentId)}" data-issue-variant="${esc(issue.variantId)}" data-issue-filter="${esc(issue.filter)}" data-issue-field="${esc(issue.field)}">${esc(issue.action)}</button><a href="${esc(source)}" target="_blank" rel="noopener">Wiki source: ${esc(issue.source.title)}</a></div></li>`;
  }).join('')}</ul></details>`;
}

export function planIssueTooltip(plan:Plan):string{
  return [plan.reason,...plan.unknown.slice(0,5)].filter(Boolean).join('\n')||'Calculated from the current profile and methods.';
}
