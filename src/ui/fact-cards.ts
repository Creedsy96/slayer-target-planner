import type {Profile,Catalogue} from '../domain/types';
import {creatureIcon} from './creature-art';
import {interfaceIcon} from './interface-icons';
import {escapeHtml as esc} from './html';
const creatures:Record<string,string>={basilocked:'basilisk-knight','watch-the-birdie':'aviansie','seeing-red':'brutal-red-dragon','hot-stuff':'tzhaar-ket','reptile-got-ripped':'lizardman-shaman','like-a-boss':'abyssal-sire','stop-the-wyvern':'spitting-wyvern','vampyres':'vyrewatch-sentinel','wildy-more':'revenant-cyclops','warped-reality':'terrorbird','wings-spread':'gryphon','lured-in':'aquanite','heavy-frost':'frost-dragon'};
// Rewards-shop order from the captured Slayer Rewards source, omitting rewards
// this planner does not model. Read left to right, then top to bottom.
const rewardOrder=['seeing-red','watch-the-birdie','hot-stuff','like-a-boss','reptile-got-ripped','stop-the-wyvern','basilocked','vampyres','wildy-more','warped-reality','lured-in','wings-spread','heavy-frost'];
export function factCard(label:string,value:number|null|undefined,attributes:string,icon='',note=''):string{
 const enabled=value===1;
 return `<button type="button" class="fact-card ${enabled?'enabled':''}" ${attributes} aria-pressed="${enabled}">${icon||interfaceIcon('account')}<span class="fact-copy"><strong>${esc(label)}</strong>${note?`<small>${esc(note)}</small>`:''}${value==null?'<small>Unconfirmed &middot; displayed off</small>':''}</span><span class="fact-state" aria-hidden="true">${enabled?'&#10003; Yes':'No'}</span></button>`;
}
export function rewardCards(data:Catalogue,p:Profile):string{
 const keys=[...rewardOrder.filter(key=>Object.hasOwn(data.unlocks,key)),...Object.keys(data.unlocks).filter(key=>!rewardOrder.includes(key))];
 return `<div class="fact-grid reward-grid">${keys.map(key=>{const label=data.unlocks[key];return factCard(label,p.unlocks[key],`data-fact-toggle="unlocks" data-key="${esc(key)}"`,creatureIcon(creatures[key]),'Only enable rewards purchased with Slayer points.');}).join('')}</div>`;
}
