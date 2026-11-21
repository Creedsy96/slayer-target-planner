/** Offline coverage audit of the pinned engine. Run tools/build.mjs first. */
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const c=require('../.desktop-build/core.cjs');
const metadata=require('../data/equipment-requirement-reviews.json');
const profile=c.maxedProfile(c.catalogue);
const usable=item=>!c.temporaryEquipment(item)&&!/broken|uncharged|empty|inactive|\b0\b/i.test(item.version);
const combat=c.ITEMS.filter(item=>usable(item)&&c.hasCombatImpact(item));
const ordinary=c.availableItems(profile).filter(item=>c.hasCombatImpact(item));
const missing=items=>items.filter(item=>c.itemRequirements(item)===null)
 .map(({id,name,version,slot})=>({id,name,version,slot})).sort((a,b)=>a.name.localeCompare(b.name,'en')||a.id-b.id);
const summary=items=>({items:items.length,reviewed:items.filter(item=>c.itemRequirements(item)!==null).length,unreviewed:missing(items).length});
const report={version:metadata.version,engineCommit:metadata.engineCommit,
 scope:'Skill requirements only. Ordinary combat candidates use the existing activity/seasonal exclusions and engine alias deduplication. Quest, diary, boss-kill, charge and acquisition checks are separate.',
 allUsableCombat:summary(combat),ordinaryCombat:summary(ordinary),
 ordinaryUnreviewed:missing(ordinary),allUsableCombatUnreviewed:missing(combat)};
const output=process.argv[2];
if(output)await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({allUsableCombat:report.allUsableCombat,ordinaryCombat:report.ordinaryCombat,output:output||null}));
