import raw from '../../data/konar-locations.json';
import guide from '../../data/creature-guide.json';
import type {Catalogue,Entry,Profile,Requirement,Variant} from '../domain/types';
import {resolveAccess} from './access';

interface LocationAudit {locations:string[];requirements:Record<string,Requirement[]>;variants:{id:string;locations:string[];note?:string}[];mode:string;note:string}
export const KONAR_VERSION=raw.version;
export const KONAR_AUDIT=raw.assignments as unknown as Record<string,LocationAudit>;
const normal=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const guideAreas=new Map(Object.values(guide.records).flatMap(r=>r.locations.filter(l=>l.page&&l.name!==l.page).map(l=>[normal(l.name),l.page] as [string,string])));
export function konarLocation(s:string):string{
  const aliases=raw.aliases as Record<string,string[]>;
  s=guideAreas.get(normal(s))||s;
  return Object.keys(aliases).find(k=>[k,...aliases[k]].some(a=>normal(a)===normal(s)))||s;
}
export function sameKonarLocation(a:string,b:string):boolean{return normal(konarLocation(a))===normal(konarLocation(b));}
export function konarLocationAccess(location:string,p:Profile){
  const name=konarLocation(location),aliases=(raw.aliases as Record<string,string[]>)[name]||[];
  // Keep existing quest rules and saved manual overrides under their original names.
  const keys=[name,...aliases],manual=keys.find(k=>p.access['location:'+k]===0||p.access['location:'+k]===1);
  if(manual&&p.restrictBasicAccess)return resolveAccess('location:'+manual,p);
  const states=keys.map(k=>resolveAccess('location:'+k,p));
  return states.find(s=>s.origin==='manual')||states.find(s=>s.origin==='quest'||s.origin==='unknown')||states[0];
}
export function konarPool(entry:Entry,p:Profile):{locations:string[];unknown:string[];excluded:string[]}{
  const audit=KONAR_AUDIT[entry.id];
  const pool=entry.locations||audit?.locations||[],unknown:string[]=[],excluded:string[]=[];
  const locations=pool.filter(location=>{
    const access=konarLocationAccess(location,p),requirements=audit?.requirements[location]||[];
    const locked=access.value===0||requirements.some(r=>(p.levels[r.key!]??Infinity)<(r.min??1));
    if(locked){excluded.push(location);return false;}
    if(!audit?.locations.some(l=>sameKonarLocation(l,location)))unknown.push('Konar location not reviewed: '+location);
    if(access.value===null||requirements.some(r=>p.levels[r.key!]==null))unknown.push('Konar location access: '+location);
    return true;
  });
  return {locations,unknown,excluded};
}
export function konarVariantLocations(entry:Entry,v:Variant):string[]{return KONAR_AUDIT[entry.id]?.variants.find(row=>row.id===v.id)?.locations||[];}
export function applyKonarLocations(data:Catalogue):Catalogue{
  return {...data,masters:data.masters.map(m=>m.id==='konar'?{...m,tasks:m.tasks.map(e=>({...e,locations:KONAR_AUDIT[e.id]?.locations||e.locations}))}:m),
    sources:[...data.sources,raw.source],
    variants:data.variants.map(v=>{
      const assignments=v.assignmentIds.filter(id=>KONAR_AUDIT[id]?.variants.some(row=>row.id===v.id&&row.locations.length));
      const masterAssignments={...(v.masterAssignments||Object.fromEntries(data.masters.map(m=>[m.id,v.assignmentIds.filter(id=>m.tasks.some(e=>e.id===id))]))),konar:assignments};
      return {...v,masterAssignments,masterLocations:{...v.masterLocations,konar:[...new Set(assignments.flatMap(id=>KONAR_AUDIT[id].variants.find(row=>row.id===v.id)!.locations))]}};
    })};
}
