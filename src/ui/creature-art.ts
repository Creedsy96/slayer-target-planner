import atlas from './creature-art.json';

const entries:Record<string,{frame:number;name:string}>=atlas.entries;
const aliases:Record<string,string>=atlas.aliases;
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const names=Object.keys(aliases).sort((a,b)=>b.length-a.length);
const pattern=new RegExp(`(?<![\\w])(${names.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})(?![\\w])`,'gi');

export function creatureId(name:string):string|undefined{return aliases[name.trim().toLowerCase()];}
export function creatureIcon(id:string,large=false):string{
  const entry=entries[id];if(!entry)return '';
  return `<span class="creature-icon${large?' creature-icon--large':''}" aria-hidden="true" style="--sprite-col:${entry.frame%atlas.columns};--sprite-row:${Math.floor(entry.frame/atlas.columns)};--sprite-cols:${atlas.columns};--sprite-rows:${atlas.rows}"></span>`;
}
export function creatureName(name:string):string{
  const id=creatureId(name);return id?`<span class="creature-name">${creatureIcon(id)}<span>${escape(name)}</span></span>`:escape(name);
}
/** Match complete creature names; never decorate fragments inside other words. */
export function creatureText(text:string):string{
  let cursor=0,html='';pattern.lastIndex=0;
  for(const match of text.matchAll(pattern)){
    const index=match.index!;html+=escape(text.slice(cursor,index))+creatureName(match[0]);cursor=index+match[0].length;
  }
  return html+escape(text.slice(cursor));
}

export function decorateCreatureText(root:ParentNode):void{
  const walker=document.createTreeWalker(root as Node,NodeFilter.SHOW_TEXT);
  const nodes:Text[]=[];let node:Node|null;
  while((node=walker.nextNode())){
    const text=node as Text,parent=text.parentElement;
    if(!parent||parent.closest('select,option,textarea,input,script,style,svg,code,.creature-name,.creature-icon,.item-link,[contenteditable]'))continue;
    pattern.lastIndex=0;if(pattern.test(text.data))nodes.push(text);
  }
  for(const text of nodes){const span=document.createElement('span');span.innerHTML=creatureText(text.data);text.replaceWith(...Array.from(span.childNodes));}
}
