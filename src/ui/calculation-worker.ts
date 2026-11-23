import {calculationCache,type CalculationCache,type CalculationMessage,type CalculationRequest} from '../state/calculation-cache';
/** Check durable results before starting a CPU worker; cancellation also covers storage reads. */
export class CalculationWorker {
 onmessage:((event:{data:CalculationMessage})=>void)|null=null;
 onerror:((event?:unknown)=>void)|null=null;
 private worker?:Worker;private stopped=false;
 constructor(private source:string,private cache:CalculationCache=calculationCache,private restoreTimeout=1500){}
 postMessage(request:CalculationRequest):void{
  if(!this.cache.available){this.start(request);return;}
  void this.restore(structuredClone(request)).catch(error=>{if(!this.stopped)this.onerror?.(error);});
 }
 terminate():void{this.stopped=true;this.worker?.terminate();this.worker=undefined;}
 private async restore(request:CalculationRequest):Promise<void>{
  let pending=true;
  const timer=setTimeout(()=>{
   if(!pending||this.stopped)return;pending=false;
   this.onmessage?.({data:{id:request.id,kind:'progress',done:0,total:1,current:'Saved calculation lookup timed out; calculating now'}});
   this.start(request);
  },this.restoreTimeout);
  try{
  const messages=request.provisionalCombat?undefined:await this.cache.load(request);if(!pending||this.stopped)return;
  if(messages){for(const message of messages){if(this.stopped)break;this.onmessage?.({data:message});}return;}
  const saved=await this.cache.combat(request.profile);if(!pending||this.stopped)return;
  if(saved){
   const live=request.combatCache?.identity===saved.identity?request.combatCache.entries:[];
   request.combatCache={identity:saved.identity,entries:[...new Map([...saved.entries,...live]).entries()]};
  }
  this.start(request);
  }catch{if(pending&&!this.stopped)this.start(request);}
  finally{pending=false;clearTimeout(timer);}
 }
 private start(request:CalculationRequest):void{
  if(this.stopped)return;const url=URL.createObjectURL(new Blob([this.source],{type:'text/javascript'}));
  let worker:Worker;try{worker=new Worker(url);}finally{URL.revokeObjectURL(url);}this.worker=worker;
  const retained:CalculationMessage[]=[];
  worker.onmessage=async event=>{
   if(this.stopped||this.worker!==worker)return;const message=event.data as CalculationMessage;
   if(message.kind==='combat-cache')void this.cache.saveCombat(request.profile,message.key,message.result);
   if(message.kind==='priority-gear')retained.push(message);
   if(message.kind===request.kind){
    // Keep a priority guide only with the exact guide that produced it.
    const saving=this.cache.available&&!request.provisionalCombat?this.cache.save(request,[...retained,message]):undefined;
    this.onmessage?.({data:message});
    // Display a completed result before waiting for storage. A locked/full
    // database must not keep an otherwise finished hunt at 99% indefinitely.
    await saving;return;
   }
   this.onmessage?.({data:message});
  };
  worker.onerror=event=>{if(!this.stopped)this.onerror?.(event);};worker.postMessage(request);
 }
}
