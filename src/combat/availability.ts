import {canonicalId} from '../../vendor/osrs-dps/runtime.js';
import type {Profile} from '../domain/types';
import type {EquipmentItem} from './types';
import {ITEMS,ownedItems,temporaryEquipment} from './equipment';
import exclusions from '../../data/assumed-gear-exclusions.json';

/** Ordinary-game equipment only: activity/seasonal/PvP-only items cannot be
 * assumed usable for a normal Slayer encounter. Equivalent cosmetic/charge
 * variants share the engine's canonical identity and need one candidate. */
const assumed=[...new Map(ITEMS.filter(item=>
  !Object.hasOwn(exclusions.items,item.id)&&!temporaryEquipment(item)&&! /uncharged|broken|inactive|\b0\b/i.test(item.version)&&
  !/deadman|last man standing|emir.s arena|beta|tournament|leagues|unobtainable|\(bh\)|blighted/i.test(item.name+' '+item.version)&&
  (!/^echo /i.test(item.name)||/^echo boots$/i.test(item.name))
).map(item=>[canonicalId(item.id),item])).values()];

export function availableItems(p:Profile):EquipmentItem[]{
  return p.assumeAllGear===true?[...assumed]:ownedItems(p);
}
