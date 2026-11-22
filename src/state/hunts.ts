import type {Catalogue,HuntPreset,Profile,TaskRecord,Row} from '../domain/types';
import {clone,validateProfile} from './profiles';
import {prepareRows} from '../analysis/planner';
import {complete,ledger,pay,modifierKinds,rangeValues,pointRewardUnknown} from '../rules/points';
import {masterEligibility} from '../rules/eligibility';

export function saveHunt(p:Profile,name:string,masterId:string,id:string):Profile{
  if(!name.trim()||name.length>100)throw Error('Enter a hunt name of 1–100 characters.');
  const q=clone(p),preset:HuntPreset={id,name:name.trim(),masterId,goal:clone(p.goal),strategy:p.strategy,objective:p.objective,proposed:clone(p.proposed),preferences:clone(p.preferences),methods:clone(p.methods),extensions:clone(p.extensions||{}),milestone:p.milestone};
  q.huntPresets=(q.huntPresets||[]).filter(h=>h.name.toLowerCase()!==preset.name.toLowerCase());
  if(q.huntPresets.length>=30)throw Error('Maximum 30 hunt presets per profile.');
  q.huntPresets.push(preset);return q;
}
export function loadHunt(data:Catalogue,p:Profile,id:string):{profile:Profile;masterId:string}{
  const h=p.huntPresets?.find(h=>h.id===id);if(!h)throw Error('Choose a saved hunt.');
  const q=clone(p);for(const key of ['goal','strategy','objective','proposed','preferences','methods','milestone']as const)(q as any)[key]=clone(h[key]);
  if(h.extensions!==undefined)q.extensions=clone(h.extensions);else delete q.extensions;
  return {profile:validateProfile(data,q),masterId:h.masterId};
}
export interface TaskInput {masterId:string;assignmentId:string;action:'complete'|'skip';modifier:string;modifierPoints:number;combatMinutes:number|null;kills:number|null}
/** Applies a reviewed observation, never inferred completion or future rewards. */
export function recordTask(data:Catalogue,p:Profile,input:TaskInput,at:string,id:string,preparedRow?:Row):Profile{
  const q=clone(p),m=data.masters.find(m=>m.id===input.masterId);
  if(!m)throw Error('Choose a valid master.');
  const access=masterEligibility(m,q);
  if(access.failed.length||access.unknown.length&&!q.assumeUnknown)throw Error('Confirm master access before recording: '+[...access.failed,...access.unknown].join(', '));
  const row=preparedRow||prepareRows(data,m,q).find(r=>r.id===input.assignmentId);
  if(!row||row.id!==input.assignmentId||!m.tasks.some(t=>t.id===row.id)||row.reason)throw Error('This assignment is not eligible for the chosen master.');
  if(input.action==='complete'&&row.methodReason)throw Error('Select the actual available completion method first: '+row.methodReason);
  if(input.action!=='complete'&&input.action!=='skip')throw Error('Choose complete or skip.');
  if(q.streaks[m.streakGroup]===null||q.streaks[m.streakGroup]===undefined)throw Error('Enter the current streak before recording a task.');
  if(q.points!==null&&!Number.isInteger(q.points)||!Number.isInteger(q.streaks[m.streakGroup]))throw Error('Enter whole-number current points and streaks before recording.');
  for(const n of [input.combatMinutes,input.kills])if(n!==null&&(!Number.isFinite(n)||n<=0||n>1e7))throw Error('Measured minutes and actual kills must be positive, or left blank.');
  if(input.kills!==null&&!Number.isInteger(input.kills))throw Error('Actual kills must be a whole number.');
  if(m.id==='mortimer'&&input.action==='complete'){
    if(q.mortimerTasks===null||!Number.isInteger(q.mortimerTasks))throw Error('Enter completed Mortimer tasks as a whole number first.');
    if(!modifierKinds(q.mortimerTasks,row.entry).includes(input.modifier))throw Error('Choose an unlocked Mortimer modifier.');
    if(input.modifier==='points'&&!rangeValues(row.entry.pointsRange).includes(input.modifierPoints))throw Error('Enter a valid five-step point modifier from this task’s range.');
  }
  const l=ledger(q),before=l.points,streakBefore=l.streaks[m.streakGroup];
  if(input.action==='complete'&&streakBefore+1>=5&&pointRewardUnknown(m,q).length)throw Error('Confirm the elite diary point bonus before recording actual completion points.');
  if(input.action==='skip'){if(!pay(l,m.skipCost,q.reserve))throw Error('This skip would spend the point reserve.');}
  else complete(l,m,q,row.entry,input.modifier,input.modifierPoints);
  q.points=l.points;q.streaks=l.streaks;if(m.id==='mortimer')q.mortimerTasks=l.mortimerTasks;
  const record:TaskRecord={...input,id,at,variantId:row.variant.id,pointsBefore:before,pointsAfter:l.points,streakBefore,streakAfter:l.streaks[m.streakGroup],method:clone(row.method)};
  q.taskHistory=[...(q.taskHistory||[]),record].slice(-200);
  q.previousTask=row.id;q.previousMasterId=m.id;
  if(input.action==='complete')q.previousTargetCompatible=row.isTarget;
  else if(q.current.masterId===m.id&&q.current.assignmentId===row.id)q.previousTargetCompatible=q.current.targetCompatible;
  else delete q.previousTargetCompatible;
  if(q.current.masterId===m.id&&q.current.assignmentId===row.id)q.current={kind:'new',masterId:'',assignmentId:'',remaining:0};
  return validateProfile(data,q);
}
export function timingSuggestion(p:Profile,assignmentId:string,variantId:string){
  const rows=(p.taskHistory||[]).filter(r=>r.action==='complete'&&r.assignmentId===assignmentId&&r.variantId===variantId&&r.combatMinutes!==null&&r.kills!==null);
  const minutes=rows.reduce((s,r)=>s+r.combatMinutes!,0),kills=rows.reduce((s,r)=>s+r.kills!,0);
  return minutes>0?{rate:kills/minutes*60,samples:rows.length,minutes,kills}:null;
}
