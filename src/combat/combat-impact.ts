import {noStatExceptions} from '../../vendor/osrs-dps/runtime.js';
import type {EquipmentItem} from './types';

// Reuse the pinned engine's zero-stat effects, plus survival/Slayer equipment
// whose utility is outside its outgoing-DPS model. Travel/skilling alone does
// not qualify; bank ownership is independent of combat relevance.
const utility=new Set([...noStatExceptions,
 'Lit bug lantern','Witchwood icon','Insulated boots','Boots of stone',
 'Ring of life','Escape crystal','Armadyl pendant','Ice gloves',
 'Desert shirt','Desert robe','Desert boots','Desert amulet 4',
 'Torch','Bruma torch','Lit candle','Lit black candle','Lit oil lamp','Lit oil lantern','Bullseye lantern',
].map(name=>name.toLowerCase()));

const encounterProtection=new Set(['Facemask','Earmuffs','Nose peg','Reinforced goggles','Bug lantern','Lit bug lantern','Witchwood icon','Insulated boots','Boots of stone'].map(name=>name.toLowerCase()));
const positiveBonuses=(item:EquipmentItem)=>[item.bonuses,item.offensive,item.defensive].some(group=>Object.values(group).some(value=>Number.isFinite(value)&&value>0));
export function hasCombatImpact(item:EquipmentItem):boolean{
 if(utility.has(item.name.toLowerCase())||/^ring of (?:recoil|wealth)(?:\b| \()/i.test(item.name))return true;
 return positiveBonuses(item);
}

/** Pure protection with zero bonuses is useful only for its matching encounter. */
export function combatCandidate(item:EquipmentItem,required=false):boolean{
 return required||positiveBonuses(item)||hasCombatImpact(item)&&!encounterProtection.has(item.name.toLowerCase());
}
