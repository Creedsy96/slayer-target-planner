import raw from '../../data/slayer-extensions.json';
import type {Catalogue,Profile} from '../domain/types';
import {factCard} from './fact-cards';
import {creatureIcon} from './creature-art';
import {escapeHtml as esc} from './html';

export const EXTENSION_REWARDS=raw.rewards;
/** Legacy method settings remain unchanged until the player records the shared
 * assignment purchase; don't silently infer ownership from a method preset. */
export function extensionPurchaseState(p:Profile,id:string):{enabled:boolean;legacy:boolean}{
 const enabled=p.extensions?.[id];
 return {enabled:enabled===true,legacy:enabled===undefined&&Object.entries(p.methods).some(([key,m])=>(key===id||key.startsWith(id+'::'))&&m.extended)};
}
export function renderExtensionRewards(data:Catalogue,p:Profile,query=''):string{
 const q=query.trim().toLowerCase();
 const rewards=EXTENSION_REWARDS.filter(r=>data.assignments.some(a=>a.id===r.assignmentId)&&[r.name,r.assignmentId,data.assignments.find(a=>a.id===r.assignmentId)?.name||''].some(label=>label.toLowerCase().includes(q)));
 return `<section class="extension-rewards" id="account-task-extensions" aria-labelledby="extension-rewards-title"><h2 id="extension-rewards-title">Purchased task extensions</h2><p>Listed in the Slayer Rewards <strong>Extend</strong> tab order. Record extensions you have already purchased. New characters start with these off; marking a purchase applies to every variant and master for that assignment. No Slayer points are spent here.</p><div class="fact-grid reward-grid">${rewards.map(reward=>{
  const state=extensionPurchaseState(p,reward.assignmentId),assignment=data.assignments.find(a=>a.id===reward.assignmentId)!;
  const quantity=reward.quantity.extra?`+${reward.quantity.extra} assigned kills`:`${reward.quantity.minimum}–${reward.quantity.maximum} assigned kills`;
  const note=`${assignment.name} · ${reward.points} points · ${quantity}.${reward.toggleable?' Record whether enabled in game.':''}${state.legacy?' Saved methods use this extension; click to confirm it for the whole assignment.':''}`;
  return factCard(reward.name,state.enabled?1:0,`data-extension-toggle="${esc(reward.assignmentId)}" data-extension-enabled="${state.legacy||!state.enabled}"`,creatureIcon(reward.iconVariant),note,state.legacy);
 }).join('')}</div>${rewards.length?'':'<p class="small muted">No task extensions match this filter.</p>'}<p class="small muted"><a href="${raw.source.url.replace('#Extend','')}?oldid=${raw.source.revision}#Extend" target="_blank" rel="noopener">Slayer extension names, order and costs</a>. Changing this record does not buy or cancel a reward in game.</p></section>`;
}
