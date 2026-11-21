import type {Catalogue,ExtensionComparison,Plan,Profile} from '../domain/types';
import {configuredMethod} from '../combat/priority';
import {assignmentName} from './creature-art';
import {escapeHtml as esc} from './html';

export function renderTargetExtensions(data:Catalogue,p:Profile):string{
  const ids=[...new Set(p.goal.targets.map(t=>t.assignmentId))];
  return `<div class="target-extensions"><h3>Target task extensions</h3><p class="small muted">Record the extensions you have purchased in game. These settings apply to all variants and masters; no Slayer points are spent here.</p>${ids.map(id=>{
    const target=[...p.goal.targets].filter(t=>t.assignmentId===id).sort((a,b)=>b.priority-a.priority)[0];
    const offered=data.masters.some(m=>m.tasks.some(t=>t.id===id&&t.extendedMin>0&&t.extendedMax>=t.extendedMin));
    if(!offered)return `<p class="small muted">${assignmentName(data,id)}: no extension in the current catalogue.</p>`;
    const enabled=configuredMethod(data,p,id,target.variantId).extended;
    return `<button class="fact-card ${enabled?'enabled':''}" data-extension-toggle="${esc(id)}" data-extension-enabled="${!enabled}" aria-pressed="${enabled}"><span class="fact-copy"><strong>${assignmentName(data,id)}</strong><small>Click to mark ${enabled?'not extended':'extended'}</small></span><span class="fact-state">${enabled?'Extended':'Not extended'}</span></button>`;
  }).join('')}</div>`;
}
export function extensionDifference(c:ExtensionComparison):string{
  if(c.normalRate===null||c.extendedRate===null)return '';
  const delta=c.extendedRate-c.normalRate,percent=c.normalRate>0?` (${delta>=0?'+':''}${(delta/c.normalRate*100).toFixed(1)}%)`:'';
  return `${delta>=0?'+':''}${delta.toFixed(1)} KPH${percent}`;
}
export function renderExtensionAdvice(data:Catalogue,plan:Plan,p:Profile,compact=false):string{
  if(!plan.extensions?.length)return '';
  if(compact)return `<div class="extension-advice">${plan.extensions.filter(c=>c.quantities.length).map(c=>{
    if(c.normalRate===null||c.extendedRate===null)return `<p class="small muted">${assignmentName(data,c.assignmentId)}: ${esc(c.reason)}</p>`;
    const gain=c.extendedRate>c.normalRate+1e-8;
    return `<p class="small">${assignmentName(data,c.assignmentId)}: ${c.enabled?'Extended':'Not extended'}. ${!c.enabled&&gain?'<strong>Recommend extending.</strong> ':''}${c.normalRate.toFixed(1)} → ${c.extendedRate.toFixed(1)} KPH · ${extensionDifference(c)}</p>`;
  }).join('')}</div>`;
  return `<details class="extension-advice" ${p.objective==='kills-hour'?'open':''}><summary>Target extensions: KPH comparison</summary><p class="small muted">Same blocks, gear, strategy and other extensions in both scenarios. Rerank after recording a purchase to search the best blocks again.${p.strategy==='funded'?' Unlimited-funds benchmark.':''}</p>${plan.extensions.map(c=>{
    const rates=c.normalRate!==null&&c.extendedRate!==null?`<p>Not extended: <strong>${c.normalRate.toFixed(1)} KPH</strong> → Extended: <strong>${c.extendedRate.toFixed(1)} KPH</strong> · ${extensionDifference(c)}</p>`:'';
    const gain=c.normalRate!==null&&c.extendedRate!==null&&c.extendedRate>c.normalRate+1e-8;
    const recommendation=!c.enabled&&gain?`<p><strong>Recommended: extend this task in game.</strong> After purchasing, mark it extended in Hunt setup.</p>`:c.enabled?'<p>Extension already enabled in this character’s setup.</p>':rates?'<p>No KPH improvement from extending this task in this setup.</p>':'';
    return `<div class="extension-comparison"><h4>${assignmentName(data,c.assignmentId)} · ${c.enabled?'Extended':'Not extended'}</h4>${c.quantities.map(q=>`<p class="small muted">${esc(q.master)}: ${q.normal.join('–')} → ${q.extended.join('–')} assigned kills · <a href="${esc(q.source.url)}" target="_blank" rel="noopener">Quantity source</a></p>`).join('')}${rates}${recommendation}${c.reason?`<p class="small muted">${esc(c.reason)}</p>`:''}</div>`;
  }).join('')}</details>`;
}
