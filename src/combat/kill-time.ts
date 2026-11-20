export interface DamageOutcome {damage:number;probability:number;seconds:number}
/** Expected full attack-cycle time, allowing damage/delay to change with HP.
 * Zero-damage loops are solved analytically; overkill ends the current kill. */
export function expectedKillSeconds(hitpoints:number,outcomesAtHp:(hp:number)=>DamageOutcome[]):number{
 if(!Number.isInteger(hitpoints)||hitpoints<1||hitpoints>100000)throw Error('Unsupported hitpoint total.');
 const times=new Float64Array(hitpoints+1);
 for(let hp=1;hp<=hitpoints;hp++){
  let total=0,zero=0,mass=0;
  for(const outcome of outcomesAtHp(hp)){
   if(!Number.isInteger(outcome.damage)||outcome.damage<0||!Number.isFinite(outcome.probability)||outcome.probability<0||!Number.isFinite(outcome.seconds)||outcome.seconds<=0)throw Error('Invalid attack outcome.');
   const p=outcome.probability;mass+=p;total+=p*outcome.seconds;
   if(outcome.damage===0)zero+=p;else total+=p*times[Math.max(0,hp-outcome.damage)];
  }
  if(Math.abs(mass-1)>1e-6||zero>=1)return Infinity;
  times[hp]=total/(1-zero);
 }return times[hitpoints];
}
