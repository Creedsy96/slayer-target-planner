import type {Profile} from '../domain/types';
import {escapeHtml as esc} from './html';

export function deleteCharacterContent(character:Pick<Profile,'name'>):string{
 return `<form method="dialog"><h2 id="delete-character-title">Delete character?</h2><p>Delete <strong>${esc(character.name)}</strong> from this app on this device?</p><p>Its saved account facts, bank/gear information and hunt settings will be removed. Other characters and RuneLite export files are kept.</p><p class="notice small">You can use Undo to restore it during this session. After reloading or closing the app, recovery requires a previously exported backup.</p><div class="tools"><button value="cancel" autofocus>Cancel</button><button class="character-delete" value="delete">Delete character</button></div></form>`;
}

export function requestCharacterDeletion(character:Pick<Profile,'name'>):Promise<boolean>{
 const dialog=document.createElement('dialog');dialog.className='character-delete-dialog';dialog.setAttribute('aria-labelledby','delete-character-title');dialog.innerHTML=deleteCharacterContent(character);
 document.body.append(dialog);dialog.showModal();dialog.querySelector<HTMLButtonElement>('[value="cancel"]')!.focus();
 return new Promise(resolve=>dialog.addEventListener('close',()=>{const confirmed=dialog.returnValue==='delete';dialog.remove();resolve(confirmed);},{once:true}));
}
