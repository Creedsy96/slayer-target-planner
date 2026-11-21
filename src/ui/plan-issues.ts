import type {Catalogue,Plan,Profile} from '../domain/types';
import {explainPlanIssues} from '../analysis/plan-issues';
import {requiredTargetUnlocks} from '../analysis/target-unlocks';
import {masterEligibility} from '../rules/eligibility';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function renderPlanIssues(data:Catalogue,plan:Plan,p:Profile,expanded=false):string{
  const issues=explainPlanIssues(data,plan,p);if(!issues.length)return '';
  return `<details class="plan-issues" ${expanded?'open':''}><summary>${requiredTargetUnlocks(data,plan,p).length?'Requirements to review':plan.reason?'Why unavailable?':'Assumptions to review'} (${issues.length})</summary><ul class="plan-issue-list">${issues.map(issue=>{
    const source=issue.source.url+(issue.source.revision?(issue.source.url.includes('?')?'&':'?')+'oldid='+issue.source.revision:'');
    return `<li><strong>${esc(issue.title)}</strong><p>${esc(issue.detail)}</p><div class="tools"><button data-issue-route="${issue.route}" data-issue-master="${plan.master.id}" data-issue-assignment="${esc(issue.assignmentId)}" data-issue-variant="${esc(issue.variantId)}" data-issue-filter="${esc(issue.filter)}" data-issue-field="${esc(issue.field)}">${esc(issue.action)}</button><a href="${esc(source)}" target="_blank" rel="noopener">Wiki source: ${esc(issue.source.title)}</a></div></li>`;
  }).join('')}</ul></details>`;
}

export function planIssueTooltip(plan:Plan):string{
  return [plan.reason,...plan.unknown.slice(0,5)].filter(Boolean).join('\n')||'Calculated from the current character and methods.';
}

/** Keep an actionable explanation visible even while unavailable rows are hidden. */
export function renderUnavailableHunt(data:Catalogue,plans:Plan[],p:Profile):string{
 const relevant=plans.filter(plan=>plan.rows.some(row=>row.isTarget));
 const candidates=(relevant.length?relevant:plans).slice().sort((a,b)=>{
  const score=(plan:Plan)=>{const access=masterEligibility(plan.master,p);return plan.unknown.length+plan.conflicts.length*10+access.unknown.length*10+access.failed.length*1000+(plan.rows.some(r=>r.isTarget&&!r.reason&&!r.methodReason&&r.targetFraction>0)?0:1000);};
  return score(a)-score(b)||data.masters.findIndex(m=>m.id===a.master.id)-data.masters.findIndex(m=>m.id===b.master.id);
 });
 const plan=candidates[0];if(!plan)return '';
 return `<section class="notice hunt-requirements" aria-labelledby="hunt-requirements-title"><h2 id="hunt-requirements-title">What needs attention</h2><p>${esc(plan.master.name)}: ${esc(plan.reason||'Review the account facts below.')}</p><p>Missing account facts stay unknown. Import your quest export or confirm the listed requirements; combat levels and bank gear do not establish quest completion or purchased rewards.</p>${renderPlanIssues(data,plan,p,true)}<div class="tools"><button data-route="account">Import quests / review account facts</button><button data-route="tasks">Review blocks</button></div></section>`;
}
