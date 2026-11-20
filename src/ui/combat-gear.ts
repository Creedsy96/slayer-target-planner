import {fightPlan} from '../guide/model';
import type {Profile} from '../domain/types';
import type {GuideRecord,GuideForm,GuideState,LocationPlan,Family} from '../guide/types';
import type {CombatResult} from '../combat/types';
import type {GuideCombat} from '../combat/guide';
import {EQUIPMENT_SLOTS} from '../combat/types';
import {equipmentItem,slotNames} from '../combat/equipment';
import {ownedItemLink} from './owned-items';
import {escapeHtml as esc} from './html';
import {itemText} from './item-links';

export function renderCombatMetrics(result?:CombatResult):string{
 if(!result)return '<p class="notice small">Calculating equipment in a background worker. See progress above.</p>';
 if(!result.supported)return `<p class="notice small">DPS unavailable: ${esc(result.reason)}</p>`;
 const targets=result.targets||1;
 return `<div class="gear-dps" aria-label="Calculated combat metrics"><div><small>${result.hpDependent?'Full-HP single-target DPS':'Single-target DPS'}</small><strong>${result.dps.toFixed(3)}</strong></div><div><small>One creature kill time</small><strong>${result.ttk.toFixed(2)} s</strong></div><div><small>Max hit / hit chance</small><strong>${result.maxHit} / ${(result.hitChance*100).toFixed(1)}%</strong></div><div><small>${targets>1?'Aggregate DPS / '+targets+' targets':'Attack cycle'}</small><strong>${targets>1?(result.aggregateDps||result.dps).toFixed(3):result.attackSeconds.toFixed(1)+' s'}</strong></div></div><p class="small muted">${esc(result.style.type)} / ${esc(result.style.stance)}${result.spell?' / '+esc(result.spell):''}. ${targets>1?'Ideal stacked throughput; hunter time includes complete batches.':'Continuous attacks; excludes healing, movement and travel.'}</p>`;
}
function equipmentGrid(result:CombatResult|undefined,family:string):string{
 return `<div class="guide-equipment" aria-label="${family} owned equipment">${EQUIPMENT_SLOTS.map(slot=>{
  const item=result?.loadout[slot]?equipmentItem(result.loadout[slot]!):undefined;
  return `<div class="guide-slot slot-${slot==='shield'?'off-hand':slot}"><small>${slotNames[slot]}</small><strong>${item?ownedItemLink(item):'<span class="empty-equipment" title="'+(result?.supported&&(slot==='body'||slot==='legs')?'No compatible wearable owned armour is available for this slot.':'Empty slot')+'">—</span>'}</strong></div>`;
 }).join('')}${result?.spell?`<div class="guide-slot slot-spell"><small>Spell / replenishable runes assumed</small><strong>${itemText(result.spell)}</strong></div>`:''}</div>`;
}
export function renderOwnedGear(p:Profile,record:GuideRecord,form:GuideForm,state:GuideState,location?:LocationPlan,results?:GuideCombat):string{
 const assignment=record.assignmentIds.find(id=>p.goal.targets.some(t=>t.assignmentId===id&&t.variantId===record.id))||record.assignmentIds[0];
 const defence=fightPlan(record,form,state,location).defence;
 const selected=p.methods[assignment+'::'+record.id]?.combatStyle||p.combat?.style||'auto';
 return `<section class="owned-options"><h2>Best in your Slots</h2><p>Three owned-equipment alternatives for ${esc(record.name)}. Each retains required shields and protection. When body/leg armour is not a DPS upgrade, prayer setups prioritise prayer bonus and tank setups prioritise defence. Choose a style and this location for this creature's hunter method; your hunt targets stay as selected.</p>${location?.wilderness?'<p class="notice error">These sets can risk expensive equipment in the Wilderness. No protected-item or risk-budget assumption is made.</p>':''}<div class="owned-style-grid">${(['melee','ranged','magic'] as Family[]).map(family=>{
  const result=results?.styles[family],name=family==='magic'?'Magic':family==='ranged'?'Ranged':'Melee';
  return `<article class="guide-gear-set owned"><div class="guide-gear-title"><span class="badge">Owned / ${esc(p.name)}</span><h3>${name}</h3>${result?.supported?`<p class="small muted">${result.armourPriority==='prayer'?'Prayer-first':'Defence-first'} armour fallback</p>`:''}</div>${renderCombatMetrics(result)}${equipmentGrid(result,name)}<button data-use-style="${family}" data-use-variant="${esc(record.id)}" data-use-location="${esc(location?.name||'')}" data-use-defence="${defence}" aria-pressed="${selected===family}" ${result?.supported?'':'disabled'}>Use ${name} for this creature</button><details><summary>Combat assumptions and checks</summary><ul>${(result?.notes||[]).map(note=>`<li>${esc(note)}</li>`).join('')}<li>Special attacks, thralls, movement and healing are not included. Expected kill time includes misses and overkill.</li><li>Skill requirements are checked; item quest/diary unlocks and charges need review.</li></ul></details></article>`;
 }).join('')}</div><div class="tools"><button data-route="bank">Update owned gear</button><button data-route="settings">Combat assumptions and spellbooks</button><button data-use-style="auto" data-use-variant="${esc(record.id)}" data-use-location="${esc(location?.name||'')}" data-use-defence="${defence}" aria-pressed="${selected==='auto'}">Use fastest available style</button></div></section>`;
}
