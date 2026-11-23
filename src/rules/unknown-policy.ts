import type {Profile} from '../domain/types';
/** A quest snapshot lists observed states; absent requirements mean not done.
 * The switch is additive for saved characters and leaves explicit scenario
 * assumptions available for characters that have never imported account facts. */
export const negativeUnknowns=(p:Profile):boolean=>p.negativeUnknowns??!!p.questImport;
export function unknownWarnings(p:Profile):string[]{
 if(!negativeUnknowns(p))return [];
 const missing=[...Object.entries(p.levels).filter(([,v])=>v==null).map(([k])=>k+' level'),...Object.entries(p.diaries).filter(([,v])=>v==null).map(([k])=>k+' elite diary'),...Object.entries(p.access).filter(([,v])=>v==null).map(([k])=>k.replace(/^(location|variant):/,''))];
 return missing.length?['Unconfirmed account facts assumed unavailable: '+missing.join(', ')+'. Review Account & access.']:[];
}
