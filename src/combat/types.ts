export const EQUIPMENT_SLOTS=['head','cape','neck','ammo','weapon','body','shield','legs','hands','feet','ring'] as const;
export type EquipmentSlot=typeof EQUIPMENT_SLOTS[number];
export interface EquipmentItem {id:number;name:string;version:string;slot:EquipmentSlot;speed:number;category:string;isTwoHanded:boolean;bonuses:{str:number;ranged_str:number;magic_str:number;prayer:number};offensive:Record<string,number>;defensive:Record<string,number>;itemVars?:{blowpipeDartName?:string;blowpipeDartId?:number}}
export type Loadout=Partial<Record<EquipmentSlot,number>>;
export interface CombatStyle {name:string;type:string|null;stance:string}
export interface BankSnapshot {items:Record<string,number>;at:string|null;account:string|null;label:string}
export type BankKind='bank'|'inventory'|'equipment'|'group_storage';
export interface BankState {version:1;account:string|null;snapshots:Partial<Record<BankKind,BankSnapshot>>;manual:Record<string,number>;groupManual:Record<string,number>;includeGroup:boolean}
export interface CombatSettings {enabled:boolean;potions:'none'|'standard';prayer:'none'|'standard'|'unlocked';uptime:number;rigour:boolean;augury:boolean;piety:boolean;allowUnknownRequirements:boolean;spellbook:'auto'|'standard'|'ancient'|'arceuus';markOfDarkness:boolean;style:'auto'|'melee'|'ranged'|'magic'}
export interface CombatResult {dps:number;ttk:number;maxHit:number;hitChance:number;attackSeconds:number;style:CombatStyle;spell:string|null;loadout:Loadout;notes:string[];supported:boolean;reason:string;source:'bank'|'example';family:string;hpDependent?:boolean;targets?:number;aggregateDps?:number;effectiveTtk?:number}
