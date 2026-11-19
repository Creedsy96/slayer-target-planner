import type {Catalogue,Plan,Profile} from '../domain/types';
import {blockPreview} from '../analysis/hunt-tools';
import {loadHunt,recordTask,saveHunt,timingSuggestion,type TaskInput} from '../state/hunts';
import {clone} from '../state/profiles';
import {prepareRows} from '../analysis/planner';
import {modifierKinds,rangeValues} from '../rules/points';
import {escapeHtml as esc,renderBlockChanges,reviewDialog} from './hunt-tools';

export interface HuntContext {data:Catalogue;profile:()=>Profile;plan:()=>Plan|undefined;commit:(p:Profile)=>void;select:(id:string)=>void}
function guard(ctx:HuntContext,before:string):void{
  if(JSON.stringify(ctx.profile())!==before)throw Error('The profile changed during review. Open the review again.');
}
export async function saveHuntDialog(ctx:HuntContext):Promise<void>{
  const p=ctx.profile(),before=JSON.stringify(p),plan=ctx.plan();if(!plan)throw Error('Select a master first.');
  const fields=await reviewDialog('Save named hunt','<p>Saves targets, strategy, objective, proposed blocks, preferences and combat methods. Account facts, actual blocks, points, current task and logs stay with this profile.</p><label>Hunt name<input name="name" required maxlength="100"></label>','Save hunt');
  if(!fields)return;guard(ctx,before);
  const name=String(fields.get('name'));
  if(p.huntPresets?.some(h=>h.name.toLowerCase()===name.trim().toLowerCase())){
    if(!await reviewDialog('Replace saved hunt',`<p>Replace the saved settings for ${esc(name)}?</p>`,'Replace'))return;
    guard(ctx,before);
  }
  ctx.commit(saveHunt(p,name,plan.master.id,crypto.randomUUID()));
}
export function applyHunt(ctx:HuntContext,id:string):void{
  const loaded=loadHunt(ctx.data,ctx.profile(),id);ctx.select(loaded.masterId);ctx.commit(loaded.profile);
}
export async function deleteHuntDialog(ctx:HuntContext,id:string):Promise<void>{
  const p=ctx.profile(),before=JSON.stringify(p),preset=p.huntPresets?.find(h=>h.id===id);
  if(!preset)throw Error('Choose a saved hunt first.');
  if(!await reviewDialog('Delete saved hunt',`<p>Remove ${esc(preset.name)} from this profile? You can undo this during the session.</p>`,'Delete'))return;
  guard(ctx,before);const q=clone(p);q.huntPresets=q.huntPresets?.filter(h=>h.id!==id);ctx.commit(q);
}
export async function reviewBlocks(ctx:HuntContext):Promise<void>{
  const p=ctx.profile(),before=JSON.stringify(p),plan=ctx.plan();if(!plan)throw Error('Select a master first.');
  const changes=blockPreview(ctx.data,plan,p);
  if(plan.conflicts.length)throw Error(plan.conflicts.join(' '));
  const fields=await reviewDialog('Apply block-list changes',renderBlockChanges(ctx.data,plan,p)+`<label class="check"><input type="checkbox" name="deduct" checked>Deduct ${changes.cost} new-block points from my recorded balance</label><p class="small muted">Uncheck only if your current balance already reflects these purchases. This records changes you make in game; it cannot change your game account.</p>`,'Record actual list');
  if(!fields)return;guard(ctx,before);const q=clone(p);
  if(fields.has('deduct')&&changes.cost){if(q.points===null||q.points-changes.cost<q.reserve)throw Error('Enter sufficient current points to buy these blocks while preserving the reserve.');q.points-=changes.cost;}
  q.blocks[plan.master.group]=[...plan.blocks];q.proposed[plan.master.group]=[...plan.blocks];ctx.commit(q);
}
export async function recordTaskDialog(ctx:HuntContext,assignmentId:string,action:TaskInput['action']):Promise<void>{
  const p=ctx.profile(),before=JSON.stringify(p),plan=ctx.plan();if(!plan)throw Error('Select a master first.');
  const row=prepareRows(ctx.data,plan.master,p).find(r=>r.id===assignmentId);if(!row)throw Error('Task not found.');
  const mortimer=plan.master.id==='mortimer'&&action==='complete';
  const kinds=modifierKinds(p.mortimerTasks??0,row.entry);
  const fields=await reviewDialog(action==='complete'?'Record completed task':'Record paid skip',`<p>${esc(plan.master.name)} · <strong>${esc(row.name)}</strong><br>Completion method: ${esc(row.variant.name)}. Record actions already performed in game.</p>${mortimer?`<label>Actual modifier<select name="modifier">${kinds.map(k=>`<option value="${k}">${k}</option>`).join('')}</select></label><label>Actual point modifier<input name="points" type="number" value="${rangeValues(row.entry.pointsRange)[0]}" step="5" min="0" max="10000"></label><p class="small muted">For points, valid values: ${rangeValues(row.entry.pointsRange).join(', ')}. Other modifiers do not award completion points.</p>`:''}${action==='complete'?'<div class="formgrid"><label>Actual kills (optional)<input name="kills" type="number" min="1" max="10000000" step="1"></label><label>Combat minutes (optional, exclude travel/banking)<input name="minutes" type="number" min="0.01" max="10000000" step="any"></label></div><p class="small muted">Enter real kills, including bracelet effects. Both values are needed for a timing suggestion. Check the configured method matches what you used.</p>':'<p>A paid skip costs '+plan.master.skipCost+' points, earns no reward and leaves the streak unchanged. This can record an intentional skip even when the recommended action differs.</p>'}`,'Preview changes');
  if(!fields)return;guard(ctx,before);
  const numeric=(key:string)=>fields.get(key)?Number(fields.get(key)):null;
  const next=recordTask(ctx.data,p,{masterId:plan.master.id,assignmentId,action,modifier:String(fields.get('modifier')||'none'),modifierPoints:Number(fields.get('points')||0),combatMinutes:numeric('minutes'),kills:numeric('kills')},new Date().toISOString(),crypto.randomUUID());
  const r=next.taskHistory!.at(-1)!;
  if(!await reviewDialog('Confirm task record',`<p>${esc(row.name)} · ${esc(action)}</p><p>Points: <strong>${r.pointsBefore} → ${r.pointsAfter}</strong><br>${esc(plan.master.streakGroup)} streak: <strong>${r.streakBefore} → ${r.streakAfter}</strong>${mortimer?`<br>Completed Mortimer tasks: ${p.mortimerTasks} → ${next.mortimerTasks}`:''}</p><p>This updates this planner only. Undo can reverse this record.</p>`,'Record task'))return;
  guard(ctx,before);ctx.commit(next);
}
export async function applyTimingDialog(ctx:HuntContext,aid:string,vid:string):Promise<void>{
  const p=ctx.profile(),before=JSON.stringify(p),suggestion=timingSuggestion(p,aid,vid);
  if(!suggestion)throw Error('No matching timing samples.');
  if(!await reviewDialog('Apply measured combat rate',`<p>Use ${suggestion.rate.toFixed(1)} actual kills/hour from ${suggestion.samples} completed tasks? Travel/banking remains separate. Review equipment and locations before combining samples.</p>`,'Use measured rate'))return;
  guard(ctx,before);
  const q=clone(p),key=aid+'::'+vid;
  const m=q.methods[key]||q.methods[aid]||prepareRows(ctx.data,ctx.data.masters.find(m=>m.tasks.some(t=>t.id===aid))!,p).find(r=>r.id===aid)!.method;
  q.methods[key]={...m,variantId:vid,timing:'kills-hour',rate:suggestion.rate};ctx.commit(q);
}
