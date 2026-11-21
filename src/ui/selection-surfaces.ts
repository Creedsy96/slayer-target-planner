// Expand existing selection controls without nesting buttons or changing table
// semantics. Native buttons remain the keyboard/accessibility action owners.
const actions='button[data-master],button[data-tutorial-master],button[data-gear-pick],button[data-guide-location],button[data-use-style],button[data-gear-info],button[data-setup-step]';
const boxes='tr,.guide-location,.guide-slot,.guide-gear-set.owned,.setup-progress li';
const interactive='button,a,input,select,textarea,label,summary,details,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="checkbox"],[role="combobox"],[role="option"],[data-no-surface-select]';

export function surfaceAction(box:HTMLElement):HTMLButtonElement|undefined{
 const buttons=box.querySelectorAll<HTMLButtonElement>(actions);
 if(buttons.length!==1||buttons[0].disabled||buttons[0].matches(':disabled')||buttons[0].getAttribute('aria-disabled')==='true')return;
 return buttons[0];
}

export function enhanceSelectionSurfaces(root:ParentNode):void{
 root.querySelectorAll<HTMLElement>(boxes).forEach(box=>{
  const action=surfaceAction(box);
  box.classList.toggle('selection-surface',!!action);
  box.classList.toggle('selection-current',!!action&&action.getAttribute('aria-pressed')==='true');
 });
}

export function activateSelectionSurface(event:MouseEvent):boolean{
 if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return false;
 const target=event.target instanceof Element?event.target:null,box=target?.closest<HTMLElement>('.selection-surface');
 if(!target||!box)return false;
 const control=target.closest(interactive);
 if(control&&box.contains(control)||document.getSelection()?.isCollapsed===false)return false;
 // Revalidate: workers can replace controls, or a second choice can appear.
 const action=surfaceAction(box);if(!action)return false;
 action.focus({preventScroll:true});action.click();return true;
}

export function installSelectionSurfaces():void{
 document.addEventListener('click',activateSelectionSurface);
}
