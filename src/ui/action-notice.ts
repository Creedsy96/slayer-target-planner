import {escapeHtml as esc} from './html';
import type {ActionOrigin,FeedbackFix} from './action-feedback';
export type NoticeLevel='error'|'warning'|'info';
export interface NoticeContent {message:string;level:NoticeLevel;fix:FeedbackFix}

export function noticePosition(anchor:{left:number;top:number;bottom:number}|undefined,size:{width:number;height:number},viewport:{width:number;height:number}){
 const gap=12,maxLeft=Math.max(gap,viewport.width-size.width-gap),maxTop=Math.max(gap,viewport.height-size.height-gap);
 if(!anchor)return {left:Math.max(gap,(viewport.width-size.width)/2),top:maxTop};
 const below=anchor.bottom+gap;
 return {left:Math.max(gap,Math.min(anchor.left,maxLeft)),top:Math.max(gap,Math.min(below+size.height<=viewport.height-gap?below:anchor.top-size.height-gap,maxTop))};
}
/** A persistent top-layer banner survives worker-driven content replacement.
 * Errors stay until dismissed or a successful edit; appearance never steals focus. */
export class ActionNotice {
 private panel=document.createElement('section');private origin?:ActionOrigin;private fix?:FeedbackFix;
 constructor(private context:()=>{route:string;characterId:string},private correct:(fix:FeedbackFix)=>void,private dismissed:()=>void){
  this.panel.id='action-notice';this.panel.className='action-notice';this.panel.setAttribute('popover','manual');this.panel.setAttribute('aria-label','Action feedback');
  document.body.append(this.panel);
  this.panel.addEventListener('click',event=>{
   const target=(event.target as HTMLElement).closest('[data-notice-fix],[data-notice-close]');if(!target)return;
   event.preventDefault();event.stopPropagation();const fix=target.hasAttribute('data-notice-fix')?this.fix:undefined;
   this.close();if(fix)this.correct(fix);
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&this.panel.matches(':popover-open')){this.close();}});
  window.addEventListener('resize',()=>this.position());window.addEventListener('scroll',()=>this.position(),{passive:true});
 }
 show(content:NoticeContent,origin?:ActionOrigin):void{
  this.origin=origin;this.fix=content.fix;this.panel.dataset.level=content.level;
  this.panel.setAttribute('role',content.level==='info'?'status':'alert');
  this.panel.innerHTML=`<div class="action-notice-icon" aria-hidden="true">${content.level==='info'?'i':'!'}</div><div class="action-notice-copy"><strong>${content.level==='error'?'Action needs attention':content.level==='warning'?'Check this before continuing':'Update'}</strong><p>${esc(content.message)}</p><a href="#${esc(content.fix.route)}" data-notice-fix>${esc(content.fix.label)} <span aria-hidden="true">→</span></a></div><button type="button" data-notice-close aria-label="Dismiss notification">×</button>`;
  if(!this.panel.matches(':popover-open'))this.panel.showPopover();this.position();
 }
 close(notify=true):void{
  const restore=this.panel.contains(document.activeElement),current=this.context();
  const target=current.route===this.origin?.route&&current.characterId===this.origin.characterId&&this.origin.selector?document.querySelectorAll<HTMLElement>(this.origin.selector)[this.origin.index]:undefined;
  if(this.panel.matches(':popover-open'))this.panel.hidePopover();this.origin=undefined;this.fix=undefined;
  if(restore)target?.focus({preventScroll:true});if(notify)this.dismissed();
 }
 refresh():void{this.position();}
 private position():void{
  if(!this.panel.matches(':popover-open'))return;
  const current=this.context(),same=current.route===this.origin?.route&&current.characterId===this.origin.characterId;
  const target=same&&this.origin?.selector?document.querySelectorAll<HTMLElement>(this.origin.selector)[this.origin.index]:undefined;
  const rect=target?.getBoundingClientRect(),anchor=same?(rect&&rect.width&&rect.height?rect:this.origin?.rect):undefined;
  const width=document.documentElement?.clientWidth||window.innerWidth;
  this.panel.style.maxWidth=Math.max(0,width-24)+'px';
  const position=noticePosition(anchor,this.panel.getBoundingClientRect(),{width,height:window.innerHeight});
  this.panel.style.left=position.left+'px';this.panel.style.top=position.top+'px';
 }
}

export function focusCorrection(element:HTMLElement):void{
 for(let ancestor=element.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;
 if(element instanceof HTMLSelectElement&&element.dataset.creatureEnhanced)element=element.nextElementSibling as HTMLElement||element;
 element.focus({preventScroll:true});element.scrollIntoView({block:'center',behavior:'auto'});
 element.classList.remove('feedback-focus');void element.offsetWidth;element.classList.add('feedback-focus');
 element.addEventListener('blur',()=>element.classList.remove('feedback-focus'),{once:true});
}
