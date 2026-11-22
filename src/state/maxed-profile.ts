import type {Catalogue,Profile,Requirement} from '../domain/types';
import {defaultCombat} from './bank';
import {knownAccessKeys,relevantQuests} from '../rules/access';
import {QUEST_POINTS} from '../rules/quest-points';
import {newProfile,validateProfile,clone,MAXED_PROFILE_ID,MAX_CUSTOM_PROFILES,customProfileCount} from './profiles';

const skills='attack strength defence ranged prayer magic runecraft construction hitpoints agility herblore thieving crafting fletching slayer hunter mining smithing fishing cooking firemaking woodcutting farming sailing'.split(' ');
const gearNote='All ordinary-game gear is assumed available for this scenario. Actual bank contents are preserved separately; change the assumption in Settings.';
const rewardNote='Slayer-point reward purchases start off. Enable purchased creature unlocks in Account & access as needed.';

export function maxedProfile(data:Catalogue):Profile{
  const p=newProfile(data,'Maxed');
  p.id=MAXED_PROFILE_ID;
  p.maxedPresetVersion=1;
  p.assumeAllGear=true;p.combat={...defaultCombat(),enabled:true};
  p.levels=Object.fromEntries(skills.map(key=>[key,99]));p.levels.combat=126;
  p.quests=Object.fromEntries(relevantQuests(data).map(key=>[key,2]));
  p.unlocks=Object.fromEntries(Object.keys(data.unlocks).map(key=>[key,0]));
  p.access=Object.fromEntries(knownAccessKeys(data).map(key=>[key,1]));
  const grant=(r:Requirement):void=>{
    if(r.key&&r.kind==='quest')p.quests[r.key]=2;
    if(r.key&&r.kind==='skill')p.levels[r.key]=r.key==='combat'?126:99;
    // Account completion does not imply purchasing optional Slayer rewards.
    if(r.key&&r.kind==='unlock')p.unlocks[r.key]=0;
    r.items?.forEach(grant);
  };
  data.masters.forEach(m=>{m.requirements.forEach(grant);m.tasks.forEach(t=>t.requirements.forEach(grant));});
  data.variants.forEach(v=>v.requirements.forEach(grant));
  p.questPoints=QUEST_POINTS.maximum;p.diaries={lumbridge:1,kourend:1,western:1};
  p.mortimerTasks=50;p.assumeUnknown=false;
  p.notes=[
    'Maxed planning preset: all skills 99, combat 126, all supported quests/diaries complete and all modelled areas/variants accessible. These are scenario settings, not imported account facts.',
    `Maxed quest-point assumption: ${QUEST_POINTS.maximum} from the ${QUEST_POINTS.captured} reward snapshot. Stop the Wyvern is off to retain wyvern assignments. Mortimer progression is 50 tasks, unlocking all modelled offer options.`,
    'Points, reserves, streaks and combat rates are editable planning defaults. Master/variant mappings and uncertain combat/location models still apply.',
    rewardNote,gearNote,
  ];
  return validateProfile(data,p);
}

export function withDefaultMaxedProfile(data:Catalogue,profiles:Profile[]=[],activeId=''):{profiles:Profile[];activeId:string}{
  // Retire the old automatically supplied workbook example. Explicit imports
  // and renamed/custom characters keep their own identities and saved facts.
  const retained=profiles.filter(p=>{
    const name=p.name.trim().toLowerCase();
    const migratedStarter=name==='imported workbook profile'&&p.legacyOverrides!==undefined&&p.notes.some(note=>note.startsWith('v1 backup retained.'));
    return name!=='default workbook'&&!migratedStarter;
  });
  if(retained.length!==profiles.length)profiles=retained;
  if(customProfileCount(profiles)>MAX_CUSTOM_PROFILES)throw Error('Maximum of 50 custom profiles.');
  const current=profiles.find(p=>p.id===MAXED_PROFILE_ID);
  let next=profiles;
  if(!current)next=[...profiles,maxedProfile(data)];
  else if(current.maxedPresetVersion!==1){
    // Correct the original preset once without resetting other player choices.
    const updated=clone(current),keys=new Set([...Object.keys(maxedProfile(data).unlocks),...Object.keys(current.unlocks)]);
    updated.unlocks=Object.fromEntries([...keys].map(key=>[key,0]));
    updated.maxedPresetVersion=1;updated.notes.push(rewardNote);
    next=profiles.map(p=>p===current?updated:p);
  }
  const builtin=next.find(p=>p.id===MAXED_PROFILE_ID);
  if(builtin&&!Object.hasOwn(builtin.quests,'A Kingdom Divided'))next=next.map(p=>p===builtin?{...clone(p),quests:{...p.quests,'A Kingdom Divided':2}}:p);
  if(builtin){const missing=relevantQuests(data).filter(key=>!Object.hasOwn(builtin.quests,key));if(missing.length)next=next.map(p=>p.id===builtin.id?{...p,quests:{...p.quests,...Object.fromEntries(missing.map(key=>[key,2]))}}:p);}
  const gearPreset=next.find(p=>p.id===MAXED_PROFILE_ID);
  if(gearPreset&&gearPreset.assumeAllGear===undefined){
    const updated=clone(gearPreset);updated.assumeAllGear=true;updated.combat={...defaultCombat(),...updated.combat,enabled:true};updated.notes.push(gearNote);
    next=next.map(p=>p===gearPreset?updated:p);
  }
  return {profiles:next,activeId:next.some(p=>p.id===activeId)?activeId:MAXED_PROFILE_ID};
}
