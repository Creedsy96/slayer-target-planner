import {canonicalId,equipment} from '../../vendor/osrs-dps/runtime.js';
import requirements from '../../data/equipment-requirements.json';
const noted:Record<string,string>=requirements.noted;
const unusable=new Set(equipment.filter(i=>/broken|uncharged|inactive|\b0\b/i.test(i.version)).map(i=>i.id));
const placeholders=new Set(requirements.placeholders);
export const isPlaceholderId=(id:number)=>placeholders.has(id);
export function canonicalInventoryId(id:number):number{const unnoted=Number(noted[id]||id);return unusable.has(unnoted)?unnoted:canonicalId(unnoted);}

const gearIds=new Set(equipment.map(i=>i.id));
export const isGearId=(id:number)=>gearIds.has(canonicalInventoryId(id));
