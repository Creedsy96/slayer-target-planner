import type {Catalogue,Profile,Method} from '../domain/types';
import {combatIdentity} from './cache';
import {configuredMethod} from './priority';
import {withCalculatedTiming} from './timing';
import {travelIdentity} from '../state/travel';

export function methodPreviewKey(p:Profile,assignment:string,method:Method):string{
 return JSON.stringify([p.id,combatIdentity(p),travelIdentity(p),p.gearOverrides?.[method.variantId],assignment,method]);
}
/** Resolve the editor selection directly; planner rows can use other variants. */
export function calculateMethodPreview(data:Catalogue,p:Profile,assignment:string,variantId:string):Method{
 const entry=data.assignments.find(a=>a.id===assignment),variant=data.variants.find(v=>v.id===variantId);
 if(!entry?.variantIds.includes(variantId)||!variant)throw Error('Choose a creature variant belonging to this assignment.');
 return withCalculatedTiming(p,variant,configuredMethod(data,p,assignment,variantId));
}
