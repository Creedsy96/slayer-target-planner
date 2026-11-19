import {MORTIMER_RULES,mortimerKinds,modifierValues,type Mortifier} from '../rules/mortimer';
import type {Profile} from '../domain/types';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const names:Record<Mortifier,string>={points:'Points',quantity:'Quantity',clue:'Clue',superior:'Superior unique',xp:'Slayer XP'};
const percent=(value:number)=>(value*100).toFixed(2).replace(/\.00$/,'')+'%';

export function renderMortimerSummary(p:Profile):string{
  const kinds=p.mortimerTasks===null?null:mortimerKinds(p.mortimerTasks);
  return `<div class="notice"><strong>Every Mortimer option has a modifier.</strong> ${kinds?`${kinds.length} unlocked types: ${kinds.map(k=>names[k]).join(', ')} · ${percent(1/kinds.length)} each.`:'Enter completed Mortimer tasks to determine the unlocked types.'} Values are equally likely in five-step increments. <button data-action="mortimer-rules">Modifier probabilities & ranges</button></div>`;
}

function rangeCell(bounds:number[]|null,kind:Mortifier):string{
  if(bounds===null)return '<span class="muted">N/A</span>';
  const values=modifierValues(bounds),unit=kind==='quantity'?' kills':kind==='points'?' points':'%';
  const number=(n:number)=>(n<0?'−':kind==='quantity'?'+':'')+Math.abs(n);
  return `${number(bounds[0])} to ${number(bounds[1])}${unit}<small>${values.length} values · ${percent(1/values.length)} each</small>`;
}

export function renderMortimerRules(p:Profile):string{
  const active=p.mortimerTasks===null?[]:mortimerKinds(p.mortimerTasks);
  const source=MORTIMER_RULES.source;
  return `<section class="card" id="mortimer-modifiers"><h2>Mortimer modifier rules</h2>${renderMortimerSummary(p)}<p>Each offered task receives one modifier. The type is chosen equally from the unlocked categories; different options can have the same type. A third task choice unlocks at ${MORTIMER_RULES.thirdChoiceAt} completed tasks.</p><div class="chips">${MORTIMER_RULES.categories.map(c=>`<span class="chip">${names[c.kind]} · ${c.tasks} tasks · ${p.mortimerTasks===null?'progress unknown':active.includes(c.kind)?percent(1/active.length):'locked'}</span>`).join('')}</div><p>Ranges below use increments of ${MORTIMER_RULES.step}. The per-value probabilities are <strong>within that modifier type</strong>; multiply by the type's chance for the probability on an offered task. Quantity changes are flat kills. Percentage columns are bonus percentages.</p><p class="small muted">Value model: equally likely discrete values, as confirmed for this planner. N/A is retained where no numeric bonus range is published; it does not create a new modifier exclusion rule. Simulations apply quantity and point rolls; XP, clue and superior bonus values are recorded but do not add XP or superior-loot calculations.</p><p><a href="${esc(source.url)}?oldid=${source.revision}" target="_blank" rel="noopener">Wiki range table (revision ${source.revision})</a> · <a href="${esc(MORTIMER_RULES.officialSource.url)}" target="_blank" rel="noopener">Jagex rules and balancing update</a></p><div class="tablewrap data-list"><table><thead><tr><th>Task</th><th>Quantity adjustment</th><th>Reward points</th><th>Clue bonus</th><th>Slayer XP bonus</th><th>Superior unique bonus</th></tr></thead><tbody>${MORTIMER_RULES.tasks.map(t=>`<tr><td>${esc(t.name)}</td>${(['quantity','points','clue','xp','superior']as Mortifier[]).map(k=>`<td>${rangeCell(t[k],k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="small muted">Mortimer rules ${MORTIMER_RULES.version}. The July 27 Venator superior-bonus update (200–300%) takes precedence over the older table in the same Jagex post and matches the pinned Wiki row.</p></section>`;
}
