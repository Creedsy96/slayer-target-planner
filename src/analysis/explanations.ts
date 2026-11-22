import type {Catalogue,Plan,Profile,Row} from '../domain/types';
import {evaluate} from './planner';
export function blockImpacts(data:Catalogue,plan:Plan,p:Profile,prepared?:Row[]):{id:string;chanceDelta:number|null;hoursSaved:number|null;cost:number}[]{
  const actual=p.blocks[plan.master.group]||[];
  return plan.blocks.map(id=>{
    const without=evaluate(data,plan.master,p,plan.blocks.filter(b=>b!==id),'Evaluated configuration',false,prepared);
    return {id,chanceDelta:plan.chance!==null&&without.chance!==null?plan.chance-without.chance:null,hoursSaved:plan.hours!==null&&without.hours!==null?without.hours-plan.hours:null,cost:actual.includes(id)?0:plan.master.blockCost};
  });
}
