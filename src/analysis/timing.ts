import type {Entry,Method,Variant} from '../domain/types';
export function meanKills(entry:Entry,method:Method):number{
  const lo=method.extended&&entry.extendedMax?entry.extendedMin:entry.minimum;
  const hi=method.extended&&entry.extendedMax?entry.extendedMax:entry.maximum;
  let total=0;
  for(let n=lo;n<=hi;n++)total+=expectedKills(n,method.bracelet);
  return total/(hi-lo+1);
}
export function expectedKills(n:number,bracelet:Method['bracelet']):number{
  if(n<=0)return 0;if(bracelet==='none')return n;if(bracelet==='slaughter')return n/.75;
  let previous=0,current=0;for(let count=1;count<=Math.ceil(n);count++){const next=1+.75*current+.25*previous;previous=current;current=next;}return current;
}
export function taskTiming(entry:Entry,v:Variant,method:Method):{kills:number;seconds:number;minutes:number}{
  const kills=meanKills(entry,method);
  if(method.timing==='task-minutes')return {kills,seconds:method.rate*60/kills,minutes:method.rate+method.travel};
  const seconds=method.timing==='kills-hour'?3600/method.rate:v.hp/(method.dps*v.multiplier)+method.delay;
  return {kills,seconds,minutes:kills*seconds/60+method.travel};
}
export function sampleQuantity(entry:Entry,method:Method,rng:()=>number,modifier=0):number{
  const lo=method.extended&&entry.extendedMax?entry.extendedMin:entry.minimum;
  const hi=method.extended&&entry.extendedMax?entry.extendedMax:entry.maximum;
  return Math.max(1,lo+Math.floor(rng()*(hi-lo+1))+modifier);
}
export function sampleKills(quantity:number,method:Method,rng:()=>number):number{
  if(method.bracelet==='none')return quantity;
  let remaining=quantity,kills=0;
  while(remaining>0&&kills<100000){kills++;const effect=rng()<.25;remaining-=method.bracelet==='slaughter'?(effect?0:1):(effect?2:1);}
  if(remaining>0)throw Error("Bracelet simulation exceeded its safety bound.");
  return kills;
}
