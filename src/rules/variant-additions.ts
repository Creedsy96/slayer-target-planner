import raw from '../../data/variant-additions.json';
import type {Catalogue,Variant,Master} from '../domain/types';
import {sameKonarLocation} from './konar-locations';

export const VARIANT_ADDITIONS=raw.variants as unknown as Variant[];
export const VARIANT_VERSION=raw.version;

export function applyVariantAdditions(base:Catalogue):Catalogue{
  const existing=new Set(base.variants.map(v=>v.id));
  for(const v of VARIANT_ADDITIONS){
    if(existing.has(v.id))throw Error('Reviewed variant addition conflicts with catalogue: '+v.id);
    for(const id of v.assignmentIds)if(!base.assignments.some(a=>a.id===id))throw Error('Unknown reviewed variant assignment: '+id);
  }
  return {...base,
    variants:[...base.variants,...VARIANT_ADDITIONS],
    assignments:base.assignments.map(a=>({...a,variantIds:[...a.variantIds,...VARIANT_ADDITIONS.filter(v=>v.assignmentIds.includes(a.id)).map(v=>v.id)]})),
    sources:[...base.sources,...VARIANT_ADDITIONS.map(v=>v.source).filter((s,i,all)=>all.findIndex(other=>other.url===s.url&&other.revision===s.revision)===i&&!base.sources.some(other=>other.url===s.url&&other.revision===s.revision))],
  };
}

export function methodLocationRestriction(v:Variant,master:Master,location:string):string|null{
  const allowed=v.masterLocations?.[master.id];
  if(!location||!allowed||allowed.some(l=>master.id==='konar'?sameKonarLocation(l,location):l.toLowerCase()===location.trim().toLowerCase()))return null;
  return `${master.name} requires ${v.name} at ${allowed.join(' or ')}. The selected method location (${location}) is not valid for this master.`;
}
