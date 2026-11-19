import type {Catalogue,Plan,Profile,Row} from '../domain/types';
import {canReset} from '../rules/points';

export interface SkipRecommendation {row:Row;fraction:number;manual:boolean}
export interface SkipRecommendations {full:SkipRecommendation[];partial:SkipRecommendation[];resets:Row[]}

/** Describe the selected policy without changing its calculated probabilities. */
export function skipRecommendations(data:Catalogue,plan:Plan,p:Profile):SkipRecommendations{
  const result:SkipRecommendations={full:[],partial:[],resets:[]};
  if(p.strategy==='none')return result;
  const filler=data.masters.find(m=>m.id==='turael')!;
  for(const row of plan.rows){
    if(row.reason||row.blocked||row.isTarget)continue;
    if(p.strategy==='reset-turael'&&plan.master.id!==filler.id&&canReset(plan.master,row.id,filler)){
      result.resets.push(row);continue;
    }
    const manual=p.preferences[row.id]==='skip'||p.preferences[row.id]==='avoid';
    const fraction=manual?1:row.skip;
    if(fraction<=1e-9)continue;
    const item={row,fraction,manual};
    (fraction>=1-1e-9?result.full:result.partial).push(item);
  }
  result.full.sort((a,b)=>a.row.name.localeCompare(b.row.name));
  result.partial.sort((a,b)=>a.row.name.localeCompare(b.row.name));
  result.resets.sort((a,b)=>a.name.localeCompare(b.name));
  return result;
}
