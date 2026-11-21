import type {BoostEstimate,Plan,Profile,Row} from '../domain/types';
import {completionReward} from '../rules/points';
import {offerMoments} from './offer-moments';

/** Solve E[s] = cost[s] + skip[s]*E[s] + complete[s]*E[s+1]
 * around the completion-count period. A paid skip does not advance a phase.
 * Point-farming rates use the full 1000-completion reward cycle, separately
 * from a hunt that stops on the first compatible target offer. */
export function boostEstimate(main:Plan,filler:Plan,p:Profile,fallback=new Map<Row,Row>()):BoostEstimate{
  const high=offerMoments(main.rows,p,fallback),low=offerMoments(filler.rows,p,fallback);
  const period=p.milestone,start=(p.streaks.normal??0)%period;
  let survival=1,minutes=0,requests=0,skips=0,stalled=false;
  for(let i=0;i<period&&survival>0;i++){
    const phase=(start+i)%period,moments=phase===period-1?high:low,exit=1-moments.skip;
    if(exit<=1e-14){stalled=true;break;}
    minutes+=survival*moments.beforeTarget/exit;
    requests+=survival/exit;skips+=survival*moments.skip/exit;
    survival*=moments.complete/exit;
  }
  const success=1-survival,finite=!stalled&&success>1e-14;
  const until=(period-1-start+period)%period,next=(p.streaks.normal??0)+until+1;
  let reward=0,totalMinutes=0,totalSpent=0;
  for(let n=1;n<=1000;n++){
    const selected=n%period===0?main:filler,moments=n%period===0?high:low,kept=1-moments.skip;
    reward+=completionReward(selected.master,p,n+1000);
    totalMinutes+=kept>0?moments.full/kept:Infinity;
    totalSpent+=kept>0?moments.skip/kept*selected.master.skipCost:Infinity;
  }
  let huntKills=0,huntMinutes=0;
  for(const [moments,count] of [[high,1],[low,period-1]] as const){
    if(!count)continue;
    const kept=1-moments.skip;
    huntKills+=kept>0?count*moments.targetKills/kept:0;
    huntMinutes+=kept>0?count*moments.full/kept:Infinity;
  }
  return {fillerId:filler.master.id,fillerBlocks:[...filler.blocks],startStreak:p.streaks.normal!,milestone:period,fillerCompletionsBeforeMain:until,nextMainCompletion:next,
    nextMainReward:completionReward(main.master,p,next),mainChance:high.target,fillerChance:low.target,
    minutes:finite?minutes/success:null,requests:finite?requests/success:null,paidSkips:finite?skips/success:null,
    pointsEarnedPerHour:Number.isFinite(totalMinutes)&&totalMinutes>0?reward*60/totalMinutes:null,
    pointsSpentPerHour:Number.isFinite(totalMinutes)&&totalMinutes>0?totalSpent*60/totalMinutes:null,
    targetKillsPerHour:Number.isFinite(huntMinutes)&&huntMinutes>0?huntKills*60/huntMinutes:null,
    rewardPer1000:reward,cycleMinutes:totalMinutes};
}
