import type {Entry,Master,Profile} from '../domain/types';
import {MORTIMER_RULES,mortimerKinds,modifierValues} from './mortimer';
import {negativeUnknowns} from './unknown-policy';
export interface Ledger {points:number;spent:number;earned:number;streaks:Record<string,number>;mortimerTasks:number}
export function pointRewardUnknown(m:Master,p:Profile):string[]{
  if(m.id==='nieve'&&p.diaries.western==null)return ['Western elite diary point bonus'];
  if(m.id==='konar'&&p.diaries.kourend==null)return ['Kourend elite diary point bonus'];
  return [];
}
export function basePoints(m:Master,p:Profile):number{
  if(m.id==='nieve'&&(p.diaries.western===1||p.diaries.western==null&&p.assumeUnknown&&!negativeUnknowns(p)))return 15;
  if(m.id==='konar'&&(p.diaries.kourend===1||p.diaries.kourend==null&&p.assumeUnknown&&!negativeUnknowns(p)))return 20;
  return m.basePoints;
}
export function milestoneMultiplier(n:number):number{
  for(const [interval,factor]of [[1000,50],[250,35],[100,25],[50,15],[10,5]])if(n%interval===0)return factor;
  return 1;
}
export function modifierKinds(tasks:number,entry?:Entry):string[]{
  return mortimerKinds(tasks);
}
export function choices(p:Profile):number{return p.hypotheticalChoices??((p.mortimerTasks??0)>=MORTIMER_RULES.thirdChoiceAt?3:2);}
export function rangeValues(bounds:number[]|undefined):number[]{
  return modifierValues(bounds);
}
export function meanModifierPoints(entry:Entry):number{
  const values=rangeValues(entry.pointsRange);return values.reduce((a,b)=>a+b,0)/values.length;
}
export function completionReward(m:Master,p:Profile,streak:number,entry?:Entry,modifier='none',pointsValue?:number):number{
  if(m.id==='mortimer'){
    if(modifier!=='points')return 0;
    if(!entry?.pointsRange||pointsValue===undefined||!rangeValues(entry.pointsRange).includes(pointsValue))throw Error('Enter a valid actual Mortimer point modifier; a mean is not a received reward.');
    return pointsValue;
  }
  if(streak<5)return 0;
  const unknown=pointRewardUnknown(m,p);if(unknown.length&&!p.assumeUnknown&&!negativeUnknowns(p))throw Error('Confirm '+unknown.join(', ')+' before calculating received points.');
  return basePoints(m,p)*milestoneMultiplier(streak);
}
export function ledger(p:Profile):Ledger{
  if(p.points===null&&!negativeUnknowns(p))throw Error('Enter your current points for a funded plan.');
  return {points:p.points??0,spent:0,earned:0,streaks:Object.fromEntries(Object.entries(p.streaks).map(([k,v])=>[k,v??0])),mortimerTasks:p.mortimerTasks??0};
}
export function pay(l:Ledger,cost:number,reserve:number):boolean{
  if(cost<0||!Number.isFinite(cost))throw Error('Invalid action cost.');
  if(l.points-cost<reserve)return false;l.points-=cost;l.spent+=cost;return true;
}
export function complete(l:Ledger,m:Master,p:Profile,entry:Entry,modifier='none',pointsValue?:number):number{
  if(m.id==='mortimer'&&!modifierKinds(l.mortimerTasks,entry).includes(modifier))throw Error('Choose an unlocked actual Mortimer modifier.');
  const next=(l.streaks[m.streakGroup]||0)+1;const earned=completionReward(m,p,next,entry,modifier,pointsValue);
  l.streaks[m.streakGroup]=next;if(m.id==='mortimer')l.mortimerTasks++;
  l.points+=earned;l.earned+=earned;return earned;
}
export function canReset(m:Master,assignmentId:string,filler:Master,blocked:string[]=[]):boolean{
  return m.id!=='mortimer'&&m.group!=='beginner'&&(!filler.tasks.some(t=>t.id===assignmentId)||blocked.includes(assignmentId));
}
export function resetStreak(l:Ledger,m:Master):void{l.streaks[m.streakGroup]=0;}
