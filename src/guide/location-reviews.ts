import raw from '../../data/location-reviews.json';
import {locationReview as accessReview} from '../rules/reviewed-locations';
import type {LocationAccessReview} from '../rules/reviewed-locations';

export interface LocationReview extends LocationAccessReview {summary:string;transportNotes:string[];travel:string[];caveats?:string[]}
declare const LOCATION_REVIEW_DETAILS:boolean;
// Worker builds drop this data-only import entirely. Ranking/gear need the
// compact rules; source excerpts are for the visible guide, not calculations.
const details=typeof LOCATION_REVIEW_DETAILS==='undefined'||LOCATION_REVIEW_DETAILS?raw.records as unknown as Record<string,LocationReview>:undefined;
export function locationReview(name:string,page?:string|null):LocationReview|undefined{
 const record=accessReview(name,page);return record?details?.[record.name.toLowerCase()]||{...record,summary:'',transportNotes:[],travel:[]}:undefined;
}
