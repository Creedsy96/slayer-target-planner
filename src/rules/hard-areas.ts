import type {Profile,Source} from '../domain/types';
export const HARD_AREAS=[
 {key:'location:Troll Stronghold (location)',name:'Troll Stronghold',skills:{agility:15},quest:'Troll Stronghold',confirmation:'Partial Troll Stronghold (defeat Dad); completion proves this quest stage',proof:[],source:{title:'Troll Stronghold',url:'https://oldschool.runescape.wiki/w/Troll_Stronghold',revision:null}},
 {key:'location:Ancient Cavern',name:'Ancient Cavern',skills:{firemaking:35},confirmation:'Barbarian Training: learned pyre-ship burning from Otto',proof:['Barbarian Training','Dragon Slayer II'],source:{title:'Ancient Cavern',url:'https://oldschool.runescape.wiki/w/Ancient_Cavern',revision:15358063}},
 {key:'location:Charred Dungeon',name:'Charred Dungeon',skills:{sailing:60},confirmation:'',proof:[],source:{title:'Charred Dungeon',url:'https://oldschool.runescape.wiki/w/Charred_Dungeon',revision:null}},
 {key:'location:God Wars Dungeon',name:'God Wars Dungeon',skills:{},anySkills:{strength:60,agility:60},quest:'Troll Stronghold',confirmation:'Partial Troll Stronghold (defeat Dad), or the Easy Combat Achievements teleport; confirm the alternate route manually',proof:[],source:{title:'God Wars Dungeon',url:'https://oldschool.runescape.wiki/w/God_Wars_Dungeon',revision:null}},
] as {key:string;name:string;skills:Record<string,number>;anySkills?:Record<string,number>;quest?:string;confirmation:string;proof:string[];source:Source}[];
export function hardAreaState(key:string,p:Profile,state:(quest:string)=>number|null):{value:number|null;reason:string;source:Source}|undefined{
 const rule=HARD_AREAS.find(r=>r.key.toLowerCase()===key.toLowerCase());if(!rule)return;
 if(rule.proof.some(q=>state(q)===2))return {value:1,reason:'Completed quest/miniquest proves '+rule.name+' access.',source:rule.source};
 const missing=Object.entries(rule.skills).filter(([skill,n])=>(p.levels[skill]??-1)<n);
 if(missing.length)return {value:missing.some(([skill])=>p.levels[skill]!=null)?0:null,reason:missing.map(([skill,n])=>'Requires '+n+' '+skill).join('; '),source:rule.source};
 if(rule.anySkills&&!Object.entries(rule.anySkills).some(([skill,n])=>(p.levels[skill]??-1)>=n))return {value:Object.keys(rule.anySkills).some(skill=>p.levels[skill]==null)?null:0,reason:'Requires '+Object.entries(rule.anySkills).map(([skill,n])=>n+' '+skill).join(' or '),source:rule.source};
 if(rule.quest&&state(rule.quest)!==2)return {value:rule.key==='location:God Wars Dungeon'?null:state(rule.quest)===0?0:null,reason:rule.confirmation,source:rule.source};
 if(rule.confirmation&&!rule.quest)return {value:rule.proof.every(q=>state(q)===0)?0:null,reason:rule.confirmation+'. Confirm this one-time step manually if the miniquest is incomplete.',source:rule.source};
 return {value:1,reason:'Recorded base skills and quest stage meet the entrance requirements. Tools and individual encounter requirements remain separate.',source:rule.source};
}
