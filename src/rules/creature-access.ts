import raw from '../../data/creature-access.json';
import type {Catalogue,Fact,Profile,Requirement,Source} from '../domain/types';
import type {AccessResult} from './access';

interface CreatureArea {name:string;area:string;requirements:Requirement[]}
interface CreatureRule {name:string;mode:'derived'|'confirmation';requirements:Requirement[];locations:CreatureArea[];proof:Requirement[];proofAreas:string[];note:string;source:Source}
export const CREATURE_ACCESS=raw.rules as unknown as Record<string,CreatureRule>;
export const CREATURE_ACCESS_VERSION=raw.version;
export function applyCreatureRequirements(data:Catalogue):Catalogue{
 const reviewed=raw.assignmentRequirements as Record<string,{requirements:Requirement[];source:Source}>;
 return {...data,masters:data.masters.map(m=>({...m,tasks:m.tasks.map(t=>{
  const additions=reviewed[t.id]?.requirements.filter(r=>!t.requirements.some(existing=>existing.kind===r.kind&&existing.key===r.key&&(existing.min??1)>=(r.min??1)))||[];
  return additions.length?{...t,requirements:[...t.requirements,...additions]}:t;
 })}))};
}
export const creatureAccessRule=(key:string):CreatureRule|undefined=>CREATURE_ACCESS[key.replace(/^variant:/,'')];
export const isDerivedCreature=(key:string):boolean=>key.startsWith('variant:')&&creatureAccessRule(key)?.mode==='derived';
export function creatureAccessLabel(key:string):string{
 const rule=creatureAccessRule(key);return rule?rule.name+' — '+([...new Set(rule.locations.map(l=>l.area))].join(' / ')||'location not yet reviewed'):key;
}
const all=(values:Fact[]):Fact=>values.includes(0)?0:values.includes(null)?null:1;
const any=(values:Fact[]):Fact=>values.includes(1)?1:values.includes(null)?null:0;
type AreaLookup=(key:string,p:Profile)=>AccessResult;
type QuestLookup=(p:Profile,key:string)=>Fact;
function requirement(r:Requirement,p:Profile,area:AreaLookup,quest:QuestLookup):Fact{
 if(r.kind==='skill'&&r.min===0)return 1;
 if(r.kind==='any')return any((r.items||[]).map(v=>requirement(v,p,area,quest)));
 const value=r.kind==='skill'?p.levels[r.key!]:r.kind==='quest'?quest(p,r.key!):r.kind==='unlock'?p.unlocks[r.key!]:area(r.key!,p).value;
 if(value==null)return null;return r.kind==='unlock'&&r.min===0?(value===0?1:0):value>=(r.min??1)?1:0;
}
export function resolveCreatureAccess(key:string,p:Profile,area:AreaLookup,quest:QuestLookup,location?:string):AccessResult|undefined{
 if(!key.startsWith('variant:'))return;
 const rule=creatureAccessRule(key);if(!rule)return;
 const normalize=(s:string)=>s.toLowerCase().replace(/[’‘]/g,"'").trim();
 const matches=location?rule.locations.filter(l=>[l.name,l.area].some(n=>normalize(n)===normalize(location))):rule.locations;
 if(location&&!matches.length)return;
 const label=rule.name+' at '+(location||[...new Set(matches.map(l=>l.area))].join(' / ')||'a location not yet reviewed');
 const required=rule.requirements.map(r=>({r,value:requirement(r,p,area,quest)}));
 const base=all(required.map(r=>r.value));
 const routes=matches.map(l=>({location:l,access:area('location:'+l.area,p),extra:l.requirements.map(r=>({r,value:requirement(r,p,area,quest)}))}));
 const route=routes.length?any(routes.map(l=>all([l.access.value,...l.extra.map(r=>r.value)]))):null;
 const missing=required.filter(r=>r.value!==1).map(({r,value})=>`${r.label}${r.kind==='skill'?' '+r.min:''}: ${value===0?'not satisfied':'unknown'}`);
 if(route!==1&&routes.length)missing.push(...routes.map(l=>`${l.location.name}: ${l.access.value!==1?l.access.reason:l.extra.filter(r=>r.value!==1).map(r=>r.r.label+' '+(r.r.min??'')+': '+(r.value===0?'not satisfied':'unknown')).join('; ')}`).filter(s=>!s.endsWith(': ')));
 let value=all([base,route]);
 let origin:AccessResult['origin']='baseline';
 if(rule.mode==='confirmation'&&base!==0&&route!==0){
  const proven=rule.proof.length>0&&all(rule.proof.map(r=>requirement(r,p,area,quest)))===1&&(!location||!rule.proofAreas.length||matches.some(l=>rule.proofAreas.includes(l.area)));
  const manual=p.access[key];
  if(proven){value=base;origin='quest';}
  else{value=manual===0?0:manual===1?base:null;origin=manual==null?'unknown':'manual';}
 }
 if(p.restrictBasicAccess&&p.access[key]===0){value=0;origin='manual';missing.push('Disabled by this character’s manual creature restriction.');}
 const reason=label+': '+(value===1?'recorded requirements satisfied. ':missing.length?missing.join('; ')+'. ':value===0?'completion method marked unavailable. ':'completion method needs confirmation. ')+rule.note;
 return {value,origin:value===null?'unknown':origin,reason,source:rule.source};
}
