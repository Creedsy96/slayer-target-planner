import type {Catalogue,Profile,Requirement} from '../domain/types';
import {knownAccessKeys,relevantQuests} from '../rules/access';
import {newProfile,validateProfile,MAXED_PROFILE_ID,MAX_CUSTOM_PROFILES,customProfileCount} from './profiles';

const skills='attack strength defence ranged prayer magic runecraft construction hitpoints agility herblore thieving crafting fletching slayer hunter mining smithing fishing cooking firemaking woodcutting farming sailing'.split(' ');

export function maxedProfile(data:Catalogue):Profile{
  const p=newProfile(data,'Maxed');
  p.id=MAXED_PROFILE_ID;
  p.levels=Object.fromEntries(skills.map(key=>[key,99]));p.levels.combat=126;
  p.quests=Object.fromEntries(relevantQuests(data).map(key=>[key,2]));
  p.unlocks=Object.fromEntries(Object.keys(data.unlocks).map(key=>[key,1]));
  p.access=Object.fromEntries(knownAccessKeys(data).map(key=>[key,1]));
  const grant=(r:Requirement):void=>{
    if(r.key&&r.kind==='quest')p.quests[r.key]=2;
    if(r.key&&r.kind==='skill')p.levels[r.key]=r.key==='combat'?126:99;
    // Task-removal purchases must remain off to keep every assignment available.
    if(r.key&&r.kind==='unlock')p.unlocks[r.key]=r.min===0?0:1;
    r.items?.forEach(grant);
  };
  data.masters.forEach(m=>{m.requirements.forEach(grant);m.tasks.forEach(t=>t.requirements.forEach(grant));});
  data.variants.forEach(v=>v.requirements.forEach(grant));
  p.questPoints=343;p.diaries={lumbridge:1,kourend:1,western:1};
  p.mortimerTasks=50;p.assumeUnknown=false;
  p.notes=[
    'Maxed planning preset: all skills 99, combat 126, all supported quests/diaries complete and all modelled areas/variants accessible. These are scenario settings, not imported account facts.',
    'Quest points: 343 (Wiki snapshot checked 19 November 2026). Stop the Wyvern is off to retain wyvern assignments. Mortimer progression is 50 tasks, unlocking all modelled offer options.',
    'Points, reserves, streaks and combat rates are editable planning defaults. Master/variant mappings and uncertain combat/location models still apply.',
  ];
  return validateProfile(data,p);
}

export function withDefaultMaxedProfile(data:Catalogue,profiles:Profile[]=[],activeId=''):{profiles:Profile[];activeId:string}{
  if(customProfileCount(profiles)>MAX_CUSTOM_PROFILES)throw Error('Maximum of 50 custom profiles.');
  const next=profiles.some(p=>p.id===MAXED_PROFILE_ID)?profiles:[...profiles,maxedProfile(data)];
  return {profiles:next,activeId:next.some(p=>p.id===activeId)?activeId:next[0].id};
}
