import type {Catalogue,Profile} from '../domain/types';
import {questState,resolveAccess,isOpenArea} from '../rules/access';
import type {QuestPreview} from '../state/quest-import';
import {questOverridesAfterImport} from '../state/quest-import';
import {questPointSummary} from './quest-points';
import {factCard} from './fact-cards';
import {interfaceIcon} from './interface-icons';

const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const questLabel=(n:number|null)=>n===null?'Unknown':n===0?'Not started':n===1?'In progress':'Completed';

export function renderQuestImport(p:Profile,preview:QuestPreview|null,preserve:boolean,draft:string):string {
  const saved=p.questImport;
  let html=`<section class="card"><h2>Import RuneLite quests</h2><p>Choose a local quest JSON export or paste its contents. Review it before applying it to <strong>${esc(p.name)}</strong>. Missing quests stay unknown; imported quests can be overridden below.</p><div class="tools"><button data-action="choose-quests">Choose quest JSON</button><button data-action="export-profile">Export character backup</button></div><details><summary>Paste quest JSON</summary><label>RuneLite quest JSON<textarea id="quest-json" rows="5" maxlength="2000000" placeholder="Paste a RuneLite quest export here">${esc(draft)}</textarea></label><button data-action="preview-quests">Review pasted quests</button></details><details><summary>How to export from RuneLite</summary><ol><li>Install <a href="https://runelite.net/plugin-hub" target="_blank" rel="noopener">Character Export</a> from the RuneLite Plugin Hub and enable quest exporting.</li><li>Log in to the character, use the plugin's Sync Available / Open Folder controls, and choose <strong>quests.json</strong>.</li><li>The folder is <code>.runelite/character-exporter/&lt;Character Name&gt;/</code> in your user folder.</li></ol><p class="small muted">Also accepts the quest records in an OSRS MCP Companion account JSON. Access requirements and recognised quest-point reward states are retained. Bank, inventory, skills and diaries are not imported by this action. No WikiSync API or account login is used by the planner.</p></details>`;
  if(saved)html+=`<p class="notice">Last quest import: ${esc(saved.format)} · ${esc(saved.playerName||'Account not supplied')} · Exported ${esc(saved.exportedAt||'time unknown')} · ${Object.keys(saved.states).length} relevant quest states. ${esc(questPointSummary(p))} <button data-action="clear-imported-quests">Remove imported quests</button></p>`;
  if(preview){
    const names=Object.keys(preview.states).sort(),conflicts=names.filter(k=>p.quests[k]!=null&&p.quests[k]!==preview.states[k]);
    const accountMismatch=preview.playerName&&saved?.playerName&&preview.playerName.toLowerCase()!==saved.playerName.toLowerCase();
    html+=`<div class="notice"><h3>Review quest import</h3><p>${esc(preview.format)} · ${esc(preview.playerName||'Account not supplied')} · Exported ${esc(preview.exportedAt||'time unknown')}</p><p>${names.length} matching quests of ${preview.total} records. ${preview.ignored.length} outside access requirements (recognised rewards still count towards quest points); ${conflicts.length} differ from manual quest overrides.</p><p>${esc(questPointSummary({...p,quests:questOverridesAfterImport(p,preview,preserve),questImport:preview}))}</p>${preview.warnings.map(w=>`<p>${esc(w)}</p>`).join('')}${accountMismatch?'<p>The account differs from the previous import. Applying this file replaces its imported quest snapshot.</p>':''}<label class="check"><input type="checkbox" id="preserve-quest-overrides" ${preserve?'checked':''}>Keep existing manual quest overrides</label><p class="small">Applying replaces the imported quest snapshot. Area overrides, levels, diaries, Slayer points, manual quest-point totals and purchased unlocks are preserved. Automatic quest points use the new snapshot.</p><div class="tablewrap data-list"><table><thead><tr><th>Quest</th><th>Current</th><th>Imported</th><th>After applying</th></tr></thead><tbody>${names.map(name=>`<tr><td>${esc(name)}</td><td>${questLabel(questState(p,name))}</td><td>${questLabel(preview.states[name])}</td><td>${questLabel(preserve&&p.quests[name]!=null?p.quests[name]:preview.states[name])}${preserve&&p.quests[name]!=null?' (manual)':''}</td></tr>`).join('')}</tbody></table></div><div class="tools"><button data-action="apply-quests">Apply quests to ${esc(p.name)}</button><button data-action="cancel-quests">Cancel import</button></div></div>`;
  }
  return html+'</section>';
}

const answeredAtVisit=new Map<string,Set<string>>();
export function resetAccessChecklist():void{answeredAtVisit.clear();}
export function visibleFactKeys(p:Profile,group:string,keys:string[],complete:(key:string)=>boolean,showCompleted=false):string[]{
 const key=p.id+':'+group;if(!answeredAtVisit.has(key))answeredAtVisit.set(key,new Set(keys.filter(complete)));
 return keys.filter(k=>showCompleted||!answeredAtVisit.get(key)!.has(k));
}
export function visibleQuestNames(p:Profile,quests:string[],showCompleted=false):string[]{
 const key=p.id+':quests';if(!answeredAtVisit.has(key))answeredAtVisit.set(key,new Set(quests.filter(q=>questState(p,q)===2)));
 return quests.filter(q=>showCompleted||!answeredAtVisit.get(key)!.has(q));
}
export function renderAreaAccess(p:Profile,keys:string[],query:string,showCompleted=false):string {
 const visit=p.id+':areas';if(!answeredAtVisit.has(visit))answeredAtVisit.set(visit,new Set(keys.filter(key=>resolveAccess(key,p).value===1)));
 const locations=keys.filter(key=>key.startsWith('location:')&&key.toLowerCase().includes(query)&&(p.restrictBasicAccess||!isOpenArea(key))&&(showCompleted||!answeredAtVisit.get(visit)!.has(key)));
 return `<section class="card"><h2>Area access</h2><p class="small muted">Ordinary entrances with no hard quest, miniquest or skill restriction default to Yes. Confirmed one-time access is hidden on your next page load. Enable Show completed access in Settings to review it, or enable restricted-account controls for normally open areas. Fees, tools, teleports and individual creature requirements remain separate.</p><div class="fact-grid">${locations.map(key=>{
  const result=resolveAccess(key,p),manual=p.access[key]===0||p.access[key]===1;
  return `<div class="access-fact">${factCard(key.slice(9),result.value,`data-fact-toggle="access" data-key="${esc(key)}"`,interfaceIcon('route'),result.reason)}${manual?`<button class="text-button" data-access-auto="${esc(key)}">Use automatic quest/skill facts</button>`:''}${result.source?`<a class="small" href="${esc(result.source.url+(result.source.revision?'?oldid='+result.source.revision:''))}" target="_blank" rel="noopener">Requirement source</a>`:''}</div>`;
 }).join('')}</div>${!locations.length?'<p class="notice">No remaining area checks in this view. Confirmed access stays saved; review completed access in Settings.</p>':''}<button data-action="refresh-access-checks">Hide newly confirmed checks</button></section>`;
}
