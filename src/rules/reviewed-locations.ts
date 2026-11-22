import raw from '../../data/location-access-reviews.json';
import type {Fact,Profile,Source} from '../domain/types';
import {questPointAllowance} from './quest-points';

export interface LocationAccessReview {name:string;source:Source;quest?:string;states?:Fact[];skills?:Record<string,number>;anySkills?:Record<string,number>;questPoints?:number;combinedMelee?:number;confirmation?:string;proof?:string[];unsupported?:boolean;cannon?:boolean;multi?:boolean}
export const LOCATION_REVIEW_VERSION=raw.version;
export const LOCATION_REVIEWS=raw.records as unknown as Record<string,LocationAccessReview>;
const normal=(s:string)=>s.replace(/^location:/,'').replaceAll('_',' ').replace(/[’‘]/g,"'").toLowerCase().replace(/\s+/g,' ').trim();
const aliases=new Map(Object.entries(raw.aliases).map(([from,to])=>[normal(from),normal(to)]));
export function locationReview(name:string,page?:string|null):LocationAccessReview|undefined{
 const find=(value:string)=>{let key=normal(value);for(let i=0;i<5;i++){const next=aliases.get(key)||aliases.get(key.split('#')[0]);if(!next||next===key)break;key=next;}return LOCATION_REVIEWS[key]||LOCATION_REVIEWS[key.split('#')[0]];};
 return find(page||'')||find(name);
}
export const hasReviewedGate=(r:LocationAccessReview|undefined):boolean=>!!r&&(!!r.quest||!!r.skills||!!r.anySkills||!!r.confirmation||!!r.questPoints||!!r.combinedMelee||!!r.unsupported);
export const LOCATION_SKILLS=[...new Set(Object.values(LOCATION_REVIEWS).flatMap(r=>Object.keys(r.skills||{}).concat(Object.keys(r.anySkills||{}))))];
export const derivedLocationReview=(key:string):boolean=>{const r=locationReview(key);return hasReviewedGate(r)&&!r!.confirmation&&!r!.states?.includes(null);};
export function reviewedLocationState(key:string,p:Profile,quest:(name:string)=>Fact):{value:Fact;origin:'quest'|'baseline'|'unknown'|'manual';reason:string;source:Source}|undefined{
 const r=locationReview(key);if(!hasReviewedGate(r)||!r)return;
 const manual=p.access[key]??p.access['location:'+r.name]??(p.id==='builtin-maxed'?1:undefined),checks:{value:Fact;reason:string}[]=[];
 if(r.unsupported)checks.push({value:0,reason:'Special or inaccessible location; not a normal repeatable route.'});
 for(const [skill,min]of Object.entries(r.skills||{}))checks.push({value:p.levels[skill]==null?null:p.levels[skill]!>=min?1:0,reason:`Requires ${min} ${skill}.`});
 if(r.anySkills){const entries=Object.entries(r.anySkills);checks.push({value:entries.some(([s,n])=>(p.levels[s]??-1)>=n)?1:entries.some(([s])=>p.levels[s]==null)?null:0,reason:'Requires '+entries.map(([s,n])=>n+' '+s).join(' or ')+'.'});}
 if(r.quest){const state=quest(r.quest);checks.push({value:state===null?null:r.states?.[state]??null,reason:`${r.quest}: ${state===2?'completed':state===1?'in progress':state===0?'not started':'unknown'}.`});}
 if(r.questPoints){const points=questPointAllowance(p);checks.push({value:points.minimum>=r.questPoints?1:points.complete?0:null,reason:`Requires ${r.questPoints} quest points.`});}
 if(r.combinedMelee){const a=p.levels.attack,s=p.levels.strength;checks.push({value:a===99||s===99?1:a==null||s==null?null:a+s>=r.combinedMelee?1:0,reason:'Requires 130 combined Attack and Strength, or 99 in either skill.'});}
 const failed=checks.some(c=>c.value===0),unknown=checks.some(c=>c.value===null);
 let value:Fact=failed?0:unknown?null:1;
 const proof=r.proof?.some(q=>quest(q)===2);
 if(!failed&&r.confirmation&&!proof)value=manual===1?value:manual===0?0:null;
 if(!failed&&!r.confirmation&&r.states?.includes(null)&&value===null&&manual===1)value=1;
 if(p.restrictBasicAccess&&manual===0)value=0;
 const reason=r.name+': '+(checks.filter(c=>c.value!==1).map(c=>c.reason).join(' ')||'Known entrance requirements satisfied.')+(r.confirmation?' '+r.confirmation:'')+(p.restrictBasicAccess&&manual===0?' Disabled by this character’s location restriction.':'');
 return {value,origin:value===null?'unknown':p.restrictBasicAccess&&manual===0?'manual':'quest',reason,source:r.source};
}
