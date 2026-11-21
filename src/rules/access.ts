import raw from '../../data/area-access.json';
import openAreas from '../../data/open-areas.json';
import {HARD_AREAS,hardAreaState} from './hard-areas';
import type {Catalogue,Fact,Profile,Source,Requirement} from '../domain/types';

export interface AreaRule {key:string;name:string;quest:string;states:Fact[];note:string;source:Source}
export const AREA_VERSION=raw.version;
export const AREA_RULES:AreaRule[]=raw.rules;
const normalArea=(value:string)=>value.toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
const rulesByKey=new Map(AREA_RULES.map(rule=>[normalArea(rule.key),rule]));
export const OPEN_AREAS=openAreas.areas;
export const isOpenArea=(key:string)=>key.startsWith('location:')&&!rulesByKey.has(normalArea(key))&&!HARD_AREAS.some(r=>normalArea(r.key)===normalArea(key));
export interface AccessResult {value:Fact;origin:'manual'|'quest'|'unknown'|'baseline';reason:string;source?:Source}

export function questState(p:Profile,key:string):Fact {
  return p.quests[key]??p.questImport?.states[key]??null;
}

export function resolveAccess(key:string,p:Profile):AccessResult {
  const baseline=OPEN_AREAS.find(area=>normalArea(area.key)===normalArea(key));
  if(isOpenArea(key)&&!p.restrictBasicAccess)return {value:1,origin:'baseline',reason:'Ordinary entrance defaults to Yes. '+(baseline?.note||'No hard quest, miniquest or skill entrance restriction is recorded. Tools, fees, travel shortcuts and creature/task restrictions remain separate.'),source:baseline?.source};
  const rule=rulesByKey.get(normalArea(key));
  const manual=p.access[rule?.key??key]??p.access[key];
  if(manual===0||manual===1)return {value:manual,origin:'manual',reason:'Manual access override',source:rule?.source};
  if(baseline)return {value:1,origin:'baseline',reason:'Default open entrance. '+baseline.note,source:baseline.source};
  const hard=hardAreaState(key,p,q=>questState(p,q));
  if(hard)return {...hard,origin:hard.value===null?'unknown':'quest'};
  if(!rule)return key.startsWith('location:')?{value:1,origin:'baseline',reason:'No hard entrance restriction recorded. Ordinary access defaults to Yes; tools, fees and specific encounters are separate.'}:{value:null,origin:'unknown',reason:'Confirm access and a repeatable method manually.'};
  const state=questState(p,rule.quest),value=state===null?null:rule.states[state]??null;
  const status=state===null?'unknown':state===0?'not started':state===1?'in progress':'completed';
  return {value,origin:value===null?'unknown':'quest',reason:`${rule.quest}: ${status}. ${rule.note}`,source:rule.source};
}

export function relevantQuests(data:Catalogue):string[] {
  return [...new Set([...data.quests,'A Kingdom Divided',...AREA_RULES.map(r=>r.quest),...HARD_AREAS.flatMap(r=>[...r.proof,...(r.quest?[r.quest]:[])])])].sort();
}

export function knownAccessKeys(data:Catalogue):string[]{
  const keys=new Set([...AREA_RULES.map(r=>r.key),...HARD_AREAS.map(r=>r.key)]);
  const add=(r:Requirement):void=>{if(r.kind==='access'&&r.key)keys.add(r.key);r.items?.forEach(add);};
  data.variants.forEach(v=>{
    v.requirements.forEach(add);
    Object.values(v.masterLocations||{}).flat().forEach(location=>keys.add('location:'+location));
  });
  data.masters.forEach(m=>{
    m.requirements.forEach(add);
    m.tasks.forEach(t=>{t.requirements.forEach(add);t.locations?.forEach(l=>keys.add('location:'+l));});
  });
  return [...keys].sort();
}
