import type {Master,Profile,Row} from '../domain/types';
import {canReset} from './points';

export function skipPreference(p:Profile,row:Row):boolean{
  return p.preferences[row.id]==='skip'||p.preferences[row.id]==='avoid';
}
export function protectedTask(p:Profile,row:Row):boolean{
  return row.isTarget||p.preferences[row.id]==='keep'||p.preferences[row.id]==='protect';
}
/** One paid-skip policy shared by estimates, lookup and simulated actions. */
export function paidSkipFraction(row:Row,p:Profile):number{
  if(p.strategy==='none'||protectedTask(p,row)||row.blocked||row.reason)return 0;
  return row.skip;
}
export function shouldReset(master:Master,row:Row,p:Profile,filler:Master):boolean{
  return p.strategy==='reset-turael'&&!protectedTask(p,row)&&master.id!==filler.id&&canReset(master,row.id,filler,p.blocks[filler.group]||[]);
}
export function actualTargetCompatibility(row:Row,confirmation:boolean|undefined,which:string):boolean{
  if(!row.isTarget)return false;
  if(row.targetFraction>0&&confirmation!==undefined)return confirmation;
  if(row.targetFraction>0&&row.targetFraction<1){
    if(confirmation===undefined)throw Error('Confirm whether the '+which+' task location supports the target variant.');
    return confirmation;
  }
  return row.targetFraction===1;
}
