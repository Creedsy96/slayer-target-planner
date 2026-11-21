import type {Catalogue,Plan,Profile} from '../domain/types';
import {explainPlanIssues} from '../analysis/plan-issues';

export interface FeedbackFix {label:string;route:string;setting?:string;selector?:string;index?:number;assignmentId?:string;variantId?:string;field?:string;filter?:string;masterId?:string}
export interface ActionOrigin {route:string;characterId:string;selector?:string;index:number;rect:{left:number;top:number;bottom:number};setting?:string;action?:string}
export function captureAction(element:HTMLElement,route:string,characterId:string):ActionOrigin{
 const keys=['data-action','data-bank-action','data-bank-quantity','data-qol','data-setting','data-method','data-method-field','data-target','data-target-field','data-block','data-master-id','data-assignment','data-preference'];
 const selector=element.id?'#'+CSS.escape(element.id):keys.filter(k=>element.hasAttribute(k)).map(k=>'['+k+'="'+CSS.escape(element.getAttribute(k)!)+'"]') .join('');
 const rect=element.getBoundingClientRect();
 return {route,characterId,selector:selector||undefined,index:selector?[...document.querySelectorAll(selector)].indexOf(element):0,rect:{left:rect.left,top:rect.top,bottom:rect.bottom},setting:element.dataset.setting,action:element.dataset.action||element.dataset.bankAction||element.dataset.qol};
}
/** Resolve known validation failures to actual controls, reusing the planner's
 * requirement explanations for quest, reward, location and method failures. */
export function feedbackFix(data:Catalogue,p:Profile,message:string,origin?:ActionOrigin,plan?:Plan):FeedbackFix{
 const setting=(path:string,label:string,route='plan'):FeedbackFix=>({route,setting:path,label});
 if(/current points|current balance|sufficient.*points|starting points/i.test(message))return setting('points','Enter current points');
 if(/reserve/i.test(message))return setting('reserve','Review point reserve');
 if(/drop probability|drop rate/i.test(message))return setting('goal.customDropRate','Review target drop rate');
 const streak=message.match(/current (normal|wilderness|mortimer) streak/i)?.[1];
 if(streak)return setting('streaks.'+streak,'Enter '+streak+' streak');
 if(/streak.*current.task|current.task.*streak/i.test(message))return setting('streaks.'+(data.masters.find(m=>m.id===p.current.masterId)?.streakGroup||'normal'),'Enter current-task streak');
 if(/completed Mortimer tasks|completed Mortimer|Mortimer tasks before/i.test(message))return setting('mortimerTasks','Enter completed Mortimer tasks','account');
 if(/remaining task count/i.test(message))return setting('current.remaining','Enter remaining task count');
 if(/previous.*location|previous.*supports.*variant/i.test(message))return setting('previousTargetCompatible','Confirm previous task location');
 if(/current.*location.*supports|current task location/i.test(message))return setting('current.targetCompatible','Confirm current task location');
 if(/previous.*master|previous master/i.test(message))return setting('previousMasterId','Review previous task master');
 if(/previous.*task/i.test(message))return setting('previousTask','Review previous assignment');
 if(/pending.*master/i.test(message))return setting('current.masterId','Choose pending-offer master');
 if(/pending offer options/i.test(message))return {route:'plan',selector:'[data-action="add-offer"]',label:'Enter pending offer options'};
 if(/current.task modifier|actual Mortimer modifier|Mortimer offer.*modifier/i.test(message))return p.current.kind==='offer'?{route:'plan',selector:'[data-offer-field="modifier"]',label:'Review pending offer modifiers'}:setting('current.modifier','Review actual task modifiers');
 if(/cape.*disable|disable.*cape/i.test(message))return setting('cape','Review cape repeats');
 if(/boost.*normal streak|whole-number normal streak/i.test(message))return setting('strategy','Review boosting strategy');
 if(message==='Select a master first.')return {route:'plan',selector:'#hunt-master',label:'Choose a master'};
 if(message==='Enter a preset name.')return {route:'methods',selector:'#preset-name',label:'Enter preset name'};
 if(/target cannot be blocked|target.*is blocked/i.test(message))return {route:'plan',selector:'[data-target-field="assignmentId"]',label:'Review hunt targets'};
 if(plan&&message===plan.reason){
  const issue=explainPlanIssues(data,plan,p)[0];
  if(issue){
   const unlock=Object.entries(data.unlocks).find(([,label])=>label===issue.filter)?.[0];
   const skill=Object.keys(p.levels).find(key=>key===issue.title.toLowerCase());
   const quest=data.quests.includes(issue.filter||'')?issue.filter:undefined;
   return {label:issue.action,route:issue.route,assignmentId:issue.assignmentId,variantId:issue.variantId,field:issue.field,filter:issue.filter,masterId:plan.master.id,
    setting:skill?'levels.'+skill:quest?'quests.'+quest:undefined,selector:unlock?'[data-fact-toggle="unlocks"][data-key="'+unlock+'"]':undefined};
  }
 }
 if(origin?.setting)return setting(origin.setting,'Review this value',origin.route);
 if(origin?.selector?.includes('data-method-field'))return {route:origin.route,selector:origin.selector,label:'Review this value'};
 if(origin?.action?.includes('quest'))return {route:'account',selector:origin.action==='preview-quests'?'#quest-json':'[data-action="choose-quests"]',label:'Review quest import'};
 if(origin?.route==='bank')return {route:'bank',selector:origin.selector,label:'Review gear import or item'};
 if(/export|storage|saved character/i.test(message))return {route:origin?.route||'plan',selector:'[data-action="export-profile"]',label:'Export a character backup'};
 return {route:origin?.route||'plan',selector:origin?.selector,index:origin?.index,label:'Return to this action'};
}
