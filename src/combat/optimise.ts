import {combatCandidate} from './combat-impact';
import {weaponSupportsFamily,weaponStylesForFamily} from './weapon-family';
import {availableItems} from './availability';
import {isBlowpipe,isCrossbow,rangedWeaponCandidates,rangedAmmoCandidates,usableAmmo} from './ranged';
export {usableAmmo} from './ranged';
import {fightPlan} from '../guide/model';
import {fallbackArmour,compareLoadoutSustain,type ArmourPriority,type ArmourContext} from './armour';
import {applyAreaDamage} from './area-damage';
import type {Profile} from '../domain/types';
import type {GuideRecord,GuideForm,GuideState,LocationPlan,GearSet,Family} from '../guide/types';
import type {CombatResult,CombatStyle,EquipmentItem,EquipmentSlot,Loadout} from './types';
import {EQUIPMENT_SLOTS} from './types';
import {canEquip,itemForLabel,equipmentItem,slotNames} from './equipment';
import {calculateCombat,emptyCombat,isWildernessCombat,candidateSpells} from './calculate';
import {encounter} from '../guide/encounters';
import {defaultCombat} from '../state/bank';
import art from '../ui/item-art.json';
import {CombatCacheStore,combatIdentity,type CombatCacheSnapshot} from './cache';

