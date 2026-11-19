import {creatureId,creatureName} from './creature-art';

let sequence=0;
/** Enhance only creature selectors. The native control remains the form/state
 * owner; choosing a result dispatches its existing change event. */
export function enhanceCreaturePickers(root:ParentNode):void{
  root.querySelectorAll<HTMLSelectElement>('select:not([data-creature-enhanced])').forEach(select=>{
    const choices=Array.from(select.options);
    if(!choices.length||choices.filter(o=>creatureId(o.text)).length<choices.length/2)return;
    select.dataset.creatureEnhanced='true';
    const label=select.getAttribute('aria-label')||select.labels?.[0]?.childNodes[0]?.textContent?.trim()||'Creature';
    const key=select.id||select.dataset.setting||[select.dataset.target,select.dataset.targetField,select.dataset.offer,select.dataset.offerField,select.name].join(':');
    const trigger=document.createElement('button');trigger.type='button';trigger.className='creature-trigger';trigger.dataset.pickerFor=key;
    trigger.setAttribute('aria-label',label+': '+(select.selectedOptions[0]?.text||'Choose creature'));
    trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.disabled=select.disabled;
    trigger.innerHTML=creatureName(select.selectedOptions[0]?.text||'Choose creature')+'<span class="picker-chevron" aria-hidden="true"></span>';
    select.after(trigger);select.hidden=true;
    trigger.addEventListener('click',()=>openPicker(select,trigger,label,key));
    trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();openPicker(select,trigger,label,key);}});
    // A label click should reach the visible control rather than its hidden select.
    select.labels?.forEach(label=>label.addEventListener('click',event=>{if(event.target===label){event.preventDefault();trigger.focus();}}));
  });
}

function openPicker(select:HTMLSelectElement,trigger:HTMLButtonElement,label:string,key:string):void{
  const dialog=document.createElement('dialog');dialog.className='creature-dialog';
  const id='creature-options-'+(++sequence);dialog.setAttribute('aria-label','Choose '+label.toLowerCase());
  const heading=document.createElement('h2');heading.textContent='Choose '+label.toLowerCase();
  const intro=document.createElement('p');intro.className='small muted';intro.textContent='Search by name, or use the arrow keys to browse.';
  const search=document.createElement('input');search.type='search';search.placeholder='Search creatures…';search.setAttribute('aria-label','Search '+label.toLowerCase());
  search.setAttribute('role','combobox');search.setAttribute('aria-controls',id);search.setAttribute('aria-expanded','true');search.setAttribute('aria-autocomplete','list');
  const list=document.createElement('div');list.id=id;list.className='creature-options';list.setAttribute('role','listbox');list.setAttribute('aria-label',label);
  const count=document.createElement('p');count.className='picker-count small muted';count.setAttribute('role','status');
  const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();
  dialog.append(heading,intro,search,count,list,cancel);document.body.append(dialog);
  const all=Array.from(select.options).map(o=>({value:o.value,name:o.text,disabled:o.disabled}));
  let matches=all,active=Math.max(0,all.findIndex(o=>o.value===select.value));
  const setActive=(index:number,scroll=false)=>{
    active=Math.max(0,Math.min(index,matches.length-1));
    list.querySelectorAll<HTMLElement>('[role=option]').forEach((item,i)=>{item.classList.toggle('active',i===active);item.setAttribute('aria-selected',String(i===active));if(i===active&&scroll)item.scrollIntoView({block:'nearest'});});
    if(matches.length)search.setAttribute('aria-activedescendant',id+'-'+active);else search.removeAttribute('aria-activedescendant');
  };
  const choose=(index:number)=>{
    if(!matches[index]||matches[index].disabled)return;
    select.value=matches[index].value;dialog.close();select.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector<HTMLButtonElement>(`button[data-picker-for="${CSS.escape(key)}"]`)?.focus({preventScroll:true});
  };
  const render=()=>{
    list.replaceChildren();count.textContent=matches.length?`${matches.length} ${matches.length===1?'creature':'creatures'}`:'No matching creatures. Try another name.';
    matches.forEach((option,index)=>{const button=document.createElement('button');button.type='button';button.id=id+'-'+index;button.tabIndex=-1;button.setAttribute('role','option');button.disabled=option.disabled;button.innerHTML=creatureName(option.name);button.onclick=()=>choose(index);list.append(button);});setActive(active);
  };
  search.oninput=()=>{matches=all.filter(o=>o.name.toLowerCase().includes(search.value.trim().toLowerCase()));active=0;render();};
  search.onkeydown=event=>{
    // Search inputs consume Escape to clear their text in some Chromium builds.
    // Close explicitly so cancelling is consistent with the picker guidance.
    if(event.key==='Escape'){event.preventDefault();dialog.close();return;}
    if(['ArrowDown','ArrowUp','Home','End','Enter'].includes(event.key)){
      if((event.key==='Home'||event.key==='End')&&search.value)return;
      event.preventDefault();
      if(event.key==='Enter')choose(active);else setActive(event.key==='Home'?0:event.key==='End'?matches.length-1:active+(event.key==='ArrowDown'?1:-1),true);
    }
  };
  dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');dialog.remove();if(trigger.isConnected)trigger.focus({preventScroll:true});},{once:true});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  trigger.setAttribute('aria-expanded','true');render();dialog.showModal();search.focus();setActive(active,true);
}
