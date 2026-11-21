import type {Profile,Method} from '../domain/types';
import type {MethodPreviewState} from './method-preview';
import {escapeHtml as esc} from './html';
import {equipmentItem} from '../combat/equipment';
import {ownedItemLink} from './owned-items';

export function renderMethodCombatStatus(p:Profile,method:Method,preview:MethodPreviewState):string{
 const resolved=preview.resolved,calculated=resolved?.calculated;
 const title=(!p.combat?.enabled&&!method.useSelectedGear)?'Automatic combat timing is off':method.timing!=='dps'?'Measured timing retained':method.manualCombat?'Manual DPS override retained':calculated?(p.assumeAllGear?'Calculated with all gear assumed':'Calculated from owned gear'):preview.pending?'Calculating selected method':preview.error?'Method calculation unavailable':'Configured timing retained';
 const selectedGearNote=method.useSelectedGear&&method.timing==='dps'&&!method.manualCombat?' Gear selection enabled calculated timing for this method only.':'';
 const detail=preview.error||resolved?.combatNote||(preview.pending?`${preview.percent}% · ${preview.current}`:'No calculation result is available yet.');
 const weapon=calculated?equipmentItem(calculated.weaponId):undefined;
 const useCalculated=(!p.combat?.enabled&&!method.useSelectedGear)||method.timing!=='dps'||method.manualCombat;
 return `<div class="notice" aria-label="Selected method combat timing"><strong>${title}</strong><p>${esc(detail+selectedGearNote)}</p>${calculated?`<p><strong>${calculated.dps.toFixed(3)} DPS</strong> · ${calculated.ttk.toFixed(2)} seconds per creature throughput before delay.${(calculated.targets||1)>1?' '+calculated.targets+' targets per batch; '+calculated.batchTtk?.toFixed(2)+' seconds per complete stack before delay.':''}</p>${weapon?'<p>Calculated weapon: '+ownedItemLink(weapon)+'</p>':''}`:''}<div class="tools">${useCalculated?'<button data-action="use-calculated-method">Use calculated DPS</button>':''}${preview.error?'<button data-action="retry-method-combat">Retry method calculation</button>':''}${preview.pending?'<button data-action="cancel-method-combat">Cancel method calculation</button>':''}<button data-route="settings">Combat settings</button>${!calculated&&!preview.pending&&!useCalculated?'<button data-route="bank">Review available gear</button>':''}</div>${useCalculated&&(!p.combat?.enabled&&!method.useSelectedGear)?'<p class="small muted">Use calculated DPS enables automatic combat timing for this character and selects DPS timing for this method. Measured methods and manual overrides on other methods are preserved.</p>':''}</div>`;
}
