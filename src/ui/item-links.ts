import atlas from './item-art.json';

type Reference={page:string;itemId:number|null};
const aliases:Record<string,Reference>=Object.fromEntries(Object.entries(atlas.aliases).map(([name,ref])=>[name.toLowerCase(),ref]));
const entries:Record<string,{frame:number;name:string}>=atlas.entries;
const esc=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const names=Object.keys(aliases).sort((a,b)=>b.length-a.length);
const pattern=new RegExp(`(?<![\\w])(${names.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})(?![\\w])`,'gi');

export function itemWikiUrl(page:string):string{return 'https://oldschool.runescape.wiki/w/'+encodeURIComponent(page.replaceAll(' ','_'));}
export function itemText(text:string):string{
  let cursor=0,html='';pattern.lastIndex=0;
  for(const match of text.matchAll(pattern)){
    const index=match.index!,ref=aliases[match[0].toLowerCase()],entry=ref.itemId===null?undefined:entries[ref.itemId];
    const icon=entry?`<span class="item-icon" aria-hidden="true" style="--item-col:${entry.frame%atlas.columns};--item-row:${Math.floor(entry.frame/atlas.columns)};--item-cols:${atlas.columns};--item-rows:${atlas.rows}"></span>`:'';
    const hint=entry?`Open ${ref.page} on the Wiki. Icon: ${entry.name}.`:`Open ${ref.page} on the Wiki.`;
    html+=esc(text.slice(cursor,index))+`<a class="item-link" href="${esc(itemWikiUrl(ref.page))}" target="_blank" rel="noopener noreferrer" title="${esc(hint)}">${icon}<span>${esc(match[0])}</span></a>`;
    cursor=index+match[0].length;
  }
  return html+esc(text.slice(cursor));
}

export function hasItemIcon(text:string):boolean{
  pattern.lastIndex=0;
  return [...text.matchAll(pattern)].some(match=>aliases[match[0].toLowerCase()].itemId!==null);
}
