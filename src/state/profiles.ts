import {EQUIPMENT_SLOTS} from '../combat/types';
import {equipmentItem} from '../combat/equipment';
import {AREA_VERSION} from '../rules/access';
import {pointQuestNames,questNameKey} from '../rules/quest-points';
import {validateBank,validateCombat} from './bank';
import type {Catalogue,Profile,Method} from '../domain/types';
export const SCHEMA=2;
export const STORAGE='slayer-target-planner-v2';
export const MAXED_PROFILE_ID='builtin-maxed';
export const MAX_CUSTOM_PROFILES=50;
export const customProfileCount=(profiles:readonly {id:string}[]):number=>profiles.filter(p=>p.id!==MAXED_PROFILE_ID).length;
export const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
export function newProfile(data:Catalogue,name='Example hunt — assumed access'):Profile{
  return {areaDataVersion:AREA_VERSION,id:cryptoId(),name,dataVersion:data.version,levels:{slayer:87,combat:110,defence:80,magic:80,sailing:null,agility:null,strength:80,ranged:80,hitpoints:85},quests:{},unlocks:{},access:{},questPoints:300,diaries:{lumbridge:0,kourend:0,western:0},assumeUnknown:true,blockLimit:null,mortimerTasks:null,streaks:{normal:50,wilderness:0,mortimer:0},points:500,reserve:50,blocks:{},proposed:{},preferences:{},methods:{},methodPresets:{},goal:{kind:'offer',targets:[{assignmentId:'basilisks',variantId:'basilisk-knight',priority:1}],quantity:100,dropId:'basilisk-jaw',customDropRate:null},objective:'time',strategy:'sustainable',applySetup:false,milestone:10,globalDps:5,skipSeconds:30,requestMinutes:0,simulation:{trials:2000,seed:42173,horizonOffers:2000,sessionHours:4},current:{kind:'new',masterId:'',assignmentId:'',remaining:0},cape:false,previousTask:'',notes:['Example levels and points are editable planning assumptions. Unknown access is assumed only for this scenario.'],hypotheticalChoices:null};
}
function cryptoId():string{return 'profile-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2));}
export function defaultMethod(data:Catalogue,p:Profile,id:string):Method{
  const a=data.assignments.find(a=>a.id===id)!;
  return {variantId:a.variantIds[0],timing:'dps',rate:0,dps:p.globalDps,delay:3,travel:0,bracelet:'none',extended:p.extensions?.[id]??false,location:'',locationChance:null};
}
export function migrateV1(data:Catalogue,raw:unknown):Profile{
  const p=newProfile(data,'Imported workbook profile');
  const record=raw as {settings?:Record<string,unknown>;overrides?:Record<string,Record<string,unknown>>};
  const s=record?.settings||{};
  p.levels={slayer:null,combat:null};p.points=null;p.questPoints=null;p.diaries={lumbridge:null,kourend:null,western:null};p.streaks={normal:null,wilderness:null,mortimer:null};
  if(typeof s.level==='number')p.levels.slayer=s.level;
  if(typeof s.dps==='number'&&s.dps>0)p.globalDps=s.dps;
  if(typeof s.blocks==='number')p.blockLimit=Math.min(7,Math.max(0,s.blocks));
  if(typeof s.skipSeconds==='number')p.skipSeconds=s.skipSeconds;
  if(typeof s.target==='string'&&data.assignments.some(a=>a.id===s.target)){
    const a=data.assignments.find(a=>a.id===s.target)!;
    if(a.id==='boss')p.notes.push('The old Giant Mole timing represented a mixed boss assignment. Specific boss targeting now requires a directly mapped task.');
    p.goal.targets=[{assignmentId:a.id,variantId:a.variantIds[0],priority:1}];
  }
  p.hypotheticalChoices=s.threeChoices===true?3:null;
  p.legacyOverrides=clone(record.overrides||{});
  for(const {id} of data.assignments){
    const o=record.overrides?.[id]||{};
    if(!data.assignments.some(a=>a.id===id))continue;
    if(o.excluded===true)p.preferences[id]='avoid';
    const m=defaultMethod(data,p,id);
    if(typeof s.overhead==='number')m.travel=Math.max(0,s.overhead);
    if(typeof s.delay==='number')m.delay=Math.max(0,s.delay);
    m.extended=s.extended===true;
    if(typeof o.hp==='number'||typeof o.multiplier==='number'||typeof o.level==='number')p.notes.push(`${id}: legacy HP/level/multiplier overrides retained in the migration backup; choose a verified variant or measured timing.`);
    p.methods[id]=m;
  }
  p.notes.unshift('v1 backup retained. Old exclusions are preferences, not quest or unlock facts. Old block counts and three-choice mode are hypothetical overrides.');
  return validateProfile(data,p);
}
const badKeys=new Set(['__proto__','prototype','constructor']);
function safeTree(value:unknown,depth=0):void{
  if(depth>30)throw Error('Profile nesting is too deep.');
  if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){if(badKeys.has(k))throw Error('Unsafe profile key.');safeTree(v,depth+1);}
}
export function validateProfile(data:Catalogue,value:unknown):Profile{
  safeTree(value);const p=clone(value) as Profile;
  if(!p||typeof p!=='object'||!p.id||typeof p.id!=='string'||typeof p.name!=='string'||p.name.length>100)throw Error('Profile needs a valid ID and name (up to 100 characters).');
  if(p.dataVersion!==data.version)throw Error(`Profile uses data ${p.dataVersion}. This app uses ${data.version}; review and explicitly rebase a copy before import.`);
  if(p.areaDataVersion!==undefined&&p.areaDataVersion!==AREA_VERSION&&p.areaDataVersion!=='2026-11-19.1')throw Error(`Profile uses area rules ${p.areaDataVersion}. This app uses ${AREA_VERSION}; review and explicitly rebase a copy before import.`);
  p.areaDataVersion=AREA_VERSION;
  if(p.assumeAllGear!==undefined&&typeof p.assumeAllGear!=='boolean')throw Error('Invalid all-gear assumption.');
  if(p.maxedPresetVersion!==undefined&&p.maxedPresetVersion!==1)throw Error('Unsupported Maxed preset version.');
  const numeric=(n:unknown,min:number,max:number,label:string,nullable=false)=>{if(nullable&&n===null)return;if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error(`${label} must be between ${min} and ${max}.`);};
  const ids=new Set(data.assignments.map(a=>a.id));
  if(p.extensions!==undefined&&(typeof p.extensions!=='object'||!p.extensions||Array.isArray(p.extensions)||Object.entries(p.extensions).some(([id,enabled])=>!ids.has(id)||typeof enabled!=='boolean')))throw Error('Invalid task extensions.');
  for(const group of ['levels','quests','unlocks','access','streaks','blocks','proposed','preferences','methods','methodPresets','diaries'])if(!p[group as keyof Profile]||typeof p[group as keyof Profile]!=='object'||Array.isArray(p[group as keyof Profile]))throw Error(`Missing ${group} fields.`);
  for(const [k,n] of Object.entries(p.levels))numeric(n,0,k==='combat'?126:99,`${k} level`,true);
  for(const group of [p.quests,p.unlocks,p.access,p.diaries])for(const n of Object.values(group))numeric(n,0,2,'Requirement state',true);
  for(const n of Object.values(p.streaks))numeric(n,0,1e9,'Streak',true);
  numeric(p.questPoints,0,1000,'Quest points',true);numeric(p.blockLimit,0,7,'Block limit',true);numeric(p.mortimerTasks,0,1e9,'Mortimer tasks',true);
  numeric(p.points,0,1e9,'Points',true);numeric(p.reserve,0,1e9,'Point reserve');numeric(p.globalDps,.1,10000,'DPS');numeric(p.skipSeconds,0,10000,'Skip seconds');numeric(p.requestMinutes,0,10000,'Request minutes');
  numeric(p.hypotheticalChoices,2,3,'Hypothetical choices',true);
  if(typeof p.assumeUnknown!=='boolean'||typeof p.applySetup!=='boolean'||typeof p.cape!=='boolean')throw Error('Invalid profile switches.');
  if(!['time','chance','points','kills-hour'].includes(p.objective)||!['none','sustainable','funded','boost-turael','boost-mazchna','reset-turael'].includes(p.strategy))throw Error('Unknown objective or strategy.');
  numeric(p.milestone,10,1000,'Boost milestone');if(![10,50,100,250,1000].includes(p.milestone))throw Error('Unsupported milestone.');
  for(const lists of [p.blocks,p.proposed])for(const [group,list]of Object.entries(lists)){
    if(!data.masters.some(m=>m.group===group)||!Array.isArray(list)||new Set(list).size!==list.length||list.some(id=>!ids.has(id)))throw Error('Invalid, duplicate or unknown block-list entries.');
    const assigned=new Set(data.masters.filter(m=>m.group===group).flatMap(m=>m.tasks.map(t=>t.id)));if(list.some(id=>!assigned.has(id)))throw Error('Block list includes an assignment not offered by this group.');
  }
  for(const [id,pref]of Object.entries(p.preferences))if(!ids.has(id)||!['keep','skip','protect','avoid'].includes(pref))throw Error('Unknown task preference.');
  for(const [id,method]of Object.entries(p.methods)){const [aid,vid]=id.split('::');if(!ids.has(aid)||vid&&vid!==method.variantId)throw Error('Unknown assignment or variant in methods.');validateMethod(data,method,aid);}
  for(const [name,method]of Object.entries(p.methodPresets)){if(name.length>100)throw Error('Preset name too long.');validateMethod(data,method);}
  if(!p.goal||!['offer','kills','drop'].includes(p.goal.kind)||!Array.isArray(p.goal.targets)||p.goal.targets.length<1||p.goal.targets.length>20)throw Error('Select between 1 and 20 targets.');
  const targets=new Set<string>();const assignments=new Set<string>();
  for(const t of p.goal.targets){if(!ids.has(t.assignmentId)||!data.variants.some(v=>v.id===t.variantId&&v.assignmentIds.includes(t.assignmentId)))throw Error('Target variant does not belong to the assignment.');if(assignments.has(t.assignmentId))throw Error('Use one preferred variant per assignment; overlapping variants cannot yet be combined as an exact location union.');assignments.add(t.assignmentId);const key=t.assignmentId+':'+t.variantId;if(targets.has(key))throw Error('Duplicate target.');targets.add(key);numeric(t.priority,1,100,'Priority');}
  numeric(p.goal.quantity,1,1e7,'Target quantity');numeric(p.goal.customDropRate,0,1,'Custom drop probability',true);
  numeric(p.simulation.trials,100,20000,'Trials');numeric(p.simulation.horizonOffers,10,10000,'Offer horizon');numeric(p.simulation.seed,0,4294967295,'Seed');numeric(p.simulation.sessionHours,.01,10000,'Session hours');
  if(!p.current||!['new','task','offer'].includes(p.current.kind))throw Error('Invalid current-task state.');
  numeric(p.current.remaining,0,10000,'Remaining kills');
  if(p.current.kind!=='new'&&(!data.masters.some(m=>m.id===p.current.masterId)||!ids.has(p.current.assignmentId)))throw Error('Current assignment requires a valid master and task.');
  if(p.current.kind==='task'&&!data.masters.find(m=>m.id===p.current.masterId)?.tasks.some(t=>t.id===p.current.assignmentId))throw Error('Current master cannot assign this task.');
  if(p.current.modifierPoints!==undefined)numeric(p.current.modifierPoints,0,10000,'Current modifier points');
  if(p.current.options){if(!Array.isArray(p.current.options)||p.current.options.length>3)throw Error('Supply at most three offer options.');for(const o of p.current.options){if(!ids.has(o.assignmentId)||!['none','points','quantity','clue','superior','xp'].includes(o.modifier)||typeof o.target!=='boolean')throw Error('Invalid pending offer option.');numeric(o.points,0,10000,'Modifier points');numeric(o.quantity,-1000,1000,'Quantity modifier');}}
  if(p.previousMasterId!==undefined&&!data.masters.some(m=>m.id===p.previousMasterId))throw Error('Choose a valid previous task master.');
  for(const value of [p.previousTargetCompatible,p.current.targetCompatible])if(value!==undefined&&typeof value!=='boolean')throw Error('Invalid actual target-location confirmation.');
  if(p.cape&&p.current.kind==='new'&&!ids.has(p.previousTask))throw Error('Choose the previous assignment when enabling the cape effect.');
  if(p.cape&&p.levels.slayer!==99)throw Error('The Slayer cape effect requires level 99 Slayer.');
  if(p.questImport!==undefined){
    const q=p.questImport;
    if(!q||typeof q!=='object'||typeof q.format!=='string'||q.format.length>60||!q.states||typeof q.states!=='object'||Array.isArray(q.states))throw Error('Invalid imported quest data.');
    if(q.playerName!==null&&(typeof q.playerName!=='string'||!/^[A-Za-z0-9 _-]{1,12}$/.test(q.playerName)))throw Error('Invalid imported quest account.');
    for(const date of [q.exportedAt,q.importedAt])if(date!==null&&(typeof date!=='string'||!Number.isFinite(Date.parse(date))))throw Error('Invalid quest import date.');
    if(Object.keys(q.states).length>1000)throw Error('Too many imported quests.');
    for(const [name,state]of Object.entries(q.states))if(name.length>120||!name||!Number.isInteger(state)||state<0||state>2)throw Error('Invalid imported quest state.');
    if(q.pointStates!==undefined&&(!q.pointStates||typeof q.pointStates!=='object'||Array.isArray(q.pointStates)||Object.keys(q.pointStates).length>1000||Object.entries(q.pointStates).some(([name,state])=>!pointQuestNames.has(questNameKey(name))||!Number.isInteger(state)||state<0||state>2)))throw Error('Invalid quest point states.');
    if(q.unknownPointQuests!==undefined&&(!Array.isArray(q.unknownPointQuests)||q.unknownPointQuests.length>1000||q.unknownPointQuests.some(name=>typeof name!=='string'||!name||name.length>120)))throw Error('Invalid unknown quest point records.');
    p.questImport={...(q.pointStates!==undefined?{pointStates:q.pointStates}:{}),...(q.unknownPointQuests!==undefined?{unknownPointQuests:q.unknownPointQuests}:{}),format:q.format,playerName:q.playerName,exportedAt:q.exportedAt,importedAt:q.importedAt,states:q.states};
  }
  if(!Array.isArray(p.notes)||p.notes.some(n=>typeof n!=='string'))throw Error('Invalid migration notes.');
  if(p.gearOverrides!==undefined){
    if(!p.gearOverrides||typeof p.gearOverrides!=='object'||Array.isArray(p.gearOverrides))throw Error('Invalid creature gear choices.');
    for(const [variant,families]of Object.entries(p.gearOverrides)){
      if(!data.variants.some(v=>v.id===variant)||!families||typeof families!=='object'||Array.isArray(families))throw Error('Invalid creature gear choices.');
      for(const [family,slots]of Object.entries(families)){
        if(!['melee','ranged','magic'].includes(family)||!slots||typeof slots!=='object'||Array.isArray(slots))throw Error('Invalid gear style choices.');
        for(const [slot,id]of Object.entries(slots))if(!EQUIPMENT_SLOTS.includes(slot as typeof EQUIPMENT_SLOTS[number])||!Number.isInteger(id)||!equipmentItem(id))throw Error('Invalid gear slot choice.');
      }
    }
  }
  if(p.bank!==undefined)p.bank=validateBank(p.bank);
  if(p.combat!==undefined)p.combat=validateCombat(p.combat);
  if(p.restrictBasicAccess!==undefined&&typeof p.restrictBasicAccess!=='boolean')throw Error('Invalid access restriction mode.');
  if(p.setup!==undefined){const v=p.setup;if(!v||v.version!==1||!Number.isInteger(v.step)||v.step<0||v.step>5||typeof v.complete!=='boolean'||!['pending','skipped','complete'].includes(v.tutorial)||!Array.isArray(v.imports)||v.imports.length>7||v.imports.some(n=>!['character.json','bank.json','inventory.json','equipment.json','group_storage.json','quests.json','diaries.json'].includes(n)))throw Error('Invalid character setup progress.');p.setup={version:1,step:v.step,complete:v.complete,imports:[...new Set(v.imports)],tutorial:v.tutorial};}
  validateHuntExtras(data,p);
  return p;
}
function validateMethod(data:Catalogue,m:Method,aid?:string):void{
  delete m.calculated;delete m.combatNote;
  if(m.useSelectedGear!==undefined&&typeof m.useSelectedGear!=='boolean')throw Error('Invalid selected gear timing option.');
  if(m.combatDefence!==undefined&&!['tank','prayer'].includes(m.combatDefence))throw Error('Invalid armour priority.');
  if(m.combatStyle!==undefined&&!['auto','melee','ranged','magic'].includes(m.combatStyle))throw Error('Invalid combat style.');
  if(m.stackSize!==undefined&&(!Number.isInteger(m.stackSize)||m.stackSize<1||m.stackSize>9))throw Error('Stack size must be 1–9.');
  if(m.manualCombat!==undefined&&typeof m.manualCombat!=='boolean')throw Error('Invalid manual combat override.');
  const v=data.variants.find(v=>v.id===m.variantId);if(!v||aid&&!v.assignmentIds.includes(aid))throw Error('Invalid method variant.');
  if(!['dps','kills-hour','task-minutes'].includes(m.timing)||!['none','slaughter','expeditious'].includes(m.bracelet))throw Error('Invalid timing method.');
  for(const k of ['rate','dps','delay','travel']as const)if(typeof m[k]!=='number'||!Number.isFinite(m[k])||m[k]<0||m[k]>1e6)throw Error('Invalid method rates.');
  if(m.dps<=0||m.timing!=='dps'&&m.rate<=0)throw Error('Timing rate must be positive.');
  if(m.locationChance!==null&&(typeof m.locationChance!=='number'||m.locationChance<0||m.locationChance>1||!Number.isFinite(m.locationChance)))throw Error('Location chance must be 0–1.');
  if(typeof m.location!=='string'||typeof m.extended!=='boolean')throw Error('Invalid method options.');
}
export function exportProfiles(profiles:Profile[],activeId:string):string{return JSON.stringify({schemaVersion:SCHEMA,activeId,profiles},null,2);}
export function importProfiles(data:Catalogue,text:string):{profiles:Profile[];activeId:string}{
  if(text.length>2_000_000)throw Error('Profile file exceeds 2 MB.');const payload=JSON.parse(text);safeTree(payload);
  if(payload.schemaVersion!==SCHEMA||!Array.isArray(payload.profiles)||payload.profiles.length<1||payload.profiles.length>MAX_CUSTOM_PROFILES+1)throw Error('Unsupported profile format or count.');
  const profiles:Profile[]=payload.profiles.map((p:unknown)=>validateProfile(data,p));
  if(customProfileCount(profiles)>MAX_CUSTOM_PROFILES)throw Error('Maximum of 50 custom profiles plus the built-in Maxed profile.');
  if(new Set(profiles.map(p=>p.id)).size!==profiles.length)throw Error('Duplicate profile IDs.');
  if(!profiles.some(p=>p.id===payload.activeId))throw Error('Active profile is missing.');return {profiles,activeId:payload.activeId};
}

