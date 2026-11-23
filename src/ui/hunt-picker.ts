import type {Catalogue,Profile} from '../domain/types';
import {creatureIcon} from './creature-art';
import {openPicker} from './creature-picker';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function setHuntCreature(data:Catalogue,p:Profile,index:number,value:string):void{
 const [assignmentId,variantId]=value.split('::');
 const target=p.goal.targets[index],variant=data.variants.find(v=>v.id===variantId&&v.assignmentIds.includes(assignmentId));
 if(!target||!variant||p.goal.targets.some((t,i)=>i!==index&&t.assignmentId===assignmentId))throw Error('Choose a creature from a different hunt assignment.');
 target.assignmentId=assignmentId;target.variantId=variantId;
}
export function renderHuntPicker(data:Catalogue,p:Profile):string{
 return `<div class="hunt-targets" aria-label="Current hunt targets">${p.goal.targets.map((target,index)=>{
  const creature=data.variants.find(v=>v.id===target.variantId)!,key='hunt-emblem:'+index;
  const choices=data.variants.flatMap(v=>v.assignmentIds.filter(a=>!p.goal.targets.some((t,i)=>i!==index&&t.assignmentId===a)).map(a=>({v,a}))).sort((a,b)=>a.v.name.localeCompare(b.v.name));
  return `<button type="button" class="target-emblem" data-hunt-picker="${index}" aria-haspopup="dialog" aria-expanded="false" aria-label="Change hunt creature: ${esc(creature.name)}">${creatureIcon(creature.id,true)}<span><span class="eyebrow">HUNTING · CHANGE CREATURE</span><strong>${esc(creature.name)}</strong></span></button><select hidden aria-label="Hunt creature" data-picker-source="${key}" data-target="${index}" data-target-field="creature">${choices.map(({v,a})=>`<option value="${esc(a+'::'+v.id)}" data-creature-id="${esc(v.id)}" ${a===target.assignmentId&&v.id===target.variantId?'selected':''}>${esc(v.name)} · ${esc(data.assignments.find(row=>row.id===a)!.name)}</option>`).join('')}</select>`;
 }).join('')}</div>`;
}
export function openHuntPicker(button:HTMLButtonElement,root:ParentNode=document):void{
 const key='hunt-emblem:'+button.dataset.huntPicker,select=root.querySelector<HTMLSelectElement>(`select[data-picker-source="${key}"]`);
 if(select)openPicker(select,button,'hunt creature',key);
}
