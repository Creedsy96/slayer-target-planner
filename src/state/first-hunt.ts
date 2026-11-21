import type {Catalogue,Profile,Plan} from '../domain/types';
import {maxedProfile} from './maxed-profile';
import {evaluate} from '../analysis/planner';
export const HUNT_LESSONS=['Your first hunt','Choose your target','Read the results','Choose a strategy','Roll: Waterfiends','Skip and roll again','Roll: Basilisks','Prepare for the Knights'] as const;
export function practiceCharacter(data:Catalogue):Profile{
 const p=maxedProfile(data);p.id='tutorial-practice';p.name='Practice character';p.points=500;p.reserve=50;p.blockLimit=0;p.strategy='funded';p.combat=undefined;
 for(const [key,label]of Object.entries(data.unlocks))if(label.toLowerCase()==='basilocked')p.unlocks[key]=1;
 p.goal.targets=[{assignmentId:'basilisks',variantId:'basilisk-knight',priority:1}];p.goal.kind='offer';p.preferences.waterfiends='skip';return p;
}
export function practicePlans(data:Catalogue,p:Profile):Plan[]{return ['nieve','duradel','konar'].map(id=>evaluate(data,data.masters.find(m=>m.id===id)!,p,[]));}
export function practicePoints(step:number):number{return step>=6?470:500;}
export function applyPracticeHunt(p:Profile):void{
 p.goal={...p.goal,kind:'offer',targets:[{assignmentId:'basilisks',variantId:'basilisk-knight',priority:1}]};p.strategy='funded';
}
