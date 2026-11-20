import type {EquipmentItem,CombatStyle} from '../../src/combat/types';
export const equipment:EquipmentItem[];
export const spells:{name:string;max_hit:number;spellbook:string;element?:string}[];
export const monsterInputs:Record<string,unknown>;
export const PotionMap:Record<string,{calculateFn:(skills:Record<string,number>)=>Record<string,number>}>;
export function monsters():Record<string,any>[];
export function canonicalId(id:number):number;
export function styles(category:string):CombatStyle[];
export function bonuses(player:unknown,monster:unknown):Record<string,any>;
export function speed(player:unknown,monster:unknown):number;
type DelayedHit=[{getSum():number;probability:number},number];
export class Calc {constructor(player:any,monster:any,opts?:Record<string,unknown>);getDps():number;getTtk():number;getMax():number;getHitChance():number;getExpectedAttackSpeed():number;userIssues:{type:string;message?:string}[];distIsCurrentHpDependent(player:unknown,monster:unknown):boolean;getDistribution():{singleHitsplat:{withProbabilisticDelays(provider:unknown):DelayedHit[]}};getWeaponDelayProvider():unknown;distAtHp(base:DelayedHit[],hp:number):DelayedHit[]}
