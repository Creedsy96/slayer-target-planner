import type {Profile,Method,Variant} from '../domain/types';
import {GUIDE,defaultGuideState,guideForm,selectedLocation} from '../guide/model';
import {bestOwnedGear} from './optimise';
import {encounter} from '../guide/encounters';
export function withCalculatedTiming(p:Profile,v:Variant,method:Method):Method{
 const {calculated,combatNote,...base}=method;method=base;
 if(!p.combat?.enabled||method.timing!=='dps'||method.manualCombat)return method;
 const record=GUIDE.records[v.id];if(!record)return {...method,combatNote:'No individual creature DPS mapping; using configured timing.'};
 const mechanics=encounter(record);
 if(mechanics.boss||mechanics.hybrid)return {...method,combatNote:'Boss/phase/switch encounter: using configured full-fight timing.'};
 const state={...defaultGuideState(),variantId:v.id,formId:record.defaultForm,location:method.location,onTask:true};
 const form=guideForm(record,state),location=selectedLocation(record,form,state),result=bestOwnedGear(p,record,form,state,location);
 if(!result.supported)return {...method,combatNote:result.reason+' Using configured timing.'};
 return {...method,calculated:{ttk:result.ttk/(p.combat.uptime/100),dps:result.dps,weaponId:result.loadout.weapon||0},combatNote:'Owned-gear DPS and expected hits-to-kill; '+p.combat.uptime+'% attack uptime. Legacy creature DPS multipliers are not applied.'};
}
