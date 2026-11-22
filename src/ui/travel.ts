import type {Profile} from '../domain/types';
import {TELEPORTS,teleportState} from '../state/travel';
import {factCard} from './fact-cards';
import {interfaceIcon} from './interface-icons';
import {escapeHtml as esc} from './html';
export function renderTravelSettings(p:Profile,showCompleted=false,wizard=false):string{
 const rows=TELEPORTS.filter(t=>{const s=teleportState(p,t);return !(wizard&&s.blocked)&&(t.kind==='consumable'||!s.enabled||showCompleted);});
 const cards=(kind:string)=>rows.filter(t=>t.kind===kind).map(t=>{
  const s=teleportState(p,t);
  return `<div class="travel-choice">${factCard(t.name,s.enabled?1:0,`data-teleport-toggle="${esc(t.id)}" ${s.blocked?'disabled':''}`,interfaceIcon('route'),s.reason+' '+t.note)}<a class="small" href="https://oldschool.runescape.wiki/w/${encodeURIComponent(t.source.replaceAll(' ','_'))}" target="_blank" rel="noopener">Teleport source</a>${p.travel?.overrides?.[t.id]!==undefined?`<button class="text-button" data-teleport-auto="${esc(t.id)}">Use automatic detection</button>`:''}${s.blocked?'<button class="text-button" data-route="account">Review quest requirement</button>':''}</div>`;
 }).join('');
 return `<section class="${wizard?'':'card '}travel-settings" id="travel-options"><h2>Travel options</h2><p>Confirm what this character can use. Quest rewards and imported teleport items are detected automatically. Unlimited teleports disappear from the unconfirmed list when enabled; consumable and charged teleports stay toggleable. Reopen completed options with Show confirmed travel.</p><label class="check"><input type="checkbox" id="show-travel-completed" ${showCompleted?'checked':''}>Show confirmed travel</label><h3>Permanent unlocks and unlimited items</h3><div class="fact-grid">${cards('permanent')||'<p class="small muted">No unconfirmed unlimited travel options remain in this view.</p>'}</div><h3>Consumable and charged teleports</h3><p class="small muted">Detected stock is a snapshot. Recharge seeds, bring charges/supplies, and review house and destination unlocks separately. Manual No overrides detection until you choose automatic detection again.</p><div class="fact-grid">${cards('consumable')}</div></section>`;
}
