import {catalogue,optimise,simulate,searchHunt} from './core';
import type {Profile} from './domain/types';
self.onmessage=(event:MessageEvent)=>{
  const {id,kind,profile,masterId}=event.data as {id:number;kind:string;profile:Profile;masterId?:string};
  try{
    if(kind==='plans'){
      const plans=[];
      for(const master of catalogue.masters){plans.push(optimise(catalogue,master,profile,master.id==='mortimer'?60:250));self.postMessage({id,kind:'progress',done:plans.length,total:catalogue.masters.length});}
      self.postMessage({id,kind:'plans',plans});
    }else if(kind==='hunt'){const master=catalogue.masters.find(m=>m.id===masterId)!;const found=searchHunt(catalogue,master,profile,(done,total)=>self.postMessage({id,kind:'progress',done,total}));self.postMessage({id,kind:'hunt',...found,masterId});
    }else if(kind==='strategies'){
      const master=catalogue.masters.find(m=>m.id===masterId)!;
      const strategies=['none','sustainable','funded','boost-turael','boost-mazchna','reset-turael'] as const,results=[];
      for(const strategy of strategies){
        try{const scenario={...profile,strategy};const plan=optimise(catalogue,master,scenario,50);results.push({strategy,result:simulate(catalogue,plan,scenario)});}
        catch(error){results.push({strategy,error:error instanceof Error?error.message:String(error)});}
        self.postMessage({id,kind:'progress',done:results.length,total:strategies.length});
      }
      self.postMessage({id,kind:'strategies',results});
    }else{
      const master=catalogue.masters.find(m=>m.id===masterId)!;
      const plan=optimise(catalogue,master,profile,master.id==='mortimer'?60:250);
      const result=simulate(catalogue,plan,profile,done=>self.postMessage({id,kind:'progress',done,total:profile.simulation.trials}));
      self.postMessage({id,kind:'simulation',result,masterId});
    }
  }catch(error){self.postMessage({id,kind:'error',message:error instanceof Error?error.message:String(error)});}
};
