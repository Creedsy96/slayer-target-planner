import type {Catalogue,Entry,Plan,Profile,ExtensionComparison} from '../domain/types';
import {clone} from '../state/profiles';
import {setTaskExtension} from '../state/task-extensions';
import {configuredMethod} from '../combat/priority';
import {evaluate} from './planner';
import {taskTiming} from './timing';

const extendable=(entry:Entry)=>entry.extendedMin>0&&entry.extendedMax>=entry.extendedMin;
export function compareTargetExtensions(data:Catalogue,plan:Plan,p:Profile):ExtensionComparison[]{
  const fillerId=p.strategy==='boost-mazchna'?'mazchna':['boost-turael','reset-turael'].includes(p.strategy)?'turael':'';
  const masters=[plan.master,...data.masters.filter(m=>m.id===fillerId&&m.id!==plan.master.id)];
  return [...new Set(p.goal.targets.map(t=>t.assignmentId))].map(assignmentId=>{
    const entries=masters.flatMap(master=>master.tasks.filter(e=>e.id===assignmentId&&extendable(e)).map(entry=>({master,entry})));
    const target=[...p.goal.targets].filter(t=>t.assignmentId===assignmentId).sort((a,b)=>b.priority-a.priority)[0];
    const enabled=configuredMethod(data,p,assignmentId,target.variantId).extended;
    const quantities=entries.map(({master,entry})=>({master:master.name,normal:[entry.minimum,entry.maximum] as [number,number],extended:[entry.extendedMin,entry.extendedMax] as [number,number],source:entry.source}));
    const result:ExtensionComparison={assignmentId,enabled,quantities,normalRate:null,extendedRate:null};
    if(!entries.length){result.reason='No target-task extension is offered by this master or its filler schedule.';return result;}
    if(entries.some(({entry})=>configuredMethod(data,p,entry.id,target.variantId).timing==='task-minutes')){
      result.reason='Measured minutes per whole task need a separate extended-task measurement. Use DPS or measured kills per hour to compare extensions.';return result;
    }
    const rate=(extended:boolean)=>{
      const scenario=clone(p);setTaskExtension(scenario,assignmentId,extended);
      // Reuse calculated combat results. Only assignment quantity changes.
      const rows=plan.rows.map(row=>{
        const clean={...row,skip:0,probability:0,blocked:false};
        if(row.id!==assignmentId)return clean;
        const method={...row.method,extended},timing=taskTiming(row.entry,row.variant,method);
        return {...clean,method,...timing,meanKills:timing.kills};
      });
      return evaluate(data,plan.master,scenario,plan.blocks,'Extension comparison with the same blocks',false,rows);
    };
    const normal=rate(false),extended=rate(true);
    result.normalRate=normal.targetKillsPerHour;result.extendedRate=extended.targetKillsPerHour;
    result.reason=normal.targetRateReason||extended.targetRateReason;
    return result;
  });
}
export function withExtensionComparisons(data:Catalogue,plan:Plan,p:Profile):Plan{
  return {...plan,extensions:compareTargetExtensions(data,plan,p)};
}
