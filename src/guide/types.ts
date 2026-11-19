import type {Requirement,Source} from '../domain/types';

export interface GuideForm {
  id:string;label:string;name:string|null;combat:number|null;hitpoints:number|null;
  att:number|null;str:number|null;def:number|null;mage:number|null;range:number|null;slaylvl:number|null;size:number|null;
  dstab:number|null;dslash:number|null;dcrush:number|null;dmagic:number|null;dlight:number|null;dstandard:number|null;dheavy:number|null;
  'attack speed':number|null;'attack style':string|null;'max hit':string|null;
  elementalweaknesstype:string|null;elementalweaknesspercent:number|null;
  poisonous:string|null;aggressive:string|null;attributes:string|null;immunecannon:string|null;
  poisonresistance:string|null;venomresistance:string|null;combatText:string;attackSpeedText:string;
}
export interface GuideLocation {name:string;page:string|null;region:string|null;levels:string;creature:string;caveat:string;taskOnly:boolean;limited:boolean}
export interface GuideRecord {id:string;name:string;assignmentIds:string[];forms:GuideForm[];defaultForm:string;locations:GuideLocation[];requirements:Requirement[];status:string;source:Source&{timestamp:string}}
export type Family='melee'|'ranged'|'magic';
export type Approach='auto'|'melee-tank'|'melee-prayer'|'ranged-tank'|'ranged-prayer'|'magic-tank'|'magic-prayer';
export type Attack='stab'|'slash'|'crush'|'light'|'standard'|'heavy'|'powered'|'barrage'|'air'|'water'|'earth'|'fire'|'vampyrebane'|'godspell'|'dart';
export interface GuideState {variantId:string;assignmentId:string;formId:string;approach:Approach;priority:'balanced'|'cannon'|'barrage'|'access';onTask:boolean;fastTravel:boolean;location:string}
export interface Encounter {
  family?:Family;defence?:'tank'|'prayer';prayer?:string;attack?:Attack;allowed?:Family[];
  shield?:[string,string];head?:string;neck?:string;boots?:string;weapon?:[string,string];
  tools?:string[];notes?:string[];switches?:[string,string];boss?:boolean;magicDefenceTank?:boolean;
  dragonfire?:boolean;wyvern?:boolean;shayzien?:boolean;hybrid?:boolean;poison?:boolean;venom?:boolean;
}
export interface FightPlan {family:Family;defence:'tank'|'prayer';attack:Attack;name:string;protection:string;offensivePrayer:string;reason:string;mechanics:Encounter;notes:string[]}
export interface GearSlot {slot:string;item:string;note?:string}
export interface GearSet {tier:'mid'|'max';title:string;offence:string;slots:GearSlot[];notes:string[];switches:string[]}
export interface Supply {item:string;purpose:string;kind:'protection'|'prayer'|'boost'|'utility';essential:boolean}
export interface LocationPlan extends GuideLocation {score:number;reasons:string[];travel:string[];fastRoute:string|null;requires:string[];cannon:boolean|null;multi:boolean|null;wilderness:boolean;riskKnown:boolean;reviewed:boolean;sourceUrl:string;available:boolean}
