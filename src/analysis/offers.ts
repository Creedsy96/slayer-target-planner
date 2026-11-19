import type {Row} from '../domain/types';
export function selectionProbabilities(rows:Row[],n:number,target=true):void{
  rows.forEach(r=>r.probability=0);n=Math.min(n,rows.length);const weight=rows.reduce((s,r)=>s+r.weight,0);if(!weight||!n)return;
  if(n===1){rows.forEach(r=>r.probability=r.weight/weight);return;}
  function recurse(picked:Row[],remaining:number,p:number):void{
    if(picked.length===n){
      const candidates=target?picked.filter(r=>r.isTarget&&r.targetFraction>0):[];
      const chosen=(candidates.length?candidates:picked).reduce((a,b)=>a.minutes<b.minutes?a:a.minutes===b.minutes&&a.id.localeCompare(b.id)<0?a:b);
      chosen.probability+=p;return;
    }
    for(const row of rows)if(!picked.includes(row))recurse([...picked,row],remaining-row.weight,p*row.weight/remaining);
  }
  recurse([],weight,1);
}
export function sampleOffer(rows:Row[],n:number,rng:()=>number):Row[]{
  const remaining=[...rows],chosen=[];for(let i=0;i<Math.min(n,rows.length);i++){
    let roll=rng()*remaining.reduce((s,r)=>s+r.weight,0),index=remaining.length-1;
    for(let j=0;j<remaining.length;j++){roll-=remaining[j].weight;if(roll<0){index=j;break;}}
    chosen.push(remaining.splice(index,1)[0]);
  }return chosen;
}
