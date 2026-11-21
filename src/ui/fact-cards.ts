import type {Profile,Catalogue} from '../domain/types';
import {creatureIcon} from './creature-art';
import {interfaceIcon} from './interface-icons';
import {escapeHtml as esc} from './html';
const creatures:Record<string,string>={basilocked:'basilisk-knight','watch the birdie':'aviansie','seeing red':'brutal-red-dragon','hot stuff':'tzhaar-ket','reptile got ripped':'lizardman-shaman','like a boss':'abyssal-sire','stop the wyvern':'spitting-wyvern','actual vampyre slayer':'vyrewatch-sentinel','i wildy more slayer':'revenant-cyclops','warped reality':'terrorbird','wings spread':'gryphon','lured in':'aquanite','chance of heavy frost':'frost-dragon'};
export function factCard(label:string,value:number|null|undefined,attributes:string,icon='',note=''):string{
 const enabled=value===1;
 return `<button type="button" class="fact-card ${enabled?'enabled':''}" ${attributes} aria-pressed="${enabled}">${icon||interfaceIcon('account')}<span class="fact-copy"><strong>${esc(label)}</strong>${note?`<small>${esc(note)}</small>`:''}${value==null?'<small>Unconfirmed &middot; displayed off</small>':''}</span><span class="fact-state" aria-hidden="true">${enabled?'&#10003; Yes':'No'}</span></button>`;
}
export function rewardCards(data:Catalogue,p:Profile):string{
 return `<div class="fact-grid">${Object.entries(data.unlocks).map(([key,label])=>factCard(label,p.unlocks[key],`data-fact-toggle="unlocks" data-key="${esc(key)}"`,creatureIcon(creatures[label.toLowerCase()]||creatures[key.toLowerCase()]||'basilisk'),'Only enable rewards purchased with Slayer points.')).join('')}</div>`;
}
