import type {Profile,Catalogue} from '../domain/types';
import {creatureIcon} from './creature-art';
import {interfaceIcon} from './interface-icons';
import {escapeHtml as esc} from './html';
import unlocks from '../../data/slayer-unlocks.json';
const creatures:Record<string,string>={basilocked:'basilisk-knight','watch-the-birdie':'aviansie','seeing-red':'brutal-red-dragon','hot-stuff':'tzhaar-ket','reptile-got-ripped':'lizardman-shaman','like-a-boss':'abyssal-sire','stop-the-wyvern':'spitting-wyvern','vampyres':'vyrewatch-sentinel','wildy-more':'revenant-cyclops','warped-reality':'terrorbird','wings-spread':'gryphon','lured-in':'aquanite','heavy-frost':'frost-dragon'};
// Rewards-shop order from the captured Slayer Rewards source, omitting rewards
// this planner does not model. Read left to right, then top to bottom.
const rewardOrder=['seeing-red','watch-the-birdie','hot-stuff','like-a-boss','reptile-got-ripped','stop-the-wyvern','basilocked','vampyres','wildy-more','warped-reality','lured-in','wings-spread','heavy-frost'];
export function factCard(label:string,value:number|null|undefined,attributes:string,icon='',note='',mixed=false):string{
 const enabled=value===1;
 return `<button type="button" class="fact-card ${enabled?'enabled':''}" ${attributes} aria-pressed="${mixed?'mixed':enabled}">${icon||interfaceIcon('account')}<span class="fact-copy"><strong>${esc(label)}</strong>${note?`<small>${esc(note)}</small>`:''}${value==null?'<small>Not yet confirmed</small>':''}</span><span class="fact-state" aria-hidden="true">${mixed?'Review':value==null?'Unconfirmed':enabled?'&#10003; Yes':'No'}</span></button>`;
}
export function rewardCards(data:Catalogue,p:Profile,query=''):string{
 const rewards:Record<string,{points:number;description:string}>=unlocks.rewards,q=query.trim().toLowerCase();
 const keys=[...rewardOrder.filter(key=>Object.hasOwn(data.unlocks,key)),...Object.keys(data.unlocks).filter(key=>!rewardOrder.includes(key))]
  .filter(key=>[data.unlocks[key],rewards[key]?.description||''].some(text=>text.toLowerCase().includes(q)));
 return `<p class="small muted">Record rewards you have purchased or enabled in game. No points are spent here; quest, skill and location requirements still apply.</p><div class="fact-grid reward-grid">${keys.map(key=>{
  const reward=rewards[key],note=reward?`${reward.points===0?'Free':reward.points+' points'} · ${reward.description}`:'Only enable rewards purchased with Slayer points.';
  return factCard(data.unlocks[key],p.unlocks[key],`data-fact-toggle="unlocks" data-key="${esc(key)}"`,creatureIcon(creatures[key]),note);
 }).join('')}</div>${keys.length?'':'<p class="small muted">No task unlocks match this filter.</p>'}<p class="small muted"><a href="${unlocks.source.url}?oldid=${unlocks.source.revision}#Unlock" target="_blank" rel="noopener">Slayer unlock effects and costs</a></p>`;
}