// Explicit migration on a copy; unknown IDs fail validation rather than disappear.
export function rebaseProfiles(data:Catalogue,text:string):{profiles:Profile[];activeId:string}{
  if(text.length>2_000_000)throw Error('Profile file exceeds 2 MB.');
  const payload=JSON.parse(text);safeTree(payload);
  if(payload.schemaVersion!==SCHEMA||!Array.isArray(payload.profiles))throw Error('Only schema v2 profiles can be rebased.');
  for(const p of payload.profiles){const old=p.dataVersion,oldArea=p.areaDataVersion;p.dataVersion=data.version;p.areaDataVersion=AREA_VERSION;p.notes=[...(p.notes||[]),`Explicitly rebased from data ${old} to ${data.version}, area rules ${oldArea??'legacy'} to ${AREA_VERSION}; review eligibility, weights and methods.`];}
  return importProfiles(data,JSON.stringify(payload));
}

function validateHuntExtras(data:Catalogue,p:Profile):void{
  if(p.huntPresets!==undefined){
    if(!Array.isArray(p.huntPresets)||p.huntPresets.length>30)throw Error('Maximum 30 hunt presets.');
    const seen=new Set<string>();
    for(const h of p.huntPresets){
      if(!h||typeof h.id!=='string'||!h.id||seen.has(h.id)||typeof h.name!=='string'||!h.name.trim()||h.name.length>100||!data.masters.some(m=>m.id===h.masterId))throw Error('Invalid hunt preset.');
      seen.add(h.id);
      validateProfile(data,{...p,...Object.fromEntries(['goal','strategy','objective','proposed','preferences','methods','milestone','extensions'].map(k=>[k,(h as any)[k]])),huntPresets:[],taskHistory:[]});
    }
  }
  if(p.taskHistory!==undefined){
    if(!Array.isArray(p.taskHistory)||p.taskHistory.length>200)throw Error('Maximum 200 task records.');
    const seen=new Set<string>();
    for(const r of p.taskHistory){
      const m=data.masters.find(m=>m.id===r?.masterId);
      if(!r||typeof r.id!=='string'||!r.id||seen.has(r.id)||typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at))||!m?.tasks.some(t=>t.id===r.assignmentId)||!['complete','skip'].includes(r.action)||!['none','points','quantity','clue','superior','xp'].includes(r.modifier))throw Error('Invalid task record.');
      seen.add(r.id);validateMethod(data,r.method,r.assignmentId);
      if(r.method.variantId!==r.variantId)throw Error('Task record variant differs from its method.');
      for(const n of [r.pointsBefore,r.pointsAfter,r.streakBefore,r.streakAfter,r.modifierPoints])if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e9)throw Error('Invalid recorded point/streak value.');
      for(const n of [r.kills,r.combatMinutes])if(n!==null&&(typeof n!=='number'||!Number.isFinite(n)||n<=0||n>1e7))throw Error('Invalid task timing sample.');
      if(r.kills!==null&&!Number.isInteger(r.kills))throw Error('Recorded kills must be whole numbers.');
    }
  }
}
