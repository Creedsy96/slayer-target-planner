import type {CombatResult} from './types';
import type {GuideRecord,LocationPlan} from '../guide/types';

/** Planning pod sizes, not a dungeon-wide spawn count or measured kill rate. */
export function podSize(record:GuideRecord,location?:LocationPlan,override?:number):number{
 if(location?.multi!==true)return 1;
 if(override!==undefined)return Math.max(1,Math.min(9,Math.floor(override)));
 if(record.id==='dust-devil'&&/Catacombs of Kourend/i.test(location.name))return 8;
 if(record.id==='dust-devil'&&/Wilderness Slayer Cave/i.test(location.name))return 9;
 if(record.id==='smoke-devil'&&/Smoke Devil Dungeon/i.test(location.name))return 9;
 return 1;
}
export function applyAreaDamage(result:CombatResult,record:GuideRecord,location?:LocationPlan,override?:number):CombatResult{
 const targets=result.spell&&/Burst|Barrage/.test(result.spell)?podSize(record,location,override):1;
 const copy={...result,notes:[...result.notes],targets,aggregateDps:result.dps*targets,effectiveTtk:result.ttk/targets};
 if(targets>1)copy.notes.push(`Stack assumption: ${targets} simultaneous targets in ${location!.name}, capped at nine. Aggregate DPS is single-target DPS × targets. Hunter time uses complete stack batches; gathering, respawns and imperfect stacking need uptime/delay allowances. This is an idealised throughput estimate, not an exact joint kill-time distribution.`);
 return copy;
}
