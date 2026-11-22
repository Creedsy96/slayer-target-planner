interface Message {kind:string;done?:number;total?:number;[key:string]:unknown}
/** Bound renderer work while retaining the newest progress and final completion. */
export function workerPublisher(send:(message:any)=>void,now=()=>Date.now(),interval=50):(message:any)=>void{
 let last=-Infinity,pending:Message|undefined;
 return (message:Message)=>{
  if(message.kind==='progress'){
   const time=now();
   if(time-last<interval&&message.done!==message.total){pending=message;return;}
   last=time;pending=undefined;send(message);return;
  }
  if(pending&&message.kind!=='combat-cache'){send(pending);pending=undefined;last=now();}
  send(message);
 };
}
