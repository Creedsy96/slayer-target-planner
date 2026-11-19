import type {Entry,Master,Profile} from '../domain/types';
export interface Ledger {points:number;spent:number;earned:number;streaks:Record<string,number>;mortimerTasks:number}
export function basePoints(m:Master,p:Profile):number{
  if(m.id==='nieve'&&p.diaries.western===1)return 15;
  if(m.id==='konar'&&p.diaries.kourend===1)return 20;
  return m.basePoints;
}
export function milestoneMultiplier(n:number):number{
  for(const [interval,factor]of [[1000,50],[250,35],[100,25],[50,15],[10,5]])if(n%interval===0)return factor;
  return 1;
}
export function modifierKinds(tasks:number,entry?:Entry):string[]{
  const kinds=['points','quantity'];
  if(tasks>=15)kinds.push('clue');if(tasks>=25)kinds.push('superior');if(tasks>=40)kinds.push('xp');
  return kinds;
}
export function choices(p:Profile):number{return p.hypotheticalChoices??((p.mortimerTasks??0)>=50?3:2);}
export function rangeValues(bounds:number[]|undefined):number[]{
  if(!bounds?.length)return [0];const low=Math.min(...bounds),high=Math.max(...bounds),values=[];
  for(let n=low;n<=high;n+=5)values.push(n);return values.length?values:[low];
}
export function meanModifierPoints(entry:Entry):number{
  const values=rangeValues(entry.pointsRange);return values.reduce((a,b)=>a+b,0)/values.length;
}
export function completionReward(m:Master,p:Profile,streak:number,entry?:Entry,modifier='none',pointsValue?:number):number{
  if(m.id==='mortimer')return modifier==='points'?pointsValue??meanModifierPoints(entry!):0;
  if(streak<5)return 0;return basePoints(m,p)*milestoneMultiplier(streak);
}
export function ledger(p:Profile):Ledger{
  if(p.points===null)throw Error('Enter your current points for a funded plan.');
  return {points:p.points,spent:0,earned:0,streaks:Object.fromEntries(Object.entries(p.streaks).map(([k,v])=>[k,v??0])),mortimerTasks:p.mortimerTasks??0};
}
export function pay(l:Ledger,cost:number,reserve:number):boolean{
  if(cost<0||!Number.isFinite(cost))throw Error('Invalid action cost.');
  if(l.points-cost<reserve)return false;l.points-=cost;l.spent+=cost;return true;
}
export function complete(l:Ledger,m:Master,p:Profile,entry:Entry,modifier='none',pointsValue?:number):number{
  const next=(l.streaks[m.streakGroup]||0)+1;const earned=completionReward(m,p,next,entry,modifier,pointsValue);
  l.streaks[m.streakGroup]=next;if(m.id==='mortimer')l.mortimerTasks++;
  l.points+=earned;l.earned+=earned;return earned;
}
export function canReset(m:Master,assignmentId:string,filler:Master):boolean{
  return m.id!=='mortimer'&&m.group!=='beginner'&&!filler.tasks.some(t=>t.id===assignmentId);
}
export function resetStreak(l:Ledger,m:Master):void{l.streaks[m.streakGroup]=0;}
