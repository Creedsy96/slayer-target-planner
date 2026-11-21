import type {Profile} from '../domain/types';

/** Extensions are assignment purchases, shared by every variant and master. */
export function setTaskExtension(p:Profile,assignmentId:string,enabled:boolean):void{
  (p.extensions??={})[assignmentId]=enabled;
  for(const [key,method]of Object.entries(p.methods))if(key===assignmentId||key.startsWith(assignmentId+'::'))method.extended=enabled;
}
