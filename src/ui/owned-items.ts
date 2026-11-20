import atlas from './owned-art.json';
import type {EquipmentItem} from '../combat/types';
import {itemWikiUrl} from './item-links';
import {escapeHtml} from './html';
const entries:Record<string,{frame:number}>=atlas.entries;
export function ownedItemLink(item:EquipmentItem):string{
 const entry=entries[item.id];
 const icon=entry?`<span class="owned-item-icon" aria-hidden="true" style="--item-col:${entry.frame%atlas.columns};--item-row:${Math.floor(entry.frame/atlas.columns)};--item-cols:${atlas.columns};--item-rows:${atlas.rows}"></span>`:'<span aria-hidden="true" class="unknown-item-icon">◇</span>';
 return `<a class="item-link" href="${escapeHtml(itemWikiUrl(item.name))}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(item.name)} — OSRS Wiki">${icon}<span>${escapeHtml(item.name)}</span></a>`;
}
