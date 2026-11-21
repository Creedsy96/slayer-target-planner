import type {EquipmentItem} from './types';
import type {GearComparisonRow} from './comparisons';
import {equipmentItem} from './equipment';

const plainStatNames=new Set([
  'amulet of accuracy','amulet of defence','amulet of magic','amulet of power','amulet of strength','amulet of fury','amulet of torture','necklace of anguish','occult necklace',
  'leather body','hardleather body','studded body','leather chaps','studded chaps','leather vambraces','leather gloves','leather boots','coif','cowl',
  'wizard hat','black wizard hat','wizard robe','black wizard robe','wizard robe skirt','black robe','blue skirt',
  'climbing boots','barrows gloves','ranger boots','wizard boots','manacles','spiked manacles','obsidian cape','fire cape','infernal cape',
  'fremennik helm','fremennik shield','rock-shell helm','rock-shell plate','rock-shell legs','spined helm','spined body','spined chaps','spined gloves','spined boots',
  'skeletal helm','skeletal top','skeletal bottoms','skeletal gloves','skeletal boots','granite helm','granite body','granite legs','granite shield',
  'bellator ring','ultor ring','magus ring','venator ring','avernic defender',
]);

// Deliberate positive identification. Unreviewed effects, charges, set bonuses,
// teleports, god protection and consumable items cannot establish dominance.
function permanentStatGear(item:EquipmentItem):boolean{
 if(item.version&&!/^(normal|standard)$/i.test(item.version))return false;
 const name=item.name.replace(/ \((?:g|t|or)\)$/i,'');
 if(/^(bronze|iron|steel|black|mithril|adamant|rune|dragon|gilded) (full helm|med helm|chainbody|platebody|platelegs|plateskirt|sq shield|kiteshield|boots|gloves|defender)$/i.test(name))return true;
 if(/^(bronze|iron|steel|black|mithril|adamant|rune) (dagger|sword|longsword|scimitar|mace|battleaxe|warhammer|2h sword|spear|halberd|claws|crossbow)$/i.test(name))return true;
 if(/^(?:(?:oak|willow|maple|yew|magic) )?(shortbow|longbow)$/i.test(name))return true;
 if(/^(green|blue|red|black) d'hide (body|chaps|vambraces|shield)$/i.test(name))return true;
 if(/^(mystic|infinity) (hat|robe top|robe bottom|gloves|boots)$/i.test(name))return true;
 if(/^(archers|warrior|berserker|seers|granite) ring(?: \(i\))?$/i.test(name))return true;
 return plainStatNames.has(name.toLowerCase());
}

/** A partial order, not an offensive score: one inferior bonus prevents hiding. */
export function strictGearUpgrade(better:EquipmentItem,worse:EquipmentItem):boolean{
 if(better.id===worse.id||better.slot!==worse.slot||!permanentStatGear(better)||!permanentStatGear(worse))return false;
 if(better.isTwoHanded!==worse.isTwoHanded||better.slot==='weapon'&&better.category!==worse.category)return false;
 const leftWeight=better.weight,rightWeight=worse.weight;
 if(typeof leftWeight!=='number'||typeof rightWeight!=='number'||!Number.isFinite(leftWeight)||!Number.isFinite(rightWeight)||leftWeight>rightWeight)return false;
 if(better.slot==='weapon'&&better.speed>worse.speed)return false;
 let strict=leftWeight<rightWeight||better.slot==='weapon'&&better.speed<worse.speed;
 for(const group of ['bonuses','offensive','defensive'] as const){
  for(const key of new Set([...Object.keys(better[group]),...Object.keys(worse[group])])){
   const left=(better[group] as Record<string,number>)[key]??0,right=(worse[group] as Record<string,number>)[key]??0;
   if(!Number.isFinite(left)||!Number.isFinite(right)||left<right)return false;
   strict ||= left>right;
  }
 }
 return strict;
}

export function filterStrictUpgrades(rows:GearComparisonRow[],assumed:boolean):{rows:GearComparisonRow[];outclassed:GearComparisonRow[]}{
 const visible:GearComparisonRow[]=[],outclassed:GearComparisonRow[]=[];
 for(const row of rows){
  const item=equipmentItem(row.id);
  const upgrade=!row.selected&&row.dps!==null&&item?rows.find(other=>{
   if(other.dps===null||!other.owned&&!assumed||other.ammoId!==row.ammoId||other.dps+1e-10<row.dps!||(other.aggregateDps??other.dps)+1e-10<(row.aggregateDps??row.dps!))return false;
   const candidate=equipmentItem(other.id);return candidate&&strictGearUpgrade(candidate,item);
  }):undefined;
  if(upgrade)outclassed.push({...row,upgrade:upgrade.name});else visible.push(row);
 }
 return {rows:visible,outclassed};
}

export function compareGearRows(a:GearComparisonRow,b:GearComparisonRow):number{
 const dps=(b.aggregateDps??-1)-(a.aggregateDps??-1);
 return Number(b.selected)-Number(a.selected)||(Math.abs(dps)>1e-10?dps:0)||b.prayer-a.prayer||b.defence-a.defence||a.id-b.id||(a.ammoId??0)-(b.ammoId??0);
}
