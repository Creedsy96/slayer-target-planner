const fieldAttributes=[
  'data-setting','data-target','data-target-field',
  'data-method','data-method-field','data-offer','data-offer-field',
];

function fieldSelector(active:HTMLElement|null):string|null{
  if(!active)return null;
  if(active.id)return '#'+CSS.escape(active.id);
  return fieldAttributes.filter(key=>active.hasAttribute(key))
    .map(key=>'['+key+'="'+CSS.escape(active.getAttribute(key)!)+'"]')
    .join('')||null;
}

export function preserveView():()=>void{
  const opened=Array.from(document.querySelectorAll('details[open]'))
    .map(e=>e.querySelector('summary')?.textContent);
  const active=document.activeElement as HTMLInputElement|null;
  const selector=fieldSelector(active);
  // The same setting can appear in both Quick setup and the main account form.
  const index=selector?Array.from(document.querySelectorAll(selector)).indexOf(active!):-1;
  const y=window.scrollY;
  return ()=>{
    document.querySelectorAll('details').forEach(e=>{
      if(opened.includes(e.querySelector('summary')?.textContent))e.open=true;
    });
    if(selector){
      let next=document.querySelectorAll(selector)[index]as HTMLElement|undefined;
      // Number inputs have no selectionStart API. Keep their native editor,
      // including the caret and unfinished decimal/exponent, across renders.
      if(next&&active?.type==='number'&&next!==active){next.replaceWith(active);next=active;}
      next?.focus({preventScroll:true});
    }
    window.scrollTo({top:y});
  };
}
