/** Eclipse's five independent 40-tick burns. One proc trial per accurate attack. */
export interface EclipseHit {damage:number;probability:number;accurate:boolean}
const sustainedCache=new Map<string,number>();
export function eclipseBurnDps(accuracy:number,ticks:number):number{
 if(!Number.isFinite(accuracy)||accuracy<0||accuracy>1||![3,4].includes(ticks))throw Error('Unsupported Eclipse accuracy or attack cycle.');
 const key=accuracy+':'+ticks,cached=sustainedCache.get(key);if(cached!==undefined)return cached;
 const size=1<<Math.ceil(40/ticks),mask=size-1,pop=new Uint8Array(size),proc=accuracy*.2;
 for(let i=1;i<size;i++)pop[i]=pop[i>>1]+(i&1);
 let mass=new Float64Array(size);mass[0]=1;let accepted=0;
 for(let iteration=0;iteration<256;iteration++){
  const next=new Float64Array(size);accepted=0;
  for(let i=0;i<size;i++)if(mass[i]){
   const shifted=(i<<1)&mask,p=pop[shifted]<5?proc:0;
   next[shifted]+=mass[i]*(1-p);next[shifted|1]+=mass[i]*p;accepted+=mass[i]*p;
  }
  let difference=0;for(let i=0;i<size;i++)difference+=Math.abs(next[i]-mass[i]);
  mass=next;if(difference<1e-12)break;
 }
 const dps=accepted*10/(ticks*.6);sustainedCache.set(key,dps);
 if(sustainedCache.size>128)sustainedCache.delete(sustainedCache.keys().next().value!);
 return dps;
}

/** Paired, seeded finite-fight estimate with exact direct-hit TTK as a control
 * variate. Dead targets receive no remaining DoT; burns never carry to a kill. */
export function eclipseKillTime(hp:number,ticks:number,hits:EclipseHit[],directTtk:number,trials=2048):{seconds:number;error:number}{
 if(!Number.isInteger(hp)||hp<1||![3,4].includes(ticks)||!Number.isFinite(directTtk)||directTtk<=0||!Number.isInteger(trials)||trials<2||!hits.length||hits.some(h=>!Number.isInteger(h.damage)||h.damage<0||!Number.isFinite(h.probability)||h.probability<0)||!hits.some(h=>h.damage>0&&h.probability>0)||Math.abs(hits.reduce((n,h)=>n+h.probability,0)-1)>1e-6)throw Error('Invalid Eclipse kill-time inputs.');
 const cdf:number[]=[];let sum=0;for(const hit of hits){sum+=hit.probability;cdf.push(sum);}
 const pick=(u:number)=>{let lo=0,hi=cdf.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(u<cdf[mid])hi=mid;else lo=mid+1;}return hits[lo];};
 let total=0,squares=0;
 for(let trial=0;trial<trials;trial++){
  let seed=(0x9e3779b9^Math.imul(trial+1,0x85ebca6b))>>>0;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  let direct=hp,burning=hp,attack=ticks,pulse=Infinity,finish=0,count=0;let expires:number[]=[];
  while(direct>0||burning>0){
   if(++count>100000)throw Error('Eclipse kill-time convergence limit.');
   if(burning>0&&pulse<=attack){
    expires=expires.filter(end=>end>=pulse);burning-=expires.length;
    if(burning<=0){finish=pulse;continue;}
    expires=expires.filter(end=>end>pulse);pulse=expires.length?pulse+4:Infinity;continue;
   }
   const hit=pick(random()),roll=random();direct-=hit.damage;
   if(burning>0){
    burning-=hit.damage;expires=expires.filter(end=>end>attack);
    if(burning<=0)finish=attack;
    else if(hit.accurate&&roll<.2&&expires.length<5){expires.push(attack+40);if(!Number.isFinite(pulse))pulse=attack+4;}
   }
   if(direct<=0&&burning<=0){const difference=(finish-attack)*.6;total+=difference;squares+=difference*difference;break;}
   attack+=ticks;
  }
 }
 const mean=total/trials;
 return {seconds:Math.max(.6,directTtk+mean),error:Math.sqrt(Math.max(0,squares/trials-mean*mean)/trials)};
}
