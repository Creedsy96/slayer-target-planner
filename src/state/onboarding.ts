import type {Catalogue,Profile} from '../domain/types';
import {newProfile} from './profiles';
import {defaultCombat} from './bank';
import {knownAccessKeys,resolveAccess,relevantQuests} from '../rules/access';
export const SETUP_STEPS=['Install & export','Import files','Combat & points','Slayer rewards','Access & quests','Ready to hunt'] as const;
export interface CharacterSetup {version:1;step:number;complete:boolean;imports:string[];tutorial:'pending'|'skipped'|'complete'}
export function newCharacter(data:Catalogue,name:string,wizard=true):Profile{
 const p=newProfile(data,name);p.levels={slayer:null,combat:null};p.questPoints=null;p.points=null;p.streaks={normal:0,wilderness:0,mortimer:0};p.mortimerTasks=0;p.diaries={lumbridge:null,kourend:null,western:null};p.assumeUnknown=false;p.strategy='none';
 p.unlocks=Object.fromEntries(Object.keys(data.unlocks).map(key=>[key,0]));p.combat=defaultCombat();
 p.notes=['New character: optional purchased rewards default off. Enter/import account facts; incomplete facts stay unknown.'];
 if(wizard)p.setup={version:1,step:0,complete:false,imports:[],tutorial:'pending'};
 return p;
}
export function setupUnanswered(data:Catalogue,p:Profile):{skills:string[];quests:string[];areas:string[];points:boolean}{
 return {skills:['attack','strength','defence','hitpoints','ranged','magic','prayer','slayer'].filter(key=>p.levels[key]==null),quests:relevantQuests(data).filter(key=>p.quests[key]==null&&p.questImport?.states[key]==null),areas:knownAccessKeys(data).filter(key=>key.startsWith('location:')&&resolveAccess(key,p).value!==1),points:p.questPoints===null||p.points===null};
}
export function acceptSetupDefaults(data:Catalogue,p:Profile,section:'combat'|'rewards'):void{
 if(section==='combat')for(const key of ['lumbridge','kourend','western'] as const)if(p.diaries[key]==null)p.diaries[key]=0;
 if(section==='rewards')for(const key of Object.keys(data.unlocks))if(p.unlocks[key]==null)p.unlocks[key]=0;
}
