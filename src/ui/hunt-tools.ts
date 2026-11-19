import type {Catalogue,Plan,Profile,Simulation} from '../domain/types';
import {decorateCreatureText} from './creature-art';
import {enhanceCreaturePickers} from './creature-picker';
import {blockPreview,fundingForecast,taskAdvice} from '../analysis/hunt-tools';
import {timingSuggestion} from '../state/hunts';
export const escapeHtml=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const esc=escapeHtml;
const taskName=(data:Catalogue,id:string)=>data.assignments.find(a=>a.id===id)?.name||id;
const names=(data:Catalogue,ids:string[])=>ids.map(id=>esc(taskName(data,id))).join(', ')||'None';

export function renderHuntNav(data:Catalogue,p:Profile,plans:Plan[],selected:string,compact:boolean,undo:boolean,redo:boolean,presetId:string,desktop:boolean,pin:boolean):string{
  if(compact)return `<div class="hunt-nav compact-nav"><label>Master<select id="hunt-master">${plans.map(plan=>`<option value="${esc(plan.master.id)}" ${plan.master.id===selected?'selected':''}>${esc(plan.master.name)}</option>`).join('')}</select></label><button data-qol="compact">Full planner</button>${desktop?`<button data-qol="pin" aria-pressed="${pin}">${pin?'Unpin window':'Keep on top'}</button>`:''}<button data-qol="undo" ${undo?'':'disabled'}>Undo</button><button data-qol="redo" ${redo?'':'disabled'}>Redo</button></div>`;
  return `<div class="hunt-nav" aria-label="Hunt controls"><label>Master<select id="hunt-master">${plans.map(plan=>`<option value="${esc(plan.master.id)}" ${plan.master.id===selected?'selected':''}>${esc(plan.master.name)}${plan.reason?' — review issues':''}</option>`).join('')}</select></label><button data-qol="comparison">Back to comparison</button><button data-qol="compact">Compact hunt</button><button data-qol="undo" ${undo?'':'disabled'}>Undo</button><button data-qol="redo" ${redo?'':'disabled'}>Redo</button><details class="toolbar-saved"><summary>Saved hunts</summary><div class="saved-hunt-menu"><label>Saved hunt<select id="hunt-preset"><option value="">Choose a hunt…</option>${(p.huntPresets||[]).map(h=>`<option value="${esc(h.id)}" ${h.id===presetId?'selected':''}>${esc(h.name)}</option>`).join('')}</select></label><div class="tools"><button data-qol="save-hunt">Save hunt</button><button data-qol="delete-hunt">Delete saved hunt</button></div></div></details></div>`;
}
export function renderLookup(data:Catalogue,plan:Plan,p:Profile,query:string):string{
  if(!query.trim())return '<p class="small muted">Search an offered assignment or monster variant to see what to do.</p>';
  const warning=plan.reason?`<p class="notice">Resolve this plan issue before following recommendations: ${esc(plan.reason)}</p>`:'';
  const matches=plan.rows.filter(r=>(r.name+' '+r.variant.name).toLowerCase().includes(query.trim().toLowerCase()));
  if(!matches.length)return '<p>No matching assignments from this master.</p>';
  return `${warning}${matches.length>10?'<p>Showing the first 10 matches. Refine your search.</p>':''}${matches.slice(0,10).map(row=>{
    const advice=taskAdvice(data,plan,p,row);
    return `<article class="lookup-result"><strong>${esc(row.name)} · ${esc(advice.action)}</strong><p>${esc(advice.detail)}</p><p class="small muted">Completion method: ${esc(row.variant.name)} · ${row.minutes.toFixed(1)} estimated minutes.</p><div class="tools"><button data-qol="record-task" data-task="${esc(row.id)}" data-record-action="complete" ${row.reason?'disabled':''}>Record completed task</button><button data-qol="record-task" data-task="${esc(row.id)}" data-record-action="skip" ${row.reason?'disabled':''}>Record paid skip</button></div></article>`;
  }).join('')}`;
}
export function renderForecast(plan:Plan,p:Profile,result:Simulation|null):string{
  const f=fundingForecast(plan,p);
  return `<section class="forecast"><h3>Point budget</h3><p>${f.affordable===null?'Enter current points to calculate affordable skips.':`${f.affordable} paid skips affordable now · ${f.spendable!.toFixed(0)} spendable points after ${f.setup} setup points and the ${p.reserve} reserve.`}</p>${f.setupAffordable===false?'<p class="error">The recorded balance would be below your reserve after planned setup.</p>':''}${f.drift!==null&&f.drift<-.001?'<p class="notice">This policy spends more than its estimated long-run rewards. Reduce saved skip preferences or use a funded simulation.</p>':''}<p class="small muted">${f.drift===null?esc(plan.pointsRateReason||'Use simulation for point rewards.'):`Stationary balance: ${f.drift.toFixed(1)} points/hour. This average does not guarantee your next skip.`}${p.strategy.startsWith('boost')||p.strategy==='reset-turael'?' Use simulation for actual balances, warm-up and stopping-event rewards.':''}</p>${result?`<p>Simulated funding exhaustion: ${(result.exhaustionChance*100).toFixed(1)}% of trials. Mean remaining points: ${result.meanRemaining.toFixed(0)}.</p>`:'<button data-action="simulate">Simulate reserve risk</button>'}</section>`;
}
export function renderBlockChanges(data:Catalogue,plan:Plan,p:Profile):string{
  const b=blockPreview(data,plan,p);
  return `<h3>Review block changes</h3><p><strong>Add:</strong> ${names(data,b.added)}<br><strong>Remove:</strong> ${names(data,b.removed)}<br><strong>New cost:</strong> ${b.cost} points. Removals give no refund.</p><p>${b.minutesSaved===null?'Time comparison unavailable for one configuration.':`${b.minutesSaved.toFixed(1)} estimated minutes saved per target offer.`} ${b.chanceGain===null?'':`${(b.chanceGain*100).toFixed(2)} percentage-point change in target chance.`}</p><p class="small muted">Compared with your recorded actual list, using the same methods and policy. Full funded hunts require simulation.</p>`;
}
export function renderTaskHistory(data:Catalogue,p:Profile):string{
  const records=p.taskHistory||[];
  return `<details><summary>Task and timing log (${records.length}/200)</summary><p class="small muted">Local observations only. Record actual kills and combat minutes excluding travel/banking; rates are applied only after review. The latest 200 records are retained. Undo reverses the last recorded action during this session.</p>${records.length?`<div class="tablewrap"><table><thead><tr><th>When / master</th><th>Task / variant</th><th>Action</th><th>Points</th><th>Streak</th><th>Combat</th></tr></thead><tbody>${[...records].reverse().slice(0,30).map(r=>`<tr><td>${esc(new Date(r.at).toLocaleString())}<small>${esc(data.masters.find(m=>m.id===r.masterId)?.name)}</small></td><td>${esc(taskName(data,r.assignmentId))}<small>${esc(data.variants.find(v=>v.id===r.variantId)?.name)}</small></td><td>${esc(r.action)}</td><td>${r.pointsBefore} → ${r.pointsAfter}</td><td>${r.streakBefore} → ${r.streakAfter}</td><td>${r.kills??'—'} kills / ${r.combatMinutes??'—'} min</td></tr>`).join('')}</tbody></table></div><p class="small muted">Showing the latest 30. Profile export includes the full retained log.</p>`:'<p>No tasks recorded yet. Search an assignment above to record a completion or paid skip.</p>'}</details>`;
}
export function renderTimingSuggestion(p:Profile,aid:string,vid:string):string{
  const s=timingSuggestion(p,aid,vid);
  return s?`<div class="notice"><strong>Measured timing suggestion: ${s.rate.toFixed(1)} kills/hour</strong><p>${s.samples} completed tasks · ${s.kills} actual kills over ${s.minutes.toFixed(1)} combat minutes. Check that locations and equipment match your intended method.</p><button data-qol="apply-timing" data-assignment="${esc(aid)}" data-variant="${esc(vid)}">Review measured rate</button></div>`:'';
}
/** Review dialogs keep draft inputs separate from saved profiles. */
export function reviewDialog(title:string,body:string,commit='Apply'):Promise<FormData|null>{
  const dialog=document.createElement('dialog');dialog.className='review-dialog';
  dialog.innerHTML=`<form method="dialog"><h2>${esc(title)}</h2>${body}<p class="dialog-error" role="alert"></p><div class="tools"><button value="save">${esc(commit)}</button><button value="cancel" formnovalidate>Cancel</button></div></form>`;
  document.body.append(dialog);decorateCreatureText(dialog);enhanceCreaturePickers(dialog);dialog.showModal();
  return new Promise(resolve=>dialog.addEventListener('close',()=>{const fields=dialog.returnValue==='save'?new FormData(dialog.querySelector('form')!):null;dialog.remove();resolve(fields);},{once:true}));
}
