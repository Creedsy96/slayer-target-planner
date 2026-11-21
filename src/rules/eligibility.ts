import type {Catalogue,Eligibility,Master,Profile,Requirement,Variant,Entry,Method} from '../domain/types';
import {KONAR_AUDIT,konarPool,konarVariantLocations,sameKonarLocation} from './konar-locations';
import {questPointAllowance} from './quest-points';
import {questState,resolveAccess} from './access';
export function check(requirements:Requirement[],p:Profile):Eligibility{
  const result:Eligibility={eligible:true,unknown:[],failed:[]};
  for(const r of requirements){
    if(r.kind==='any'){
      const states=(r.items||[]).map(item=>check([item],p));
      if(states.some(s=>s.eligible&&!s.unknown.length))continue;
      if(states.some(s=>s.eligible)){result.unknown.push(r.label);continue;}
      result.failed.push(r.label);continue;
    }
    const group=r.kind==='skill'?p.levels:r.kind==='quest'?p.quests:r.kind==='unlock'?p.unlocks:p.access;
    const n=r.kind==='quest'?questState(p,r.key!):r.kind==='access'?resolveAccess(r.key!,p).value:group[r.key!];
    if(n===null||n===undefined){result.unknown.push(r.label);continue;}
    if(r.kind==='unlock'&&r.min===0?n!==0:n<(r.min??1))result.failed.push(`${r.label}${r.min&&r.min>2?' '+r.min:''}`);
  }
  result.eligible=!result.failed.length;return result;
}
export function masterRequirements(master:Master,p:Profile):Requirement[]{
  return master.requirements.filter(r=>!(r.kind==='skill'&&r.key==='combat'&&p.levels.slayer===99&&['duradel','mortimer'].includes(master.id)));
}
export function masterEligibility(master:Master,p:Profile):Eligibility{
  return check(masterRequirements(master,p),p);
}
export function blockSlots(master:Master,p:Profile):{slots:number;unknown:boolean}{
  if(master.id==='mortimer')return {slots:2,unknown:false};
  if(p.blockLimit!==null)return {slots:p.blockLimit,unknown:false};
  const points=questPointAllowance(p);
  return {slots:Math.min(6,Math.floor(points.minimum/50))+(p.diaries.lumbridge===1?1:0),unknown:(!points.complete&&points.minimum<300)||p.diaries.lumbridge===null};
}
export function variantEligibility(v:Variant,p:Profile,master:Master,assignmentId?:string):Eligibility{
  const status=check(v.requirements,p);
  if(v.masterAssignments&&(!v.masterAssignments[master.id]||assignmentId&&!v.masterAssignments[master.id].includes(assignmentId)))status.failed.push("This master/assignment has no reviewed mapping to this variant");
  if(v.id==='boss-pool'&&p.goal.targets.some(t=>t.variantId===v.id))status.failed.push('Select a directly mapped creature assignment; specific boss secondary rolls are not supported.');
  if(master.id==='krystilia'&&['demonic-gorilla','tormented-demon','cerberus','kraken','alchemical-hydra','basilisk-knight','baby-black-dragon','baby-blue-dragon'].includes(v.id))status.failed.push('Variant is outside the Wilderness assignment area');
  if(master.id==='konar'&&v.id==='tormented-demon')status.failed.push('Konar cannot assign the Ancient Guthixian Temple');
  status.eligible=!status.failed.length;return status;
}
export function locationFraction(entry:Entry,v:Variant,method:Method,master:Master,p:Profile):{fraction:number;unknown:string[]}{
  if(method.location&&resolveAccess('location:'+method.location,p).value===0)return {fraction:0,unknown:[]};
  if(master.id!=='konar')return {fraction:1,unknown:[]};
  if(method.locationChance!==null)return {fraction:method.locationChance,unknown:['Custom Konar location probability']};
  const audit=KONAR_AUDIT[entry.id];
  if(audit?.mode==='specific-boss')return {fraction:1,unknown:[]};
  const pool=konarPool(entry,p),compatible=konarVariantLocations(entry,v);
  const matches=pool.locations.filter(location=>compatible.some(name=>sameKonarLocation(name,location))&&(!method.location||sameKonarLocation(method.location,location)));
  return {fraction:pool.locations.length?matches.length/pool.locations.length:0,unknown:pool.unknown};
}
export function targetAssignments(data:Catalogue,p:Profile):Set<string>{return new Set(p.goal.targets.filter(t=>data.variants.some(v=>v.id===t.variantId)).map(t=>t.assignmentId));}
