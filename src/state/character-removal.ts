import type {Profile} from '../domain/types';
import {MAXED_PROFILE_ID,STORAGE,exportProfiles} from './profiles';

export interface CharacterRegistry {profiles:Profile[];activeId:string}
/** Identity, not display name, owns deletion. Existing character objects stay intact. */
export function removeCharacter(registry:CharacterRegistry,id:string):CharacterRegistry{
 if(id===MAXED_PROFILE_ID)throw Error('The built-in Maxed character is always available and cannot be deleted.');
 const index=registry.profiles.findIndex(p=>p.id===id);
 if(index<0)throw Error('This character no longer exists.');
 if(registry.profiles.length<2)throw Error('Keep at least one character before deleting this one.');
 const profiles=registry.profiles.filter(p=>p.id!==id);
 const activeId=profiles.some(p=>p.id===registry.activeId)?registry.activeId:profiles[Math.min(index,profiles.length-1)].id;
 return {profiles,activeId};
}

/** Save before returning a transition that the UI can apply. */
export function persistCharacterRemoval(registry:CharacterRegistry,id:string,storage:Pick<Storage,'setItem'>):CharacterRegistry{
 const next=removeCharacter(registry,id);
 try{storage.setItem(STORAGE,exportProfiles(next.profiles,next.activeId));}
 catch{throw Error('Could not save the deletion. The character was kept; export a backup and check local storage.');}
 return next;
}
