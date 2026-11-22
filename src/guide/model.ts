import {locationTravel} from './travel';
import raw from '../../data/creature-guide.json';
import type {Source,Profile} from '../domain/types';
import {locationAccess} from '../rules/location-pool';
import {encounter} from './encounters';
import {EXTRA_LOCATIONS,LOCATION_NOTES} from './location-notes';
import type {Attack,Family,FightPlan,GuideForm,GuideRecord,GuideState,LocationPlan} from './types';
export * from './types';
export const GUIDE=raw as unknown as {version:string;records:Record<string,GuideRecord>;strategySources:Record<string,Source>};
export const GUIDE_KEY='slayer-creature-guide-v1';
export const APPROACHES=['auto','melee-tank','melee-prayer','ranged-tank','ranged-prayer','magic-tank','magic-prayer'] as const;
export function defaultGuideState():GuideState{return {variantId:'basilisk-knight',assignmentId:'',formId:GUIDE.records['basilisk-knight'].defaultForm,approach:'auto',priority:'balanced',onTask:true,fastTravel:false,location:''};}
export function parseGuideState(text:string|null):GuideState{
  const base=defaultGuideState();if(!text||text.length>8000)return base;
  try{const value=JSON.parse(text);if(!value||!GUIDE.records[value.variantId])return base;
    const record=GUIDE.records[value.variantId];
    return {...base,stackSize:Number.isInteger(value.stackSize)&&value.stackSize>=1&&value.stackSize<=9?value.stackSize:undefined,variantId:record.id,assignmentId:record.assignmentIds.includes(value.assignmentId)?value.assignmentId:'',
      formId:record.forms.some(f=>f.id===value.formId)?value.formId:record.defaultForm,
      approach:APPROACHES.includes(value.approach)?value.approach:'auto',
      priority:['balanced','cannon','barrage','access'].includes(value.priority)?value.priority:'balanced',
      onTask:typeof value.onTask==='boolean'?value.onTask:true,fastTravel:value.fastTravel===true,
      location:typeof value.location==='string'?value.location.slice(0,500):''};
  }catch{return base;}
}
export function guideForm(record:GuideRecord,state:GuideState):GuideForm{return record.forms.find(f=>f.id===state.formId)||record.forms.find(f=>f.id===record.defaultForm)||record.forms[0];}
export function leastDefended(form:GuideForm,keys:(keyof GuideForm)[]):(keyof GuideForm)[]{
  const known=keys.filter(k=>typeof form[k]==='number');if(!known.length)return [];
  const min=Math.min(...known.map(k=>form[k] as number));return known.filter(k=>form[k]===min);
}
function attackFor(family:Family,form:GuideForm):Attack{
  if(family==='melee'){const weak=leastDefended(form,['dstab','dslash','dcrush']);return weak.length===1?({dstab:'stab',dslash:'slash',dcrush:'crush'} as Record<string,Attack>)[weak[0]]:'slash';}
  if(family==='ranged'){const weak=leastDefended(form,['dlight','dstandard','dheavy']);return weak.length===1?({dlight:'light',dstandard:'standard',dheavy:'heavy'} as Record<string,Attack>)[weak[0]]:'standard';}
  const element=(form.elementalweaknesstype||'').toLowerCase();return ['air','water','earth','fire'].includes(element)&&!!form.elementalweaknesspercent?element as Attack:'powered';
}
export function fightPlan(record:GuideRecord,form:GuideForm,state:GuideState,location?:LocationPlan):FightPlan{
  const mechanics=encounter(record),requested=state.approach==='auto'?null:state.approach.split('-');
  const allowed=mechanics.allowed||['melee','ranged','magic'];
  const family=requested&&allowed.includes(requested[0] as Family)?requested[0] as Family:mechanics.family||'melee';
  const hard=/magic|ranged|missile/i.test(form['attack style']||'')||(form['combat']||0)>100;
  const defence=['kraken','thermonuclear-smoke-devil'].includes(record.id)?'tank':requested&&allowed.includes(requested[0] as Family)?requested[1] as 'tank'|'prayer':mechanics.defence||(hard?'prayer':'tank');
  let attack=mechanics.attack&&family===(mechanics.family||'melee')?mechanics.attack:attackFor(family,form);
  const notes=[...(mechanics.notes||[])];
  if(attack==='barrage'&&location?.multi!==true){attack='powered';notes.push('This location is not confirmed as a usable multi-target spell room. The set uses single-target Magic instead of assuming barrage works.');}
  if(['turoth','kurask'].includes(record.id))attack=family==='magic'?'dart':family==='ranged'?'heavy':'stab';
  if(mechanics.shield&&family==='ranged')attack='heavy';
  const style=(form['attack style']||'').toLowerCase();
  const defaultPrayer=/melee|stab|slash|crush/.test(style)?'Protect from Melee.':/ranged/.test(style)?'Protect from Missiles.':/magic/.test(style)?'Protect from Magic.':'Check the attack style and encounter source before choosing protection.';
  const protection=mechanics.prayer||(defence==='prayer'?defaultPrayer:'No protection prayer assumed for the tank example; activate the appropriate protection if incoming damage is too high.');
  if(!state.onTask&&['cerberus','kraken','cave-kraken','alchemical-hydra','araxxor','abyssal-sire','thermonuclear-smoke-devil'].includes(record.id))notes.push('Off-task mode changes gear bonuses; it does not grant access. This variant normally requires a suitable task, with only specifically documented exceptions.');
  if(mechanics.boss)notes.push('Boss setup: review the linked encounter strategy. The equipment and stat bars are preparation aids, not a complete kill method.');
  return {family,defence,attack,mechanics,notes,name:`${family==='magic'?'Magic':family==='ranged'?'Ranged':'Melee'} ${defence==='prayer'?'prayer':'tank'}${mechanics.hybrid?' · switches required':''}`,
    protection,offensivePrayer:family==='melee'?'Piety, or your best unlocked melee prayer.':family==='ranged'?'Rigour; otherwise Deadeye/Eagle Eye if unlocked.':'Augury; otherwise Mystic Vigour/Mystic Might if unlocked.',
    reason:mechanics.family?'Creature-specific mechanics take precedence over a simple defence comparison.':'Baseline example from the source attack style and relative equipment defences. This is not a DPS optimisation.'};
}
function matchesLevel(levels:string,combat:number|null):boolean{
  if(combat===null||!levels||!/^[\d\s,;–-]+$/.test(levels))return true;
  if(/^\d+\s*[-–]\s*\d+$/.test(levels)){const [a,b]=levels.split(/[-–]/).map(Number);return combat>=a&&combat<=b;}
  return (levels.match(/\d+/g)||[]).map(Number).includes(combat);
}
export function rankLocations(record:GuideRecord,form:GuideForm,state:GuideState,p?:Profile):LocationPlan[]{
  const extra=EXTRA_LOCATIONS[record.id]||(record.id.startsWith('reanimated-')?['Arceuus Dark Altar (reanimation area)']:[]);
  const candidates=record.locations.length?[...record.locations]:extra.map(name=>({name,page:null,region:null,levels:'',creature:record.name,caveat:'',taskOnly:false,limited:false}));
  if(record.id==='werewolf'&&form.combat===88)candidates.push({name:'Canifis (transformed townsfolk)',page:'Canifis',region:'Morytania',levels:'88',creature:'Werewolf',caveat:'Use a normal weapon to trigger the transformation; Wolfbane prevents it.',taskOnly:false,limited:false});
  const seen=new Set<string>();
  const levelMatches=candidates.filter(loc=>matchesLevel(loc.levels,form.combat)&&(!p?.restrictBasicAccess||locationAccess(loc.name,p,loc.page).value!==0));
  const locationForm=levelMatches.filter(loc=>form.label.length>10&&loc.name.toLowerCase().includes(form.label.toLowerCase()));
  return (locationForm.length?locationForm:levelMatches).filter(loc=>{const key=loc.name.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).map(loc=>{
    const meta=LOCATION_NOTES.find(m=>m.match.test(loc.name));
    const wilderness=/wilderness/i.test(loc.region||'')||/wilderness|revenant|callisto|artio|vet[’']ion|calvar|venenatis|spindel|scorpia|web chasm|skeletal tomb|hunter.?s end|king black dragon|bone yard|demonic ruins|lava maze|resource area|dark warriors.? fortress|frozen waste|mage arena/i.test(loc.name);
    const riskKnown=wilderness||!!loc.region||!!meta;
    const limited=loc.limited||/quest encounter|random spawn|trap spawn|boss summon|summoned/i.test(loc.name);
    const access=p?locationAccess(loc.name,p,loc.page):null;
    const available=!limited&&(!loc.taskOnly||state.onTask)&&access?.value!==0;
    const immune=/^yes\b/i.test(form.immunecannon||'');
    const cannon=immune?false:meta?.cannon??null,multi=meta?.multi??null;
    const reasons:string[]=[];
    let score=25+(wilderness?-25:riskKnown?20:0)+(meta?.convenience??2)*3;
    if(wilderness)reasons.push('Wilderness PvP risk on this location or its approach.');
    if(meta){reasons.push(meta.note||'Reviewed route and access caveats are available.');}else reasons.push('Route not reviewed: the ranking uses limited source information.');
    const routes=p?locationTravel(loc.name,p,meta?.travel||['Reach the named region','Use the entrance described by the location source',loc.name],loc.page||loc.name):[];
    if(routes.some(r=>r.available&&r.methods.length)){score+=12;reasons.push('A recorded teleport route is available for this character.');}
    if(state.priority==='cannon'){if(cannon===true){score+=35;reasons.push('Confirmed cannon placement for this route and a cannon-susceptible creature.');}else score-=15;}
    if(state.priority==='barrage'){if(multi===true){score+=35;reasons.push('Multi-combat is useful for stacking where the room permits.');}else score-=15;}
    if(state.priority==='access'){score-=Math.min(25,(meta?.requires?.length||0)*6);if(!meta)score-=12;reasons.push('Lower-requirement routes are favoured; unknown access is not assumed free.');}
    if(!available){score-=120;reasons.push(limited?'Quest, summoned, trap or non-repeatable appearance: not a normal farming route.':'Task-only room: off-task access is not assumed.');}
    const requires=[...(meta?.requires||[])];if(access?.value===0)requires.push(access.reason);if(loc.caveat)requires.push(loc.caveat);if(loc.taskOnly)requires.push('A matching Slayer task is required in this room.');
    if(['calvar-ion','spindel'].includes(record.id))requires.push('Hard Wilderness diary OR the specific matching boss Slayer task; an ordinary skeleton/spider task does not bypass the diary rule.');
    if(loc.name.includes('King Black Dragon'))requires.push('The lair itself is outside PvP; the approach crosses the Wilderness.');
    return {...loc,travelOptions:routes,accessBlocked:access?.value===0,limited,available,score,reasons,requires,cannon,multi,wilderness,riskKnown,reviewed:!!meta,
      travel:meta?.travel||['Reach the named region','Check the entrance on the source page',loc.name],fastRoute:meta?.fast||null,
      sourceUrl:loc.page?'https://oldschool.runescape.wiki/w/'+encodeURIComponent(loc.page.replaceAll(' ','_')):record.source.url};
  }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
}
export function selectedLocation(record:GuideRecord,form:GuideForm,state:GuideState,p?:Profile):LocationPlan|undefined{
  const ranked=rankLocations(record,form,state,p).filter(loc=>!loc.accessBlocked);return ranked.find(loc=>loc.name===state.location)||ranked.find(loc=>loc.available)||ranked[0];
}
export function guideSources(record:GuideRecord):Source[]{
  const sources=[record.source,GUIDE.strategySources['slayer training']];
  const key=record.source.title.toLowerCase()+'/strategies';
  if(GUIDE.strategySources[key])sources.push(GUIDE.strategySources[key]);
  if(['branda-the-fire-queen','eldric-the-ice-king'].includes(record.id))sources.push(GUIDE.strategySources['royal titans/strategies']);
  return sources.filter(Boolean);
}
