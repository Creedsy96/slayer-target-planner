import type {Catalogue,Plan,Profile} from '../domain/types';
import {blockImpacts} from './explanations';
import {blockPreview} from './hunt-tools';

/** Run alongside planning in the CPU worker, never while drawing the page. */
export function withPlanReview(data:Catalogue,plan:Plan,p:Profile):Plan{
 const prepared=structuredClone(plan.rows);
 for(const row of prepared){
  row.probability=0;row.skip=0;row.blocked=false;
  for(const outcome of row.locationOutcomes||[]){outcome.row.probability=0;outcome.row.skip=0;outcome.row.blocked=false;}
 }
 const impacts=blockImpacts(data,plan,p,prepared);
 const {added,removed,cost,minutesSaved,chanceGain}=blockPreview(data,plan,p,prepared);
 return {...plan,review:{impacts,blocks:{added,removed,cost,minutesSaved,chanceGain}}};
}
