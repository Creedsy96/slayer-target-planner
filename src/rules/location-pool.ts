import raw from '../../data/creature-guide.json';
import type {Catalogue,Profile} from '../domain/types';
import {AREA_RULES,OPEN_AREAS,knownAccessKeys,resolveAccess,isDerivedArea} from './access';
import {HARD_AREAS} from './hard-areas';
import {EXTRA_LOCATIONS} from '../guide/location-notes';

const normal=(s:string)=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
// Physical naming aliases only. Konar's grouped rolls (such as the Abyssal
// Area/Nexus roll) remain separate from entrance and room restrictions.
const aliases=[['Stronghold Slayer Cave','Stronghold Slayer Dungeon'],
 ['Troll Stronghold (location)','Troll Stronghold'],['Death Plateau (location)','Death Plateau'],
 ["Jormungand's Prison",'Isle of Stone'],
 ["Myths' Guild Dungeon","Myths' Guild","Myths' Guild Basement","Corsair Cove Dungeon/Myths' Guild (basement)"]];
interface ListedLocation {name:string;page:string|null;limited:boolean}
const records=raw.records as unknown as Record<string,{locations:ListedLocation[]}>;
const locations=Object.values(records).flatMap(r=>r.locations);
const names=new Map(locations.map(l=>[normal(l.name),l]));
const spellings=new Map<string,string[]>();
for(const name of [...AREA_RULES,...HARD_AREAS,...OPEN_AREAS].map(r=>r.key.slice(9)).concat(locations.flatMap(l=>[l.page||l.name,l.name]))){
 const group=spellings.get(normal(name))||[];if(!group.includes(name))group.push(name);spellings.set(normal(name),group);
}
function equivalentNames(name:string):string[]{return aliases.find(group=>group.some(n=>normal(n)===normal(name)))||spellings.get(normal(name))||[name];}
export function locationControlKey(key:string):string{
 const name=key.startsWith('location:')?key.slice(9):key;
 return 'location:'+equivalentNames(name)[0];
}
function overrideKeys(key:string):string[]{return equivalentNames(key.startsWith('location:')?key.slice(9):key).map(n=>'location:'+n);}
export function locationAccess(name:string,p:Profile,page?:string|null){
 const original=name.startsWith('location:')?name.slice(9):name,listed=names.get(normal(original));
 const parents=[original,page||listed?.page||''];
 if(parents.includes('Lizardman Temple'))parents.push('Molch');
 if(parents.includes('Lizardman Caves'))parents.push('Lizardman Settlement');
 if(parents.includes('Waterbirth Island Dungeon'))parents.push('Waterbirth Island');
 const keys=[...new Set(parents.filter(Boolean).flatMap(n=>overrideKeys(n)))];
 const results=keys.map(key=>resolveAccess(key,p));
 const denied=results.findIndex(r=>r.value===0);
 return denied>=0?{...results[denied],blockedBy:keys[denied]}:{...(results.find(r=>r.value===null)||results[0]),blockedBy:undefined};
}
export function setLocationAccess(p:Profile,key:string,enabled:boolean):void{
 const fact=resolveAccess(key,{...p,restrictBasicAccess:false});
 if(enabled&&(isDerivedArea(key)&&fact.value!==1||fact.origin==='quest'&&fact.value===0))throw Error('Update the quest or skill requirement before enabling this location.');
 clearLocationAccess(p,key);
 p.access[locationControlKey(key)]=enabled?1:0;
}
export function clearLocationAccess(p:Profile,key:string):void{const keys=new Set(overrideKeys(key).map(normal));for(const alias of Object.keys(p.access))if(keys.has(normal(alias)))delete p.access[alias];}
export function hasLocationOverride(p:Profile,key:string):boolean{const keys=new Set(overrideKeys(key).map(normal));return Object.keys(p.access).some(k=>keys.has(normal(k))&&(p.access[k]===0||p.access[k]===1));}
export function locationMatches(key:string,query:string):boolean{return overrideKeys(key).some(k=>normal(k).includes(normal(query)));}
export function locationPoolKeys(data:Catalogue,p?:Profile):string[]{
 const pool=[...knownAccessKeys(data).filter(k=>k.startsWith('location:')),
  ...locations.filter(l=>!l.limited).map(l=>'location:'+(l.page||l.name)),
  ...Object.values(EXTRA_LOCATIONS).flat().map(name=>'location:'+name),
  ...Object.keys(p?.access||{}).filter(k=>k.startsWith('location:'))];
 return [...new Map(pool.map(key=>{const canonical=locationControlKey(key);return [normal(canonical),canonical];})).values()].sort((a,b)=>a.localeCompare(b));
}
export function allVariantLocationsDisabled(id:string,p:Profile):boolean{
 if(!p.restrictBasicAccess)return false;
 const record=records[id];
 const listed=record?.locations.filter(l=>!l.limited)||[];
 const candidates=listed.length?listed:(EXTRA_LOCATIONS[id]||[]).map(name=>({name,page:null}));
 return candidates.length>0&&candidates.every(l=>locationAccess(l.name,p,l.page).value===0);
}
export function firstDisabledLocation(id:string,p:Profile):string|undefined{
 for(const l of records[id]?.locations||[]){const result=locationAccess(l.name,p,l.page);if(result.value===0&&result.blockedBy)return locationControlKey(result.blockedBy);}
 return undefined;
}
