import type {GearSelection} from '../combat/gear-selection';
import type {CombatResult,EquipmentSlot} from '../combat/types';
import type {GearComparison} from '../combat/comparisons';
import type {Profile} from '../domain/types';
import type {GuideState,Family} from '../guide/types';
import type {GuideCombat} from '../combat/guide';
import {equipmentItem,slotNames} from '../combat/equipment';
import {ownedItemLink} from './owned-items';
import {escapeHtml as esc} from './html';

const signed=(n:number,digits=0)=>(n>0?'+':'')+n.toFixed(digits);
export function renderGearComparison(comparison:GearComparison,selectable=false):string{
 const multi=comparison.rows.some(row=>row.aggregateDps!==null&&row.dps!==row.aggregateDps);
 return `<p class="gear-choice-reason">${esc(comparison.reason)}</p><p class="small muted">${esc(comparison.context)}</p><p class="small">DPS columns show full setup DPS; Δ compares with the equipped item. Prayer and defence columns show each item's bonuses. Ranged weapon rows include compatible ammunition.${selectable?' Use item saves this slot for this creature/style and refreshes its task timing and associated masters. Other slots are optimised around your choices.':''}</p><div class="gear-comparison-scroll"><table><thead><tr><th>${comparison.assumed?'Available':'Owned'} ${slotNames[comparison.slot].toLowerCase()}</th>${selectable?'<th>Selection</th>':''}<th>Setup DPS</th><th>Δ DPS</th>${multi?'<th>Stack DPS</th>':''}<th>Prayer</th><th>Stab</th><th>Slash</th><th>Crush</th><th>Magic</th><th>Ranged</th><th>Relevant defence</th></tr></thead><tbody>${comparison.rows.map(row=>{
  const item=equipmentItem(row.id),ammo=row.ammoId?equipmentItem(row.ammoId):undefined;
  return `<tr class="${row.selected?'equipped-comparison':''}"><td>${item?ownedItemLink(item):esc(row.name)}${ammo?'<small>with '+ownedItemLink(ammo)+'</small>':''}${row.selected?'<span class="badge">Shown setup</span>':''}${!row.owned?`<span class="badge">${comparison.assumed?'Assumed available':'Example · not owned'}</span>`:''}${row.dps===null||comparison.slot==='weapon'?`<small>${esc(row.reason)}</small>`:''}</td>${selectable?`<td><button data-gear-pick="${row.id}" ${row.ammoId?`data-gear-ammo="${row.ammoId}"`:''} ${row.dps===null||!row.owned&&!comparison.assumed?'disabled':''} aria-label="Use ${esc(row.name)}${ammo?' with '+esc(ammo.name):''}">${row.selected?'Keep selected':'Use item'}</button></td>`:''}<td>${row.dps===null?'Unavailable':row.dps.toFixed(3)}</td><td>${row.delta===null?'—':signed(row.delta,3)}</td>${multi?`<td>${row.aggregateDps?.toFixed(3)??'—'}</td>`:''}<td>${signed(row.prayer)}</td>${['stab','slash','crush','magic','ranged'].map(key=>`<td>${signed(row.defensive[key]||0)}</td>`).join('')}<td>${signed(row.defence,1)}</td></tr>`;
 }).join('')}</tbody></table></div><details><summary>Comparison assumptions</summary><p class="small muted">${esc(comparison.notes)}</p></details>`;
}

