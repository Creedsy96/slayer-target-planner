import {CalculationWorker} from './calculation-worker';
import type {Profile,Method,Variant} from '../domain/types';
import {combatIdentity,CombatCacheStore} from '../combat/cache';
import {methodPreviewKey} from '../combat/method-preview';
import {configuredTimingReason} from '../combat/timing';

export interface MethodPreviewState {pending:boolean;percent:number;current:string;resolved?:Method;error?:string}
/** One cancellable editor request, independent of hunt and guide selections. */
export class MethodPreview {
 private worker?:CalculationWorker;private key='';private sequence=0;
 private cache=new Map<string,Method>();
 private view:MethodPreviewState={pending:false,percent:0,current:''};
 constructor(private source:string,private changed:()=>void,private combatCache:CombatCacheStore){}
 get(p:Profile,assignment:string,v:Variant,method:Method):MethodPreviewState{
  const key=methodPreviewKey(p,assignment,method);if(key===this.key)return this.view;
  this.deactivate();this.key=key;
  const retained=configuredTimingReason(p,method),saved=this.cache.get(key);
  if(retained){const {calculated,combatNote,...base}=method;return this.view={pending:false,percent:100,current:v.name,resolved:{...base,combatNote:retained}};}
  if(saved)return this.view={pending:false,percent:100,current:v.name,resolved:structuredClone(saved)};
  this.view={pending:true,percent:0,current:v.name};
  try{this.start(p,assignment,v.id);}catch(error){this.deactivate();this.key=key;this.view={pending:false,percent:0,current:v.name,error:error instanceof Error?error.message:'Could not start the method calculation.'};}
  return this.view;
 }
 deactivate():void{if(this.worker){this.worker.terminate();this.worker=undefined;this.key='';}}
 retry():void{this.cache.delete(this.key);this.deactivate();this.key='';}
 cancel():void{if(!this.worker)return;const key=this.key;this.deactivate();this.key=key;this.view={...this.view,pending:false,error:'Calculation cancelled. Retry when ready.'};}
 private start(p:Profile,assignmentId:string,variantId:string):void{
  const identity=combatIdentity(p),key=this.key,id=++this.sequence;
  const worker=new CalculationWorker(this.source);
  this.worker=worker;
  worker.onmessage=event=>{
   if(this.worker!==worker||event.data.id!==id||this.key!==key)return;
   const message=event.data;
   if(message.kind==='combat-cache'){this.combatCache.put(identity,message.key,message.result);return;}
   if(message.kind==='progress'){this.view={...this.view,percent:Math.min(100,Math.floor(message.done/Math.max(1,message.total)*100)),current:message.current||this.view.current};this.changed();return;}
   worker.terminate();this.worker=undefined;
   if(message.kind==='method-timing'){
    this.cache.set(key,structuredClone(message.result));while(this.cache.size>32)this.cache.delete(this.cache.keys().next().value!);
    this.view={pending:false,percent:100,current:this.view.current,resolved:message.result};
   }else this.view={...this.view,pending:false,error:message.message||'The method calculation did not return a result.'};
   this.changed();
  };
  worker.onerror=()=>{if(this.worker!==worker)return;worker.terminate();this.worker=undefined;this.view={...this.view,pending:false,error:'The method calculation failed. Retry the calculation.'};this.changed();};
  worker.postMessage({id,kind:'method-timing',profile:structuredClone(p),assignmentId,variantId,combatCache:this.combatCache.snapshot(identity)});
 }
}
