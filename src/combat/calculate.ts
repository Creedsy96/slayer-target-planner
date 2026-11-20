import {Calc,bonuses,speed,styles,spells,monsters,monsterInputs,PotionMap,ammoApplicability,AmmoApplicability} from '../../vendor/osrs-dps/runtime.js';
import type {Profile} from '../domain/types';
import type {GuideRecord,GuideForm,Family} from '../guide/types';
import type {CombatResult,CombatStyle,Loadout} from './types';
import {equipmentItem} from './equipment';
import {EQUIPMENT_SLOTS} from './types';
import {defaultCombat} from '../state/bank';
import {canAutocast} from './autocast';
import {expectedKillSeconds} from './kill-time';

const npcList=monsters();
const normal=(s:string)=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]/g,'');
const npcIndex=new Map<string,Record<string,any>[]>();
for(const npc of npcList){const key=normal(npc.name);npcIndex.set(key,[...(npcIndex.get(key)||[]),npc]);}
const npcCache=new WeakMap<GuideForm,Record<string,any>>();
export function monsterFor(record:GuideRecord,form:GuideForm):Record<string,any>|undefined{
 const cached=npcCache.get(form);if(cached)return structuredClone(cached);
 const candidates=[...new Set([...(npcIndex.get(normal(record.source.title))||[]),...(npcIndex.get(normal(record.name))||[])])];
 const hp=candidates.filter(m=>m.skills.hp===form.hitpoints);
 const version=hp.filter(m=>!!m.version&&(normal(m.version)===normal(form.label)||normal(form.label).includes(normal(m.version))));
 const match=(version.length?version:hp.length?hp:candidates).find(m=>m.skills.def===form.def&&m.skills.magic===form.mage)||(hp.length===1?hp[0]:candidates.length===1?candidates[0]:undefined);
 if(!match||!form.hitpoints)return undefined;
 const m=structuredClone(match);m.skills={...m.skills,atk:form.att??m.skills.atk,str:form.str??m.skills.str,def:form.def??m.skills.def,hp:form.hitpoints,magic:form.mage??m.skills.magic,ranged:form.range??m.skills.ranged};
 m.size=form.size??m.size;
 const element=(form.elementalweaknesstype||'').toLowerCase();
 m.weakness=['air','water','earth','fire'].includes(element)&&form.elementalweaknesspercent!==null?{element,severity:form.elementalweaknesspercent}:null;
 for(const [key,value]of Object.entries({stab:form.dstab,slash:form.dslash,crush:form.dcrush,magic:form.dmagic,light:form.dlight,standard:form.dstandard,heavy:form.dheavy}))if(value!==null)m.defensive[key]=value;
 m.inputs={...structuredClone(monsterInputs),monsterCurrentHp:form.hitpoints};npcCache.set(form,m);return structuredClone(m);
}
export function combatStyles(id:number):CombatStyle[]{const item=equipmentItem(id);return item?styles(item.category):styles('Unarmed');}
export function familyOf(style:CombatStyle):Family{return style.type==='magic'?'magic':style.type==='ranged'?'ranged':'melee';}
export function isWildernessCombat(record:GuideRecord,location?:{name:string;wilderness:boolean}):boolean{
 return location?.wilderness===true&&record.id!=='king-black-dragon'&&!/King Black Dragon.*Lair/i.test(location.name);
}
export function spellChoices(level:number,book:string,p?:Profile):string[]{
 const fixed:Record<string,number>={'Wind Strike':1,'Water Strike':5,'Earth Strike':9,'Fire Strike':13,'Wind Bolt':17,'Water Bolt':23,'Earth Bolt':29,'Fire Bolt':35,'Wind Blast':41,'Water Blast':47,'Earth Blast':53,'Fire Blast':59,'Wind Wave':62,'Water Wave':65,'Earth Wave':70,'Fire Wave':75,'Wind Surge':81,'Water Surge':85,'Earth Surge':90,'Fire Surge':95,'Smoke Burst':62,'Shadow Burst':64,'Blood Burst':68,'Ice Burst':70,'Smoke Barrage':86,'Shadow Barrage':88,'Blood Barrage':92,'Ice Barrage':94,'Magic Dart':50,'Flames of Zamorak':60,'Inferior Demonbane':44,'Superior Demonbane':62,'Dark Demonbane':82};
 const books=book==='auto'?['standard',...((p?.quests['Desert Treasure I']??p?.questImport?.states['Desert Treasure I'])===2?['ancient']:[]),...((p?.quests['A Kingdom Divided']??p?.questImport?.states['A Kingdom Divided'])===2?['arceuus']:[])]:[book];
 return spells.filter(s=>books.includes(s.spellbook)&&fixed[s.name]!==undefined&&level>=fixed[s.name]).map(s=>s.name);
}
export function emptyCombat(reason:string,loadout:Loadout={},source:CombatResult['source']='bank'):CombatResult{
 return {dps:0,ttk:0,maxHit:0,hitChance:0,attackSeconds:0,style:{name:'Unavailable',type:null,stance:''},spell:null,loadout,notes:[],supported:false,reason,source,family:'melee'};
}
export function calculateCombat(p:Profile,record:GuideRecord,form:GuideForm,loadout:Loadout,style:CombatStyle,spellName:string|null,onTask:boolean,wilderness:boolean,full=true):CombatResult{
 loadout={...loadout};
 const spell=spellName?spells.find(s=>s.name.toLowerCase()===spellName!.toLowerCase()):undefined;
 spellName=spell?.name??spellName;
 if(spellName&&(!spell||!spellChoices(p.levels.magic??1,spell.spellbook).includes(spellName)))return emptyCombat('The selected spell is unavailable at this Magic level.',loadout);
 const monster=monsterFor(record,form);if(!monster)return emptyCombat('No unambiguous NPC mapping for this source form.',loadout);
 const config=p.combat??defaultCombat();
 if(['attack','strength','defence','ranged','magic','prayer','hitpoints'].some(key=>p.levels[key]==null))return emptyCombat('Enter or import every combat skill, including Attack and Prayer.',loadout);
 const equipment=Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot,loadout[slot]?structuredClone(equipmentItem(loadout[slot]!))||null:null]));
 for(const slot of EQUIPMENT_SLOTS)if(loadout[slot]&&(!equipment[slot]||equipment[slot].slot!==slot))return emptyCombat('Unknown equipment or item placed in the wrong gear slot.',loadout);
 const weapon=equipment.weapon;
 if(familyOf(style)==='magic'&&spell&&!canAutocast(weapon,spell.name,loadout))return emptyCombat('This weapon cannot autocast '+spell.name+'. Manual casting is not assumed.',loadout);
 if(equipment.ammo&&weapon?.name!=='Toxic blowpipe'&&ammoApplicability(weapon?.id,equipment.ammo.id)!==AmmoApplicability.INCLUDED&&equipment.ammo.bonuses.prayer===0){delete loadout.ammo;equipment.ammo=null;}
 if(weapon?.isTwoHanded&&equipment.shield)return emptyCombat('A two-handed weapon cannot use an off-hand item.',loadout);
 // Blowpipe darts are contained in the weapon, not a worn ammunition slot.
 if(weapon?.name==='Toxic blowpipe'&&equipment.ammo&&/dart/i.test(equipment.ammo.name)){
  weapon.itemVars={blowpipeDartName:equipment.ammo.name,blowpipeDartId:equipment.ammo.id};equipment.ammo=null;
 }
 const skills={atk:p.levels.attack!,str:p.levels.strength!,def:p.levels.defence!,ranged:p.levels.ranged!,magic:p.levels.magic!,prayer:p.levels.prayer!,hp:p.levels.hitpoints!,mining:p.levels.mining??1,herblore:p.levels.herblore??1,farming:p.levels.farming??1};
 const boosts=Object.fromEntries(Object.keys(skills).map(k=>[k,0]));const family=familyOf(style);
 if(config.potions==='standard')Object.assign(boosts,PotionMap[family==='melee'?14:family==='ranged'?7:4].calculateFn(skills));
 const prayers:number[]=[];
 if(config.prayer!=='none'){
  const level=skills.prayer;
  const highest=(options:[number,number][])=>options.find(([required])=>level>=required)?.[1];
  const add=(id:number|undefined)=>{if(id!==undefined)prayers.push(id);};
  if(family==='melee'){if(config.prayer==='unlocked'&&config.piety&&level>=70&&skills.def>=70)prayers.push(13);else {add(highest([[31,8],[13,4],[4,0]]));add(highest([[34,9],[16,5],[7,1]]));}}
  if(family==='ranged'){if(config.prayer==='unlocked'&&config.rigour&&level>=74&&skills.def>=70)prayers.push(14);else add(highest([[44,10],[26,6],[8,2]]));}
  if(family==='magic'){if(config.prayer==='unlocked'&&config.augury&&level>=77&&skills.def>=70)prayers.push(15);else add(highest([[45,11],[27,7],[9,3]]));}
 }
 const player:any={uuid:'planner',name:'Planner',skills,boosts,equipment,style,prayers,spell:spellName?spells.find(s=>s.name===spellName)||null:null,attackSpeed:4,buffs:{potions:[],onSlayerTask:onTask,inWilderness:wilderness,forinthrySurge:false,soulreaperStacks:0,baAttackerLevel:0,chinchompaDistance:4,kandarinDiary:false,chargeSpell:false,markOfDarknessSpell:config.markOfDarkness===true&&skills.magic>=59,usingSunfireRunes:false,fragmentOfWind:false,fragmentOfWater:false,fragmentOfEarth:false,fragmentOfFire:false}};
 Object.assign(player,bonuses(player,monster));player.attackSpeed=speed(player,monster);
 try{
  const calc=new Calc(player,monster),dps=calc.getDps(),issues=calc.userIssues.filter(issue=>!issue.type.endsWith('_unsupported_spec')).map(issue=>issue.type);
  const invalid=issues.some(n=>/ammo_missing|ammo_wrong|spell_wrong|weapon_wrong|unsupported_effect|unsupported_set_effect/.test(n));
  if(!Number.isFinite(dps)||dps<=0||invalid)return emptyCombat(invalid?(calc.userIssues.find(issue=>/ammo_missing|ammo_wrong|spell_wrong|weapon_wrong|unsupported_effect|unsupported_set_effect/.test(issue.type))?.message||'The engine reports incompatible or unsupported equipment/ammunition.'):'This setup cannot damage the selected creature.',loadout);
  if(!Number.isFinite(calc.getHitChance())||calc.getHitChance()<0||calc.getHitChance()>1||!Number.isFinite(calc.getMax())||calc.getMax()<0||!Number.isFinite(calc.getExpectedAttackSpeed())||calc.getExpectedAttackSpeed()<=0)return emptyCombat('DPS sanity check failed: invalid hit chance, max hit or attack speed.',loadout);
  const hpDependent=calc.distIsCurrentHpDependent(player,monster);
  let ttk=full?calc.getTtk():0;
  if(full&&hpDependent){
   const base=calc.getDistribution().singleHitsplat.withProbabilisticDelays(calc.getWeaponDelayProvider());
   ttk=expectedKillSeconds(form.hitpoints!,hp=>calc.distAtHp(base,hp).map(([hit,delay])=>({damage:hit.getSum(),probability:hit.probability,seconds:delay*.6})));
  }
  if(full&&(!Number.isFinite(ttk)||ttk<=0))return emptyCombat('The engine could not produce a finite kill time.',loadout);
  const notes:string[]=issues.map(code=>/recoil/.test(code)?'Recoil damage is not included.':/monster/.test(code)?'The creature has encounter mechanics beyond a stationary attack calculation.':'The engine reports an additional equipment-effect limitation.');
  if(hpDependent)notes.push('DPS is measured at full NPC HP. Kill time recalculates HP-dependent effects after every hit.');
  return {dps,ttk,maxHit:calc.getMax(),hitChance:calc.getHitChance(),attackSeconds:calc.getExpectedAttackSpeed()*.6,style,spell:spellName,loadout:{...loadout},notes,supported:true,reason:'',source:'bank',family,hpDependent};
 }catch(error){return emptyCombat('DPS engine could not evaluate this combination: '+(error instanceof Error?error.message:'invalid inputs'),loadout);}
}

export function candidateSpells(p:Profile):string[]{
 const choices=spellChoices(p.levels.magic??1,(p.combat??defaultCombat()).spellbook,p),groups=new Map<string,string>();
 for(const name of choices){
  const key=/^(Wind|Water|Earth|Fire) /.test(name)?name.split(' ')[0]:/Burst|Barrage/.test(name)?'ancient-area':/Demonbane/.test(name)?'demonbane':name;
  const previous=groups.get(key);if(!previous||(spells.find(s=>s.name===name)?.max_hit??0)>(spells.find(s=>s.name===previous)?.max_hit??0))groups.set(key,name);
 }
 return [...groups.values()];
}
