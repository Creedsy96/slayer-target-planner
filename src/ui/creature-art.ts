import atlas from './creature-art.json';
import type {Catalogue} from '../domain/types';

const entries:Record<string,{frame:number;name:string}>=atlas.entries;
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function creatureIcon(id:string,large=false):string{
  const entry=entries[id];if(!entry)return '';
  return `<span class="creature-icon${large?' creature-icon--large':''}" aria-hidden="true" style="--sprite-col:${entry.frame%atlas.columns};--sprite-row:${Math.floor(entry.frame/atlas.columns)};--sprite-cols:${atlas.columns};--sprite-rows:${atlas.rows}"></span>`;
}
/** Call only for a known creature reference. Labels never determine artwork. */
export function creatureName(id:string,name:string):string{
  const icon=creatureIcon(id);
  return icon?`<span class="creature-name">${icon}<span>${escape(name)}</span></span>`:escape(name);
}
export function assignmentCreatureId(data:Catalogue,id:string):string{
  return data.assignments.find(a=>a.id===id)?.variantIds[0]||'';
}
export function assignmentName(data:Catalogue,id:string,name?:string):string{
  return creatureName(assignmentCreatureId(data,id),name??data.assignments.find(a=>a.id===id)?.name??id);
}
/** Native option text stays plain; the explicitly enabled picker reads its ID. */
export function creatureOptions(data:Catalogue,kind:'assignment'|'variant',values:[string,string][],selected:unknown):string{
  return values.map(([id,label])=>`<option value="${escape(id)}" data-creature-id="${escape(kind==='assignment'?assignmentCreatureId(data,id):id)}" ${id===String(selected)?'selected':''}>${escape(label)}</option>`).join('');
}
