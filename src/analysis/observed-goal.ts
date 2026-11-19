import type {Catalogue,Profile,Simulation} from '../domain/types';
import {actualTargetCompatibility} from '../rules/task-policy';
import {prepareRows} from './planner';

/** An already-observed compatible offer satisfies an offer goal before any
 * new block purchase or request. It does not earn a future combat reward. */
export function observedOfferGoal(data:Catalogue,p:Profile):Simulation|null{
  if(p.goal.kind!=='offer'||p.current.kind==='new'||p.points===null)return null;
  const master=data.masters.find(m=>m.id===p.current.masterId);if(!master)return null;
  const rows=prepareRows(data,master,p);
  const offered=p.current.kind==='offer'?p.current.options||[]:[{assignmentId:p.current.assignmentId,target:p.current.targetCompatible}];
  const hit=offered.some(option=>{
    const row=rows.find(r=>r.id===option.assignmentId);if(!row||row.reason||row.methodReason||!p.assumeUnknown&&row.unknown.length)return false;
    return actualTargetCompatibility(row,option.target,'actual');
  });
  if(!hit)return null;
  const count=Math.floor(p.simulation.trials);
  return {trials:count,successes:count,unresolved:0,meanHours:0,medianHours:0,p90Hours:0,sessionChance:1,sessionInterval:[1,1],exhaustionChance:0,meanSpent:0,meanEarned:0,meanRemaining:p.points,seed:p.simulation.seed,
    curve:Array.from({length:21},(_,i)=>({hours:p.simulation.sessionHours*i/20,chance:1,low:1,high:1})),
    notes:['A compatible target offer is already observed. No setup purchase, new request or future completion reward is needed.'],trace:['0.0 min · Compatible target already offered · '+p.points+' points']};
}