const cache=new CombatCacheStore();
let cacheObserver:((identity:string,key:string,result:CombatResult)=>void)|undefined;
export function observeCombatCache(observer:typeof cacheObserver):void{cacheObserver=observer;}
export function restoreCombatCache(p:Profile,snapshot?:CombatCacheSnapshot):void{cache.restore(combatIdentity(p),snapshot);}
export function clearCombatCache():void{cache.clear();}
export function requirementSlots(record:GuideRecord,state:GuideState,location?:LocationPlan,p?:Profile):Partial<Record<EquipmentSlot,(i:EquipmentItem)=>boolean>>{
 const m=encounter(record),slots:Partial<Record<EquipmentSlot,(i:EquipmentItem)=>boolean>>={};
 if(m.shield)slots.shield=i=>m.shield!.some(n=>n.toLowerCase()===i.name.toLowerCase())||!!m.dragonfire&&['Anti-dragon shield','Dragonfire shield','Dragonfire ward'].includes(i.name)||!!m.wyvern&&['Elemental shield','Mind shield','Ancient wyvern shield'].includes(i.name);
 if(m.head)slots.head=i=>i.name.toLowerCase()===m.head!.toLowerCase()||/slayer helmet/i.test(i.name);
 if(m.neck)slots.neck=i=>i.name.toLowerCase()===m.neck!.toLowerCase();
 if(m.boots)slots.feet=i=>i.name.toLowerCase()===m.boots!.toLowerCase();
 if(location&&/karuulm/i.test(location.name)&&p?.diaries.kourend!==1)slots.feet=i=>/boots of (stone|brimstone)|granite boots/i.test(i.name);
 if(m.shayzien)for(const slot of ['head','body','legs','hands','feet'] as const)slots[slot]=i=>/shayzien.*\(5\)/i.test(i.name);
 if(m.shayzien&&p?.diaries.kourend===1)slots.head=i=>/shayzien.*\(5\)|slayer helmet/i.test(i.name);
 if(['turoth','kurask'].includes(record.id))slots.weapon=i=>/leaf-bladed|crossbow|slayer.s staff/i.test(i.name);
 if(['vyrewatch-sentinel','venator'].includes(record.id))slots.weapon=i=>/blisterwood|sunspear/i.test(i.name);
 if(record.id==='chompy-bird')slots.weapon=i=>/ogre bow/i.test(i.name);
 if(record.id==='lobstrosity'){slots.weapon=i=>/trident|brine sabre|dragon harpoon/i.test(i.name);slots.shield=()=>false;}
 return slots;
}
const score=(item:EquipmentItem,family:string)=>family==='melee'?item.bonuses.str*5+Math.max(item.offensive.stab,item.offensive.slash,item.offensive.crush):family==='ranged'?item.bonuses.ranged_str*5+item.offensive.ranged:item.bonuses.magic_str*30+item.offensive.magic;
function slotCandidates(items:EquipmentItem[],family:string,context?:ArmourContext):EquipmentItem[]{
 const sorted=items.sort((a,b)=>score(b,family)-score(a,family)||a.id-b.id);
 // Task and target multipliers can outweigh raw equipment bonuses.
 const specialists=sorted.filter(i=>/slayer helmet|black mask|salve amulet|berserker necklace/i.test(i.name));
 return [...new Map([...sorted.slice(0,8),...specialists,...(context&&items.some(i=>i.slot==='body'||i.slot==='legs')?fallbackArmour(items,context).slice(0,1):[])].map(i=>[i.id,i])).values()];
}
function setSeeds(base:Loadout,owned:EquipmentItem[],required:Partial<Record<EquipmentSlot,(i:EquipmentItem)=>boolean>>,family:string,weapon:EquipmentItem):Loadout[]{
 const result=[base];
 const add=(names:string[])=>{
  const items=names.map(name=>owned.find(i=>i.name.toLowerCase()===name.toLowerCase()));
  if(items.some(item=>!item))return;
  if(items.some(item=>required[item!.slot]&&!required[item!.slot]!(item!)))return;
  result.push({...base,...Object.fromEntries(items.map(item=>[item!.slot,item!.id]))});
 };
 const helmet=family==='melee'?'Void melee helm':family==='ranged'?'Void ranger helm':'Void mage helm';
 add([helmet,'Void knight top','Void knight robe','Void knight gloves']);
 add([helmet,'Elite void top','Elite void robe','Void knight gloves']);
 if(/Bow of faerdhinen|Crystal bow/i.test(weapon.name))add(['Crystal helm','Crystal body','Crystal legs']);
 if(family==='melee')add(['Obsidian helmet','Obsidian platebody','Obsidian platelegs','Berserker necklace']);
 if(weapon.name==='Eclipse atlatl')add(['Eclipse Moon helm','Eclipse Moon chestplate','Eclipse Moon tassets']);
 return result;
}
export function bestOwnedGear(p:Profile,record:GuideRecord,form:GuideForm,state:GuideState,location?:LocationPlan,priority?:ArmourPriority):CombatResult{
 const signature=combatIdentity(p),mode=priority??fightPlan(record,form,state,location).defence;
 const family=state.approach==='auto'?'auto':state.approach.split('-')[0];
 const key=JSON.stringify([record.id,form.id,family,mode,state.onTask,location?.name,state.stackSize,family==='auto'?p.gearOverrides?.[record.id]:p.gearOverrides?.[record.id]?.[family as Family]]);
 const saved=cache.get(signature,key);if(saved)return saved;
 const result=search(p,record,form,state,location,mode);cache.put(signature,key,result);cacheObserver?.(signature,key,structuredClone(result));return structuredClone(result);
}
function search(p:Profile,record:GuideRecord,form:GuideForm,state:GuideState,location?:LocationPlan,priority?:ArmourPriority):CombatResult{
 if(!p.bank&&!p.assumeAllGear)return emptyCombat('Import bank/equipment files or add your owned gear first.');
 const config=p.combat??defaultCombat(),required=requirementSlots(record,state,location,p),m=encounter(record);
 const relevant=(item:EquipmentItem)=>combatCandidate(item,required[item.slot]?.(item));
 const owned=availableItems(p).filter(i=>canEquip(i,p)&&relevant(i));
 const forced:Loadout={};
 for(const [slot,accept]of Object.entries(required)){
  if(slot==='shield'&&record.id==='lobstrosity')continue;
  const choices=owned.filter(i=>i.slot===slot&&accept(i));
  if(!choices.length)return emptyCombat('Missing usable required '+slotNames[slot as EquipmentSlot]+': '+(slot==='shield'?m.shield?.join(' / '):slot==='head'?m.head||(m.shayzien?'Shayzien helm (5)':'head protection'):slot==='feet'?m.boots||'Karuulm protective boots':slot==='neck'?m.neck:'creature-specific equipment')+'.');
  forced[slot as EquipmentSlot]=choices[0].id;
 }
 const mode=priority??fightPlan(record,form,state,location).defence;
 const allowed=m.allowed||['melee','ranged','magic'],requested=state.approach==='auto'?null:state.approach.split('-')[0];
 let best=emptyCombat('No compatible usable weapon/ammo setup was found. Check levels, spellbook and required protection.');
 const rank=(r:CombatResult)=>r.aggregateDps??r.dps;
 for(const family of requested?[requested]:allowed){
  if(!allowed.includes(family as 'melee'|'ranged'|'magic'))continue;
  const recorded=p.gearOverrides?.[record.id]?.[family as Family]||{};
  const pins:Loadout=Object.fromEntries(Object.entries(recorded).filter(([,id])=>{const item=equipmentItem(id);return !item||relevant(item);}));
  const invalid=Object.entries(pins).find(([slot,id])=>{const item=owned.find(i=>i.id===id);return !item||item.slot!==slot&&!(slot==='ammo'&&item.slot==='weapon')||required[slot as EquipmentSlot]&&!required[slot as EquipmentSlot]!(item)||slot==='weapon'&&!weaponSupportsFamily(item,family);});
  if(invalid){if(requested)return emptyCombat('Saved '+slotNames[invalid[0] as EquipmentSlot]+' choice is no longer usable. Reset this style’s gear choices or update your bank.');continue;}
  const context:ArmourContext={family:family as Family,priority:mode,form};
  const candidates=owned.filter(i=>i.slot==='weapon'&&(!required.weapon||required.weapon(i))&&(!required.shield||!i.isTwoHanded)&&weaponSupportsFamily(i,family)).sort((a,b)=>(score(b,family)+320)/(b.speed||4)-(score(a,family)+320)/(a.speed||4));
  const retained=pins.weapon?candidates.filter(i=>i.id===pins.weapon):family==='ranged'?rangedWeaponCandidates(candidates):candidates;
  const specialists=retained.filter(i=>isCrossbow(i)||isBlowpipe(i)||/Powered/i.test(i.category)||/Twisted bow|faerdhinen|Scythe|fang|Arclight|Emberlight|Darklight|Silverlight|Scorching bow|Purging staff|Dragon hunter|Keris|Inquisitor.s mace|rat|Bone (mace|staff|shortbow)|leaf-bladed|obsidian|toktz/i.test(i.name)||m.weapon?.some(n=>n.toLowerCase()===i.name.toLowerCase()));
  const weapons=[...new Map([...retained.slice(0,12),...specialists].map(i=>[i.id,i])).values()];
  const shortlist:CombatResult[]=[];
  const evaluate=(loadout:Loadout,style:CombatStyle,spell:string|null)=>applyAreaDamage(calculateCombat(p,record,form,loadout,style,spell,state.onTask,isWildernessCombat(record,location),false),record,location,state.stackSize);
  for(const weapon of weapons){
   const choices=(slot:EquipmentSlot)=>pins[slot]?owned.filter(i=>i.id===pins[slot]):slot==='ammo'&&family==='ranged'?rangedAmmoCandidates(owned,weapon):slotCandidates(owned.filter(i=>i.slot===slot&&(!required[slot]||required[slot]!(i))&&(slot!=='ammo'||usableAmmo(weapon,i,family))),family,context);
   if(weapon.isTwoHanded&&pins.shield)continue;
   if(pins.ammo&&!usableAmmo(weapon,equipmentItem(pins.ammo)!,family))continue;
   const loadout:Loadout={...forced,...pins,weapon:weapon.id};
   for(const slot of EQUIPMENT_SLOTS){
    if(slot==='weapon'||forced[slot]||pins[slot]||slot==='shield'&&(weapon.isTwoHanded||record.id==='lobstrosity'))continue;
    const items=choices(slot);if(items.length)loadout[slot]=items[0].id;
   }
   const styles=weaponStylesForFamily(weapon,family).filter(s=>!/defensive|longrange/i.test(s.stance));
   const spells=family==='magic'&&!/Powered/i.test(weapon.category)?candidateSpells(p):[null];
   let seed=emptyCombat('No damaging style for this weapon.');
   const ammo=(isCrossbow(weapon)||isBlowpipe(weapon))?choices('ammo'):[undefined];
   for(const initial of setSeeds(loadout,owned,required,family,weapon).filter(seed=>Object.entries(pins).every(([slot,id])=>seed[slot as EquipmentSlot]===id)))for(const ammunition of ammo)for(const style of styles)for(const spell of spells){
    const value=evaluate(ammunition?{...initial,ammo:ammunition.id}:initial,style,spell);if(value.supported&&rank(value)>rank(seed))seed=value;
   }
   if(seed.supported)shortlist.push(seed);
  }
  // Screen every retained weapon/spell first, then refine four finalists. This
  // avoids thousands of full slot searches for obviously weaker weapons.
  for(let seed of shortlist.sort((a,b)=>rank(b)-rank(a)).slice(0,4)){
   const weapon=equipmentItem(seed.loadout.weapon!)!;
   for(let pass=0;pass<2;pass++)for(const slot of EQUIPMENT_SLOTS){
    if(slot==='weapon'||pins[slot]||slot==='shield'&&(weapon.isTwoHanded||record.id==='lobstrosity'))continue;
    const choices=slot==='ammo'&&family==='ranged'?rangedAmmoCandidates(owned,weapon):slotCandidates(owned.filter(i=>i.slot===slot&&(!required[slot]||required[slot]!(i))&&(slot!=='ammo'||usableAmmo(weapon,i,family))),family,context);
    for(const item of [...(required[slot]?[]:[undefined]),...choices]){
     const trial={...seed.loadout};if(item)trial[slot]=item.id;else delete trial[slot];
     const value=evaluate(trial,seed.style,seed.spell);
     if(value.supported&&(rank(value)>rank(seed)+1e-10||Math.abs(rank(value)-rank(seed))<1e-10&&compareLoadoutSustain(value.loadout,seed.loadout,context)>0))seed=value;
    }
   }
   seed=completeArmour(seed,owned,{...required,...Object.fromEntries(Object.keys(pins).map(slot=>[slot,()=>true]))},context,evaluate);
   if(rank(seed)>rank(best)||Math.abs(rank(seed)-rank(best))<1e-10&&compareLoadoutSustain(seed.loadout,best.loadout,context)>0)best=seed;
  }
 }
 if(!best.supported)return best;
 const result=applyAreaDamage(calculateCombat(p,record,form,best.loadout,best.style,best.spell,state.onTask,isWildernessCombat(record,location)),record,location,state.stackSize);
 const savedChoices=p.gearOverrides?.[record.id]?.[result.family as Family];
 if(savedChoices&&Object.values(savedChoices).some(id=>{const item=equipmentItem(id!);return item&&!relevant(item);}))result.notes.push('Saved choices without combat benefit in this encounter were ignored. The bank and saved choices are unchanged; reset this style to clear those choices.');
 if(savedChoices)result.notes.push('Combat-relevant saved gear choices for this creature/style are held fixed; remaining slots are optimised automatically. Reset gear choices to restore automatic selection.');
 result.armourPriority=mode;result.armourFallback=best.armourFallback;
 if(best.armourFallback?.length)result.notes.push('Armour fallback ('+(mode==='prayer'?'prayer bonus first':'defence against listed attacks first')+'): '+best.armourFallback.map(slot=>slotNames[slot]+' / '+equipmentItem(result.loadout[slot]!)!.name).join('; ')+'. These slots were not DPS upgrades. Displayed DPS and kill time include the selected armour and any accuracy penalties.');
 const emptyArmour=(['body','legs'] as const).filter(slot=>!result.loadout[slot]);
 if(emptyArmour.length)result.notes.push('No compatible wearable owned armour is available for: '+emptyArmour.map(slot=>slotNames[slot]).join(', ')+'. Check bank quantities, levels and unreviewed item requirements.');
 result.notes.push('Best found by a bounded search: weapon/spell screening, full-set seeds and two slot passes for four finalists per style. Required protection and compatible ammunition are preserved. Not a global optimum proof.',p.assumeAllGear?'All ordinary-game equipment is assumed available for this scenario; this is not an imported bank. Runes, ammunition and charges are assumed replenishable.':'Owned quantities indicate availability. Replenishable runes, ammunition and charges are assumed; item quest/diary unlocks need review.');
 if(config.allowUnknownRequirements)result.notes.push('Unreviewed equipment skill requirements accepted by your setting.');
 if(m.boss||m.hybrid)result.notes.push('Encounter/phase DPS only; configured hunter timing is retained.');
 return result;
}
function completeArmour(seed:CombatResult,owned:EquipmentItem[],required:Partial<Record<EquipmentSlot,(i:EquipmentItem)=>boolean>>,context:ArmourContext,evaluate:(loadout:Loadout,style:CombatStyle,spell:string|null)=>CombatResult):CombatResult{
 const fallback:EquipmentSlot[]=[];
 for(const slot of ['body','legs'] as const){
  if(required[slot])continue;
  const bare={...seed.loadout};delete bare[slot];
  const unarmoured=evaluate(bare,seed.style,seed.spell);
  if(!unarmoured.supported||seed.dps>unarmoured.dps+1e-10)continue;
  for(const item of fallbackArmour(owned.filter(i=>i.slot===slot),context)){
   const value=evaluate({...seed.loadout,[slot]:item.id},seed.style,seed.spell);
   if(!value.supported)continue;
   seed=value;fallback.push(slot);break;
  }
 }
 return {...seed,armourFallback:fallback,armourPriority:context.priority};
}
export function exampleLoadout(set:GearSet):Loadout{
 const result:Loadout={};
 const weapon=itemForLabel(set.slots.find(row=>row.slot==='Weapon')?.item||'');
 for(const row of set.slots){
  const slot=Object.entries(slotNames).find(([,label])=>label===row.slot)?.[0] as EquipmentSlot|undefined;if(!slot)continue;
  let item=itemForLabel(row.item);
  if(!item)for(const label of Object.keys(art.aliases).sort((a,b)=>b.length-a.length))if(row.item.toLowerCase().includes(label.toLowerCase())){const choice=itemForLabel(label);if(choice&&(choice.slot===slot||slot==='ammo'&&isBlowpipe(weapon)&&usableAmmo(weapon,choice,'ranged'))){item=choice;break;}}
  if(item&&(item.slot===slot||slot==='ammo'&&isBlowpipe(weapon)&&usableAmmo(weapon,item,'ranged')))result[slot]=item.id;
 }
 return result;
}