interface InspectorContext {profile:Profile;guide:GuideState;results?:GuideCombat;key:string}
/** Lazy, cancellable comparisons avoid adding every owned item to initial work. */
export class GearInspector {
 private panel=document.createElement('section');private anchor:HTMLElement|null=null;
 private worker?:Worker;private cache=new Map<string,GearComparison>();private contextKey='';private sequence=0;
 private selectionContext?:{context:InspectorContext;result:CombatResult;family:Family;slot:EquipmentSlot;selectable:boolean};
 private closeTimer?:ReturnType<typeof setTimeout>;private pinned=false;private restoringFocus=false;
 constructor(private source:string,private context:()=>InspectorContext,private select?:(choice:GearSelection,context:InspectorContext,result:CombatResult)=>void){
  this.panel.id='gear-comparison';this.panel.className='gear-comparison';this.panel.setAttribute('popover','manual');this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-label','Why this gear was selected');
  document.body.append(this.panel);
  document.addEventListener('pointerover',event=>{const anchor=(event.target as HTMLElement).closest<HTMLElement>('[data-gear-slot]');if(anchor&&!this.pinned)this.open(anchor);});
  document.addEventListener('focusin',event=>{const anchor=(event.target as HTMLElement).closest<HTMLElement>('[data-gear-slot]');if(anchor&&!this.restoringFocus)this.open(anchor);});
  document.addEventListener('pointerout',event=>{if((event.target as HTMLElement).closest('[data-gear-slot]')||this.panel.contains(event.target as Node))this.scheduleClose();});
  this.panel.addEventListener('pointerenter',()=>clearTimeout(this.closeTimer));
  this.panel.addEventListener('focusin',()=>clearTimeout(this.closeTimer));
  document.addEventListener('focusout',()=>this.scheduleClose());
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){this.close();}});
  document.addEventListener('click',event=>{
   const target=event.target as HTMLElement,info=target.closest('[data-gear-info]');
   const pick=target.closest<HTMLElement>('[data-gear-pick]'),selection=this.selectionContext;
   if(pick&&selection&&selection.context.key===this.context().key&&selection.selectable){
    this.select?.({family:selection.family,slot:selection.slot,id:Number(pick.dataset.gearPick),ammoId:pick.dataset.gearAmmo?Number(pick.dataset.gearAmmo):undefined},selection.context,selection.result);return;
   }
   if(info){const anchor=info.closest<HTMLElement>('[data-gear-slot]')!;if(this.pinned&&this.anchor===anchor){this.close();return;}this.open(anchor);this.pinned=true;return;}
   if(target.closest('[data-gear-close]')){const anchor=this.anchor;this.close();this.restoringFocus=true;anchor?.querySelector<HTMLElement>('[data-gear-info]')?.focus();this.restoringFocus=false;return;}
   if(this.pinned&&!this.panel.contains(target)&&!this.anchor?.contains(target))this.close();
  });
  window.addEventListener('resize',()=>this.position());
  window.addEventListener('scroll',()=>this.position(),{passive:true});
 }
 invalidate():void{this.close();this.cache.clear();this.contextKey='';}
 refresh():void{if(this.anchor&&!this.anchor.isConnected)this.close();}
 private scheduleClose():void{
  clearTimeout(this.closeTimer);this.closeTimer=setTimeout(()=>{
   const focus=document.activeElement;
   if(!this.pinned&&!this.panel.matches(':hover')&&!this.anchor?.matches(':hover')&&!this.panel.contains(focus)&&!this.anchor?.contains(focus))this.close();
  },180);
 }
 private close():void{
  this.worker?.terminate();this.worker=undefined;this.sequence++;this.pinned=false;
  this.anchor?.querySelector('[data-gear-info]')?.setAttribute('aria-expanded','false');this.anchor=null;
  if(this.panel.matches(':popover-open'))this.panel.hidePopover();clearTimeout(this.closeTimer);
 }
 private open(anchor:HTMLElement):void{
  clearTimeout(this.closeTimer);if(anchor===this.anchor)return;
  const context=this.context(),family=anchor.dataset.gearFamily as Family,slot=anchor.dataset.gearSlot as EquipmentSlot,tier=anchor.dataset.gearTier as 'mid'|'max'|undefined,result=tier?context.results?.[tier]:context.results?.styles[family];
  if(!result?.supported)return;
  this.close();this.selectionContext={context,result,family,slot,selectable:!tier};this.anchor=anchor;anchor.querySelector('[data-gear-info]')?.setAttribute('aria-expanded','true');
  if(this.contextKey!==context.key){this.cache.clear();this.contextKey=context.key;}
  this.panel.innerHTML=`<header><h3>${slotNames[slot]} · ${esc(family)} gear choice</h3><button data-gear-close aria-label="Close gear comparison">×</button></header><div class="gear-comparison-body" aria-live="polite"><p>Comparing available ${slotNames[slot].toLowerCase()} items…</p></div>`;
  this.panel.showPopover();this.position();
  const key=(tier||'owned')+'|'+family+'|'+slot,saved=this.cache.get(key);if(saved){this.show(saved);return;}
  const blob=new Blob([this.source],{type:'text/javascript'}),url=URL.createObjectURL(blob),worker=new Worker(url);URL.revokeObjectURL(url);this.worker=worker;
  const id=++this.sequence;
  worker.onmessage=event=>{
   if(this.worker!==worker||event.data.id!==id)return;
   if(event.data.kind==='error'){this.showError(event.data.message);return;}
   if(event.data.kind!=='gear-detail')return;
   this.cache.set(key,event.data.result);this.show(event.data.result);worker.terminate();this.worker=undefined;
  };
  worker.onerror=()=>this.showError('Comparison failed. Move away and hover again to retry.');
  worker.postMessage({id,kind:'gear-detail',profile:context.profile,guide:context.guide,combat:result satisfies CombatResult,slot});
 }
 private show(value:GearComparison):void{this.panel.querySelector('.gear-comparison-body')!.innerHTML=renderGearComparison(value,this.selectionContext?.selectable);this.position();}
 private showError(message:string):void{this.worker?.terminate();this.worker=undefined;this.panel.querySelector('.gear-comparison-body')!.innerHTML='<p class="notice error">'+esc(message)+'</p>';}
 private position():void{
  if(!this.anchor?.isConnected||!this.panel.matches(':popover-open'))return;
  const rect=this.anchor.getBoundingClientRect(),height=this.panel.getBoundingClientRect().height;
  const left=Math.max(8,Math.min(rect.left,window.innerWidth-this.panel.offsetWidth-8));
  const top=rect.bottom+8+height<=window.innerHeight?rect.bottom+8:Math.max(8,rect.top-height-8);
  this.panel.style.left=left+'px';this.panel.style.top=top+'px';
 }
}
