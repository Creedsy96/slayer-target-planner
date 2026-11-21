import type {Catalogue,Plan,Profile} from '../domain/types';
import {taskAdvice} from '../analysis/hunt-tools';
import {configuredMethod} from '../combat/priority';
import {creatureName,assignmentName} from './creature-art';
import {escapeHtml as esc} from './html';

export function renderKonarLocations(data:Catalogue,plan:Plan,p:Profile):string{
  if(plan.master.id!=='konar')return '';
  const targets=plan.rows.filter(r=>r.isTarget&&r.locationOutcomes);
  return `<div class="notice konar-locations"><h3>Konar’s location roll</h3><p>Model assumption: each available assignment location is equally likely after the creature assignment is rolled. A location with another variant stays in the pool. Only matching rolls count toward your target chance and target kills per hour.</p>${targets.map(row=>{
    const outcomes=row.locationOutcomes!,count=new Set(outcomes.map(o=>o.location)).size,matching=new Set(outcomes.filter(o=>o.row.isTarget).map(o=>o.location)).size;
    const custom=p.goal.targets.filter(t=>t.assignmentId===row.id).some(t=>configuredMethod(data,p,row.id,t.variantId).locationChance!==null);
    return `<h4>${assignmentName(data,row.id)}: ${matching}/${count} compatible locations · ${(row.targetFraction*100).toFixed(1)}%</h4>${custom?'<p class="small">Custom location probability override is saved for this target; the percentages below show the scenario weights.</p>':''}<div class="table-scroll"><table><thead><tr><th>Assigned location</th><th>Chance</th><th>Creature used</th><th>Action</th></tr></thead><tbody>${outcomes.map(o=>`<tr><td>${esc(o.location)}</td><td>${(o.weight*100).toFixed(1)}%</td><td>${creatureName(o.row.variant.id,o.row.variant.name)}</td><td>${o.row.isTarget?'✓ Target':esc(taskAdvice(data,plan,p,o.row).action)}</td></tr>`).join('')}</tbody></table></div>${row.locationExcluded?.length?`<p class="small muted">Excluded by confirmed access or assignment requirements: ${row.locationExcluded.map(esc).join(', ')}.</p>`:''}`;
  }).join('')}<details><summary>Other Konar assignments and locations</summary>${plan.rows.filter(r=>!r.isTarget&&r.locationOutcomes&&!r.reason&&!r.blocked).map(row=>`<details><summary>${assignmentName(data,row.id)} · ${row.locationOutcomes!.length} locations</summary><ul>${row.locationOutcomes!.map(o=>`<li>${esc(o.location)}: ${creatureName(o.row.variant.id,o.row.variant.name)} · ${esc(taskAdvice(data,plan,p,o.row).action)}</li>`).join('')}</ul></details>`).join('')}</details><p class="small muted">Unknown access remains conditional. The generic boss assignment has a separate boss roll and is not treated as a uniform location pool. <a href="https://oldschool.runescape.wiki/w/Konar_quo_Maten#Tasks" target="_blank" rel="noreferrer">Konar task and location source</a></p></div>`;
}
