import raw from '../../data/mortimer-modifiers.json';
import type {Catalogue,Source} from '../domain/types';

export type Mortifier='points'|'quantity'|'clue'|'superior'|'xp';
export interface MortimerTask {id:string;name:string;points:number[];quantity:number[];clue:number[]|null;superior:number[];xp:number[]}
export interface MortimerRules {
  version:string;step:number;guaranteedModifier:boolean;valueDistributionProvenance:string;
  source:Source;officialSource:Source;categories:{kind:Mortifier;tasks:number}[];thirdChoiceAt:number;tasks:MortimerTask[];
}
export const MORTIMER_RULES=raw as MortimerRules;
export const MORTIMER_VERSION=MORTIMER_RULES.version;
const byId=new Map(MORTIMER_RULES.tasks.map(t=>[t.id,t]));
export function mortimerRule(id:string):MortimerTask{
  const rule=byId.get(id);if(!rule)throw Error('No reviewed Mortimer modifier ranges for '+id);return rule;
}
export function mortimerKinds(tasks:number):Mortifier[]{return MORTIMER_RULES.categories.filter(c=>tasks>=c.tasks).map(c=>c.kind);}
export function modifierValues(bounds:number[]|null|undefined):number[]{
  if(!bounds?.length)return [0];
  const [low,high]=bounds;
  if(bounds.length!==2||!Number.isInteger(low)||!Number.isInteger(high)||low>high||(high-low)%MORTIMER_RULES.step!==0)throw Error('Invalid five-step Mortimer range.');
  return Array.from({length:(high-low)/MORTIMER_RULES.step+1},(_,i)=>low+i*MORTIMER_RULES.step);
}
export function rollMortimer(id:string,tasks:number,rng:()=>number):{kind:Mortifier;value:number|null}{
  const kinds=mortimerKinds(tasks),kind=kinds[Math.floor(rng()*kinds.length)];
  const bounds=mortimerRule(id)[kind];
  if(bounds===null)return {kind,value:null};
  const values=modifierValues(bounds);return {kind,value:values[Math.floor(rng()*values.length)]};
}
export function applyMortimerRules(base:Catalogue):Catalogue{
  return {...base,masters:base.masters.map(m=>{
    if(m.id!=='mortimer')return m;
    if(m.tasks.length!==byId.size)throw Error('Mortimer task list and modifier rules disagree.');
    return {...m,tasks:m.tasks.map(entry=>{
      const r=mortimerRule(entry.id);
      return {...entry,pointsRange:[...r.points],quantityModifier:[...r.quantity],modifierValuesStatus:'published-ranges-uniform-discrete'};
    })};
  })};
}
