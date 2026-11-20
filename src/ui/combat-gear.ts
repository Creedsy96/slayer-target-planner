import type {Profile} from '../domain/types';
import type {GuideRecord,GuideForm,GuideState,LocationPlan,GearSet,FightPlan} from '../guide/types';
import type {CombatResult} from '../combat/types';
import {EQUIPMENT_SLOTS} from '../combat/types';
import {equipmentItem,slotNames} from '../combat/equipment';
import {bestOwnedGear,exampleLoadout} from '../combat/optimise';
import {calculateCombat,combatStyles,familyOf,isWildernessCombat,emptyCombat} from '../combat/calculate';
import {ownedItemLink} from './owned-items';
import {escapeHtml as esc} from './html';
import {itemText} from './item-links';

export function renderCombatMetrics(result:CombatResult):string{
 if(!result.supported)return `<p class="notice small">DPS unavailable: ${esc(result.reason)}</p>`;
 return `<div class="gear-dps" aria-label="Calculated combat metrics"><div><small>${result.hpDependent?'Full-HP DPS':'DPS'}</small><strong>${result.dps.toFixed(3)}</strong></div><div><small>Expected kill time</small><strong>${result.ttk.toFixed(2)} s</strong></div><div><small>Max hit</small><strong>${result.maxHit}</strong></div><div><small>Hit chance</small><strong>${(result.hitChance*100).toFixed(1)}%</strong></div></div><p class="small muted">${esc(result.style.type)} · ${esc(result.style.stance)} · ${result.attackSeconds.toFixed(1)} s/attack${result.spell?' · '+esc(result.spell):''}. Continuous attacks; excludes healing, movement, travel and between-kill delay.</p>`;
}
export function exampleCombat(p:Profile,record:GuideRecord,form:GuideForm,state:GuideState,location:LocationPlan|undefined,set:GearSet,plan:FightPlan):CombatResult{
 const loadout=exampleLoadout(set),spell=set.slots.find(row=>row.slot==='Spell')?.item||null;
 let result=emptyCombat('No supported attack style in this example.');
 for(const style of combatStyles(loadout.weapon||0).filter(s=>familyOf(s)===plan.family)){
  if(plan.family==='melee'&&['stab','slash','crush'].includes(plan.attack)&&style.type!==plan.attack)continue;
  const calculated=calculateCombat(p,record,form,loadout,style,spell,state.onTask,isWildernessCombat(record,location));
  if(calculated.supported&&calculated.dps>result.dps)result=calculated;
  else if(!result.supported&&!calculated.supported)result=calculated;
 }
 result.source='example';return result;
}
export function renderOwnedGear(p:Profile,record:GuideRecord,form:GuideForm,state:GuideState,location?:LocationPlan):string{
 const result=bestOwnedGear(p,record,form,state,location);
 return `<article class="guide-gear-set owned"><div class="guide-gear-title"><span class="badge">Owned items · ${esc(p.name)}</span><h3>Best in your Slots</h3><p>${result.supported?esc(result.family)+' · '+esc(result.style.type):'Import or add gear to prepare this set'}</p></div>${location?.wilderness?'<p class="notice error">This owned DPS set can risk expensive gear in the Wilderness. No protected-item or risk-budget assumption is made.</p>':''}${renderCombatMetrics(result)}<div class="guide-equipment" aria-label="Best in your Slots equipment">${EQUIPMENT_SLOTS.map(slot=>{
 const item=result.loadout[slot]?equipmentItem(result.loadout[slot]!):undefined;
 return `<div class="guide-slot slot-${slot==='shield'?'off-hand':slot}"><small>${slotNames[slot]}</small><strong>${item?ownedItemLink(item):'<span class="empty-equipment" aria-label="Empty '+esc(slotNames[slot])+' slot">—</span>'}</strong></div>`;
 }).join('')}${result.spell?`<div class="guide-slot slot-spell"><small>Spell · replenishable runes assumed</small><strong>${itemText(result.spell)}</strong></div>`:''}</div><div class="tools"><button data-route="bank">Update owned gear</button><button data-route="settings">Combat assumptions</button></div><details><summary>Search and combat assumptions</summary><ul><li>Uses the active profile’s base levels for every example and owned set. Item availability comes from its bank, inventory, equipment and manual quantities.</li>${result.notes.map(note=>`<li>${esc(note)}</li>`).join('')}<li>No special-attack rotation, defence-reduction setup, thralls, AoE stack size, healing or movement cycle is assumed.</li><li>Expected kill time comes from the engine’s hit distribution, including overkill. The hunter applies configured attack uptime, between-kill delay and task travel separately.</li></ul></details></article>`;
}
