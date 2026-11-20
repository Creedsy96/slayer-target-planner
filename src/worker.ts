import {calculateGuideCombat} from './combat/guide';
import type {GuideState} from './guide/types';
import type {CombatResult,EquipmentSlot} from './combat/types';
import {compareOwnedSlot} from './combat/comparisons';
import {preparePriorityCombat,prioritisedMasters} from './combat/priority';
import {catalogue,evaluate,optimise,simulate,searchHunt,prepareRows} from './core';
import type {Profile} from './domain/types';
self.onmessage=(event:MessageEvent)=>{
  const {id,kind,profile,masterId,blocks,guide,guideFirst,combat,slot}=event.data as {id:number;kind:string;profile:Profile;masterId?:string;blocks?:string[];guide?:GuideState;guideFirst?:boolean;combat?:CombatResult;slot?:EquipmentSlot};
  try{
    if(kind==='gear-detail'){
      self.postMessage({id,kind,result:compareOwnedSlot(profile,guide!,combat!,slot!)});
    }else if(kind==='gear'){
      const result=calculateGuideCombat(profile,guide!, (done,current)=>self.postMessage({id,kind:'progress',done,total:5,current}));
      self.postMessage({id,kind:'gear',result});
    }else if(kind==='plans'){
      const offset=preparePriorityCombat(catalogue,profile,guide,guideFirst===true,(done,total,current)=>self.postMessage({id,kind:'progress',done,total,current}),result=>self.postMessage({id,kind:'priority-gear',result}));
      const plans=[],total=offset+catalogue.masters.length;
      for(const [index,master]of prioritisedMasters(catalogue,profile).entries()){
        self.postMessage({id,kind:'progress',done:offset+index,total,current:master.name+' / preparing methods'});
        plans.push(optimise(catalogue,master,profile,master.id==='mortimer'?60:250,(fraction,current)=>self.postMessage({id,kind:'progress',done:offset+index+fraction,total,current:master.name+' / '+current})));
        self.postMessage({id,kind:'plan-ready',plan:plans[plans.length-1]});
        self.postMessage({id,kind:'progress',done:offset+plans.length,total,current:master.name+' / finished'});
      }
      self.postMessage({id,kind:'plans',plans});
    }else if(kind==='hunt'){const master=catalogue.masters.find(m=>m.id===masterId)!;self.postMessage({id,kind:'progress',done:0,total:1,current:'Preparing full-hunt search / '+master.name});const found=searchHunt(catalogue,master,profile,(done,total)=>self.postMessage({id,kind:'progress',done,total,current:'Searching full-hunt block candidates'}));self.postMessage({id,kind:'hunt',...found,masterId});
    }else if(kind==='strategies'){
      const master=catalogue.masters.find(m=>m.id===masterId)!;
      const strategies=['none','sustainable','funded','boost-turael','boost-mazchna','reset-turael'] as const,results=[];
      for(const strategy of strategies){
        try{const scenario={...profile,strategy};const index=results.length;self.postMessage({id,kind:'progress',done:index,total:strategies.length,current:'Preparing strategy / '+strategy});const plan=optimise(catalogue,master,scenario,50,(fraction,current)=>self.postMessage({id,kind:'progress',done:index+.25*fraction,total:strategies.length,current:strategy+' / '+current}));results.push({strategy,result:simulate(catalogue,plan,scenario,done=>self.postMessage({id,kind:'progress',done:index+.25+.75*done/scenario.simulation.trials,total:strategies.length,current:'Simulating / '+strategy}))});}
        catch(error){results.push({strategy,error:error instanceof Error?error.message:String(error)});}
        self.postMessage({id,kind:'progress',done:results.length,total:strategies.length,current:'Strategy / '+strategy});
      }
      self.postMessage({id,kind:'strategies',results});
    }else{
      const master=catalogue.masters.find(m=>m.id===masterId)!;
      const preparing=(fraction:number,current:string)=>self.postMessage({id,kind:'progress',done:.2*fraction*profile.simulation.trials,total:profile.simulation.trials,current:master.name+' / '+current});
      const plan=blocks?evaluate(catalogue,master,profile,blocks,'Evaluated configuration',false,prepareRows(catalogue,master,profile,(done,total,current)=>preparing(done/Math.max(1,total),'Gear / '+current))):optimise(catalogue,master,profile,master.id==='mortimer'?60:250,preparing);
      const result=simulate(catalogue,plan,profile,done=>self.postMessage({id,kind:'progress',done:.2*profile.simulation.trials+.8*done,total:profile.simulation.trials,current:'Simulating hunt trials'}));
      self.postMessage({id,kind:'simulation',result,masterId});
    }
  }catch(error){self.postMessage({id,kind:'error',message:error instanceof Error?error.message:String(error)});}
};
