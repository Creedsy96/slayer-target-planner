import type {Master,Plan,Profile,ResetEstimate,Row} from '../domain/types';
import {paidSkipFraction,shouldReset} from '../rules/task-policy';

const sum=(rows:Row[],fn:(r:Row)=>number)=>rows.reduce((s,r)=>s+fn(r),0);
/** First-step renewal equation: E = cycleMinutes + (1-successPerCycle)*E.
 * One cycle requests the main master, then requests Turael only on a reset.
 * Target offers stop before combat. No finite point balance or streak rewards
 * are averaged into this offer-time estimate; simulation handles those facts.
 */
export function resetEstimate(master:Master,rows:Row[],filler:Plan,p:Profile,fallback=new Map<Row,Row>()):ResetEstimate{
  const replacement=filler.rows.filter(r=>!r.reason&&!r.blocked);
  const target=(r:Row)=>r.isTarget?r.targetFraction:0;
  const actionMinutes=(r:Row)=> (1-paidSkipFraction(r,p))*r.minutes+paidSkipFraction(r,p)*p.skipSeconds/60;
  const action=(r:Row)=>fallback.get(r)||r;
  const rate=sum(rows,r=>shouldReset(master,action(r),p,filler.master)?r.probability*(1-target(r)):0);
  const directChance=sum(rows,r=>r.probability*target(r));
  const fillerChance=sum(replacement,r=>r.probability*target(r));
  const replacementMinutes=p.requestMinutes+sum(replacement,r=>r.probability*(1-target(r))*actionMinutes(r));
  const cycleMinutes=p.requestMinutes+sum(rows,r=>r.probability*(1-target(r))*(shouldReset(master,action(r),p,filler.master)?p.skipSeconds/60+replacementMinutes:actionMinutes(action(r))));
  return {rate,directChance,fillerChance,replacementMinutes,cycleMinutes,successPerCycle:directChance+rate*fillerChance,requestsPerCycle:1+rate,fillerBlocks:[...filler.blocks],
    paidSkipsPerCycle:sum(rows,r=>r.probability*(1-target(r))*paidSkipFraction(action(r),p))+rate*sum(replacement,r=>r.probability*paidSkipFraction(r,p))};
}
