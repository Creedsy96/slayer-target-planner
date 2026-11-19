import type {Catalogue,Master,Plan,Profile,Simulation} from '../domain/types';
import {clone} from '../state/profiles';
import {evaluate,optimise,prepareRows} from './planner';
import {simulate} from './simulation';
import {blockSlots,targetAssignments} from '../rules/eligibility';

// Candidate search uses the actual stopping event and legal ledger, with common
// random seeds. It is bounded and explicitly does not certify a global optimum.
export function searchHunt(data:Catalogue,master:Master,p:Profile,progress?:(n:number,total:number)=>void):{plan:Plan;result:Simulation}{
  const baseline=optimise(data,master,p,100),targets=targetAssignments(data,p);
  const eligible=prepareRows(data,master,p).filter(r=>!r.reason&&!targets.has(r.id)&&p.preferences[r.id]!=='protect');
  const configurations:string[][]=[baseline.blocks,p.blocks[master.group]||[],[]];
  for(const row of eligible.sort((a,b)=>b.weight*b.minutes-a.weight*a.minutes).slice(0,8)){
    if(baseline.blocks.includes(row.id))continue;
    for(let i=0;i<Math.min(2,baseline.blocks.length);i++){const list=[...baseline.blocks];list[i]=row.id;configurations.push(list);}
  }
  const candidates=Object.hasOwn(p.proposed,master.group)?[baseline.blocks]:configurations;
  const unique=[...new Map(candidates.map(b=>[[...b].sort().join('|'),b])).values()].filter(b=>b.length<=blockSlots(master,p).slots);
  const scenario=clone(p);scenario.simulation.trials=Math.min(400,p.simulation.trials);
  let best:Plan|undefined,bestScore=Infinity;
  for(let i=0;i<unique.length;i++){
    const plan=evaluate(data,master,scenario,unique[i]);
    try{
      const result=simulate(data,plan,scenario);
      // Session success is primary for censored runs; points are compared only
      // when the estimated mean fits the requested time limit.
      const score=p.objective==='chance'?-result.sessionChance:p.objective==='points'?(result.meanHours===null||result.meanHours>p.simulation.sessionHours?1e9+(result.meanHours??1e6):result.meanSpent):result.meanHours??1e6*(1-result.sessionChance)+(result.medianHours??1e5);
      if(score<bestScore){best=plan;bestScore=score;}
    }catch(error){if(unique.length===1)throw error;}
    progress?.(i+1,unique.length);
  }
  if(!best)throw Error('No legal candidate could be simulated. Confirm points, streaks and current assignment.');
  best.quality=`Best of ${unique.length} simulated block candidates for ${p.goal.kind} / ${p.objective}; ${scenario.simulation.trials} seeded search trials, heuristic policies, no global optimality claim`;
  return {plan:best,result:simulate(data,best,p)};
}
