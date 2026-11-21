import type {SimulationWorkload} from '../domain/types';

export function emptyWorkload():SimulationWorkload{
 return {assignedKills:0,kills:0,tasksCompleted:0,tasksSkipped:0,paidSkips:0,resets:0};
}
/** Include unfinished trials at their stopping point, just like the point ledger. */
export function meanWorkload(rows:SimulationWorkload[]):SimulationWorkload{
 const mean=emptyWorkload();if(!rows.length)return mean;
 for(const key of Object.keys(mean) as (keyof SimulationWorkload)[])mean[key]=rows.reduce((sum,row)=>sum+row[key],0)/rows.length;
 return mean;
}
