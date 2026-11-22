import type {Catalogue,Plan,Profile,Requirement,Source,Row} from '../domain/types';
import {check,masterRequirements} from '../rules/eligibility';
import {resolveAccess,accessFactFilter} from '../rules/access';
import {firstDisabledLocation} from '../rules/location-pool';

export interface PlanIssue {
  title:string;detail:string;route:'account'|'methods'|'tasks'|'plan'|'data'|'settings';action:string;source:Source;
  assignmentId?:string;variantId?:string;filter?:string;field?:string;
}

export function explainPlanIssues(data:Catalogue,plan:Plan,p:Profile):PlanIssue[]{
  const issues:PlanIssue[]=[],represented=new Set<string>();
  const add=(issue:PlanIssue):void=>{if(!issues.some(i=>i.title===issue.title&&i.assignmentId===issue.assignmentId))issues.push(issue);};
  const facts=(requirements:Requirement[],source:Source,context:string):void=>{
    for(const r of requirements){
      const state=check([r],p);if(state.eligible&&!state.unknown.length)continue;
      represented.add(r.label);
      const instruction=r.kind==='unlock'?(r.min===0?'This reward must be off for this assignment.':'Record this reward as purchased only if you own it, or choose another target.'):
        r.kind==='quest'?`Required quest stage: ${(r.min??1)>=2?'completed':'started'}. Import quests or update the manual stage.`:
        r.kind==='skill'?`Required level: ${r.min??1}. Check the recorded level or choose another target.`:
        r.kind==='access'?'Confirm this access requirement or choose another method.':'At least one listed alternative requirement must be satisfied.';
      add({title:r.label,detail:`${context}: ${state.unknown.length?'unknown':'not satisfied'}. ${instruction}`,route:'account',action:'Review account requirement',source,filter:r.kind==='skill'||r.kind==='any'?'':r.kind==='unlock'?r.label:r.kind==='access'?accessFactFilter(r.key||'',p):r.key});
    }
  };
  facts(masterRequirements(plan.master,p),plan.master.source,plan.master.name);
  const relevantRows=plan.rows.filter(r=>r.isTarget||(!r.reason&&!r.blocked)).sort((a,b)=>Number(b.isTarget)-Number(a.isTarget));
  for(const row of relevantRows){
    facts(row.entry.requirements,row.entry.source,row.name);
    facts(row.variant.requirements,row.variant.source,row.variant.name);
    if(row.methodReason&&(row.isTarget||row.skip<1)){
      const pool=p.restrictBasicAccess&&/location pool|method location.*locked/i.test(row.methodReason);
      add({title:`${row.isTarget?'Target method':'Non-target method'}: ${row.name} → ${row.variant.name}`,detail:row.methodReason+'. '+(pool?'Review the character location restrictions or choose another creature.':row.isTarget?'Choose a supported target variant.':'This assignment can still be offered while waiting for your target; its configured completion method is incompatible. Review that method or block/skip the assignment.'),route:pool?'settings':row.isTarget?'plan':'methods',action:pool?'Review location pool':row.isTarget?'Review target variant':'Review completion method',source:row.variant.source,assignmentId:row.id,variantId:row.variant.id,field:pool?undefined:'variantId',filter:pool?firstDisabledLocation(row.variant.id,p)?.slice(9):undefined});
    }
    if(row.isTarget&&plan.master.id==='konar')locationIssues(row,p,add);
  }
  for(const message of plan.unknown){
    if(represented.has(message)||issues.some(i=>i.title===message))continue;
    const row=plan.rows.find(r=>r.isTarget&&r.unknown.includes(message));
    const modelling=/Konar|compatibility|uniform|estimated|modifier range/i.test(message);
    add({title:message,detail:modelling?'This is a model assumption, not missing account access. Review its source; use a conditional scenario only if you accept the assumption.':'This account fact needs confirmation before an unconditional calculation.',route:row?'methods':modelling?'data':'account',action:row?'Review target method':modelling?'Review model information':'Review account facts',source:row?.entry.source??plan.master.source,assignmentId:row?.id,variantId:row?.variant.id,field:row?'locationChance':undefined});
  }
  for(const conflict of plan.conflicts)add({title:conflict,detail:'Review the actual and proposed block lists for this master. Targets cannot be blocked.',route:'tasks',action:'Review blocks',source:plan.master.source});
  if(plan.reason&&!issues.length){
    const method=/completion method/i.test(plan.reason),task=/block|reserve|points/i.test(plan.reason);
    add({title:plan.reason,detail:'Review this configuration before calculating. Master-specific assignment and variant restrictions still apply.',route:method?'methods':task?'tasks':'plan',action:method?'Review completion methods':task?'Review configuration':'Review hunt settings',source:plan.master.source});
  }
  return issues;
}

function locationIssues(row:Row,p:Profile,add:(issue:PlanIssue)=>void):void{
  const all=row.entry.locations||[];
  if(all.length&&all.every(loc=>resolveAccess('location:'+loc,p).value===0))add({title:`${row.name}: every assigned area is marked inaccessible`,detail:`All locations in Konar's pool are closed: ${all.join(', ')}. Review the quest, skill or special entrance requirements, or choose another target.`,route:'account',action:'Review access requirements',source:row.entry.source,filter:accessFactFilter('location:'+all[0],p),assignmentId:row.id});
  if(row.method.location){
    const access=resolveAccess('location:'+row.method.location,p);
    if(access.value===0)add({title:`${row.method.location}: access is off`,detail:access.reason+' Review the owning quest, skill or entrance fact, or choose another method location.',route:'account',action:'Review access requirements',source:access.source??row.entry.source,filter:accessFactFilter('location:'+row.method.location,p),assignmentId:row.id});
  }
  const messages=row.unknown.filter(s=>/Konar|compatibility/i.test(s));
  for(const message of messages){
    const access=message.includes('access requires confirmation');
    const locations=(row.entry.locations||[]).filter(loc=>resolveAccess('location:'+loc,p).value===null);
    add({title:message,detail:access?`${row.name}: confirm access to ${locations.join(', ')}.`:
      `${row.name} → ${row.variant.name}: compatible locations are not fully verified, or a custom probability is being used. Review the assigned-location source and enter a supported exact location or a measured compatibility probability. Custom probabilities remain conditional assumptions.`,route:access?'account':'methods',action:access?'Review area access':'Review Konar compatibility',source:row.entry.source,assignmentId:row.id,variantId:row.variant.id,field:access?undefined:'locationChance',filter:access?accessFactFilter('location:'+locations[0],p):undefined});
  }
  if(row.targetFraction===0&&!row.methodReason&&!row.reason)add({title:`${row.name}: no compatible Konar location`,detail:`The selected ${row.variant.name} method does not match any accessible location in this task's pool: ${(row.entry.locations||[]).join(', ')}. Review its location or choose a different variant.`,route:'methods',action:'Review method location',source:row.entry.source,assignmentId:row.id,variantId:row.variant.id,field:'location'});
}
