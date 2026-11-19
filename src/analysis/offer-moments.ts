import type {Profile,Row} from '../domain/types';
import {paidSkipFraction} from '../rules/task-policy';

/** One request, with compatible targets stopping before combat. Full-time
 * moments instead complete target tasks and support long-run point rates. */
export function offerMoments(rows:Row[],p:Profile,fallback=new Map<Row,Row>()){
  let target=0,skip=0,beforeTarget=p.requestMinutes,full=p.requestMinutes;
  for(const row of rows.filter(r=>!r.reason&&!r.blocked)){
    const hit=row.isTarget?row.targetFraction:0,other=fallback.get(row)||row;
    const fraction=paidSkipFraction(other,p),cost=fraction*p.skipSeconds/60+(1-fraction)*other.minutes;
    target+=row.probability*hit;skip+=row.probability*(1-hit)*fraction;
    beforeTarget+=row.probability*(1-hit)*cost;
    full+=row.probability*(hit*row.minutes+(1-hit)*cost);
  }
  return {target,skip,complete:Math.max(0,1-target-skip),beforeTarget,full};
}
