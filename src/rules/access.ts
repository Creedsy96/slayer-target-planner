import travel from '../../data/travel-options.json';
import raw from '../../data/area-access.json';
import openAreas from '../../data/open-areas.json';
import {HARD_AREAS,hardAreaState} from './hard-areas';
import {CREATURE_ACCESS,creatureAccessRule,resolveCreatureAccess} from './creature-access';
import type {Catalogue,Fact,Profile,Source,Requirement} from '../domain/types';

export interface AreaRule {key:string;name:string;quest:string;states:Fact[];note:string;source:Source}
export const AREA_VERSION=raw.version;
export const AREA_RULES:AreaRule[]=raw.rules;
const normalArea=(value:string)=>value.toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
const rulesByKey=new Map(AREA_RULES.map(rule=>[normalArea(rule.key),rule]));
export const OPEN_AREAS=openAreas.areas;
export const isOpenArea=(key:string)=>key.startsWith('location:')&&!rulesByKey.has(normalArea(key))&&!HARD_AREAS.some(r=>normalArea(r.key)===normalArea(key));
export interface AccessResult {value:Fact;origin:'manual'|'quest'|'unknown'|'baseline';reason:string;source?:Source}
/** These entrances are decided by facts, not a second area purchase/checkbox. */
export function isDerivedArea(key:string):boolean{
 const rule=rulesByKey.get(normalArea(key));
 return !!rule&&rule.states.every(value=>value!==null)||HARD_AREAS.some(r=>normalArea(r.key)===normalArea(key)&&!r.confirmation);
}
/** Correction links must lead to the owning fact when its area card is hidden. */
export function accessFactFilter(key:string,p?:Profile):string{
 const creature=key.startsWith('variant:')?creatureAccessRule(key):undefined;
 if(creature){
  const quest=creature.requirements.find(r=>r.kind==='quest'&&(!p||questState(p,r.key!)!==(r.min??2)));
  if(quest)return quest.key!;
  const location=p&&creature.locations.find(l=>resolveAccess('location:'+l.area,p).value!==1);
  return location?accessFactFilter('location:'+location.area,p):creature.name;
 }
 const rule=rulesByKey.get(normalArea(key));
 const knownGate=p&&resolveAccess(key,{...p,restrictBasicAccess:false}).origin==='quest'&&resolveAccess(key,{...p,restrictBasicAccess:false}).value===0;
 if(rule&&(isDerivedArea(key)||knownGate))return rule.quest;
 if(isDerivedArea(key)||knownGate)return HARD_AREAS.find(r=>normalArea(r.key)===normalArea(key))?.quest||'';
 return key.replace(/^location:/,'');
}

export function questState(p:Profile,key:string):Fact {
  return p.quests[key]??p.questImport?.states[key]??null;
}

export function resolveAccess(key:string,p:Profile):AccessResult {
  const creature=resolveCreatureAccess(key,p,resolveAccess,questState);if(creature)return creature;
  const baseline=OPEN_AREAS.find(area=>normalArea(area.key)===normalArea(key));
  if(isOpenArea(key)&&!p.restrictBasicAccess)return {value:1,origin:'baseline',reason:'Ordinary entrance defaults to Yes. '+(baseline?.note||'No hard quest, miniquest or skill entrance restriction is recorded. Tools, fees, travel shortcuts and creature/task restrictions remain separate.'),source:baseline?.source};
  const rule=rulesByKey.get(normalArea(key));
  const manual=p.access[rule?.key??key]??p.access[key];
  const hard=hardAreaState(key,p,q=>questState(p,q));
  const stage=rule?questState(p,rule.quest):null;
  const derived=rule?(stage===null?null:rule.states[stage]??null):hard?.value??null;
  if(isDerivedArea(key)||rule&&derived!==null||hard&&hard.value!==null){
   if(p.restrictBasicAccess&&manual===0&&derived===1)return {value:0,origin:'manual',reason:'Disabled in the restricted-account location pool.',source:rule?.source||hard?.source};
   return {value:derived,origin:derived===null?'unknown':'quest',reason:rule?`${rule.quest}: ${stage===2?'completed':stage===0?'not started':stage===1?'in progress':'unknown'}. ${rule.note}`:hard!.reason,source:rule?.source||hard?.source};
  }
  if(manual===0||manual===1)return {value:manual,origin:'manual',reason:'Manual access override',source:rule?.source};
  if(baseline)return {value:1,origin:'baseline',reason:'Default open entrance. '+baseline.note,source:baseline.source};
  if(hard)return {...hard,origin:hard.value===null?'unknown':'quest'};
  if(!rule)return key.startsWith('location:')?{value:1,origin:'baseline',reason:'No hard entrance restriction recorded. Ordinary access defaults to Yes; tools, fees and specific encounters are separate.'}:{value:null,origin:'unknown',reason:'Confirm access and a repeatable method manually.'};
  const state=questState(p,rule.quest),value=state===null?null:rule.states[state]??null;
  const status=state===null?'unknown':state===0?'not started':state===1?'in progress':'completed';
  return {value,origin:value===null?'unknown':'quest',reason:`${rule.quest}: ${status}. ${rule.note}`,source:rule.source};
}

export function relevantQuests(data:Catalogue):string[] {
  return [...new Set([...data.quests,...Object.values(CREATURE_ACCESS).flatMap(r=>[...r.requirements,...r.proof,...r.locations.flatMap(l=>l.requirements)]).filter(r=>r.kind==='quest').map(r=>r.key!),'A Kingdom Divided',...travel.teleports.flatMap(t=>'quest'in t&&typeof t.quest==='string'?[t.quest]:[]),...AREA_RULES.map(r=>r.quest),...HARD_AREAS.flatMap(r=>[...r.proof,...(r.quest?[r.quest]:[])])])].sort();
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
