import {ammoApplicability,AmmoApplicability} from '../../vendor/osrs-dps/runtime.js';
import {applyAreaDamage} from './area-damage';
import type {Profile} from '../domain/types';
import type {GuideRecord,GuideForm,GuideState,LocationPlan,GearSet} from '../guide/types';
import type {CombatResult,CombatStyle,EquipmentItem,EquipmentSlot,Loadout} from './types';
import {EQUIPMENT_SLOTS} from './types';
import {ownedItems,canEquip,itemForLabel,equipmentItem,slotNames} from './equipment';
import {calculateCombat,combatStyles,emptyCombat,familyOf,isWildernessCombat,candidateSpells} from './calculate';
import {encounter} from '../guide/encounters';
import {defaultCombat} from '../state/bank';
import art from '../ui/item-art.json';

const cache=new Map<string,CombatResult>();let lastIdentity='';
function identity(p:Profile):string{return JSON.stringify([p.bank,p.levels,p.combat,p.diaries.kourend,p.quests,p.questImport?.states]);}
function requirementSlots(record:GuideRecord,state:GuideState,location?:LocationPlan,p?:Profile):Partial<Record<EquipmentSlot,(i:EquipmentItem)=>boolean>>{
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
function slotCandidates(items:EquipmentItem[],family:string):EquipmentItem[]{
 const sorted=items.sort((a,b)=>score(b,family)-score(a,family)||a.id-b.id);
 // Task and target multipliers can outweigh raw equipment bonuses.
 const specialists=sorted.filter(i=>/slayer helmet|black mask|salve amulet|berserker necklace/i.test(i.name));
 return [...new Map([...sorted.slice(0,8),...specialists].map(i=>[i.id,i])).values()];
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
 return result;
}
export function bestOwnedGear(p:Profile,record:GuideRecord,form:GuideForm,state:GuideState,location?:LocationPlan):CombatResult{
 const signature=identity(p);
 if(signature!==lastIdentity){cache.clear();lastIdentity=signature;}
 const key=''+record.id+'|'+form.id+'|'+state.approach+'|'+state.onTask+'|'+location?.name+'|'+state.stackSize;
 const saved=cache.get(key);if(saved)return structuredClone(saved);
 const result=search(p,record,form,state,location);if(cache.size>500)cache.clear();cache.set(key,result);return structuredClone(result);
}
function search(p:Profile,record:GuideRecord,form:GuideForm,state:GuideState,location?:LocationPlan):CombatResult{
 if(!p.bank)return emptyCombat('Import bank/equipment files or add your owned gear first.');
 const config=p.combat??defaultCombat(),owned=ownedItems(p).filter(i=>canEquip(i,p)),required=requirementSlots(record,state,location,p),m=encounter(record);
 const forced:Loadout={};
 for(const [slot,accept]of Object.entries(required)){
  if(slot==='shield'&&record.id==='lobstrosity')continue;
  const choices=owned.filter(i=>i.slot===slot&&accept(i));
  if(!choices.length)return emptyCombat('Missing usable required '+slotNames[slot as EquipmentSlot]+': '+(slot==='shield'?m.shield?.join(' / '):slot==='head'?m.head||(m.shayzien?'Shayzien helm (5)':'head protection'):slot==='feet'?m.boots||'Karuulm protective boots':slot==='neck'?m.neck:'creature-specific equipment')+'.');
  forced[slot as EquipmentSlot]=choices[0].id;
 }
 const allowed=m.allowed||['melee','ranged','magic'],requested=state.approach==='auto'?null:state.approach.split('-')[0];
 let best=emptyCombat('No compatible usable weapon/ammo setup was found. Check levels, spellbook and required protection.');
 const rank=(r:CombatResult)=>r.aggregateDps??r.dps;
 for(const family of requested?[requested]:allowed){
  if(!allowed.includes(family as 'melee'|'ranged'|'magic'))continue;
  const candidates=owned.filter(i=>i.slot==='weapon'&&(!required.weapon||required.weapon(i))&&(!required.shield||!i.isTwoHanded)&&combatStyles(i.id).some(s=>familyOf(s)===family)).sort((a,b)=>(score(b,family)+320)/(b.speed||4)-(score(a,family)+320)/(a.speed||4));
  const specialists=candidates.filter(i=>/Powered/i.test(i.category)||/Twisted bow|faerdhinen|Scythe|fang|Arclight|Emberlight|Darklight|Silverlight|Scorching bow|Purging staff|Dragon hunter|Keris|Inquisitor.s mace|rat|Bone (mace|staff|shortbow)|leaf-bladed|obsidian|toktz/i.test(i.name)||m.weapon?.some(n=>n.toLowerCase()===i.name.toLowerCase()));
  const weapons=[...new Map([...candidates.slice(0,12),...specialists].map(i=>[i.id,i])).values()];
  const shortlist:CombatResult[]=[];
  const evaluate=(loadout:Loadout,style:CombatStyle,spell:string|null)=>applyAreaDamage(calculateCombat(p,record,form,loadout,style,spell,state.onTask,isWildernessCombat(record,location),false),record,location,state.stackSize);
  for(const weapon of weapons){
   const choices=(slot:EquipmentSlot)=>slotCandidates(owned.filter(i=>i.slot===slot&&(!required[slot]||required[slot]!(i))&&(slot!=='ammo'||usableAmmo(weapon,i,family))),family);
   const loadout:Loadout={...forced,weapon:weapon.id};
   for(const slot of EQUIPMENT_SLOTS){
    if(slot==='weapon'||forced[slot]||slot==='shield'&&(weapon.isTwoHanded||record.id==='lobstrosity'))continue;
    const items=choices(slot);if(items.length)loadout[slot]=items[0].id;
   }
   const styles=combatStyles(weapon.id).filter(s=>familyOf(s)===family&&!/defensive|longrange/i.test(s.stance));
   const spells=family==='magic'&&!/Powered/i.test(weapon.category)?candidateSpells(p):[null];
   let seed=emptyCombat('No damaging style for this weapon.');
   for(const initial of setSeeds(loadout,owned,required,family,weapon))for(const style of styles)for(const spell of spells){
    const value=evaluate(initial,style,spell);if(value.supported&&rank(value)>rank(seed))seed=value;
   }
   if(seed.supported)shortlist.push(seed);
  }
  // Screen every retained weapon/spell first, then refine four finalists. This
  // avoids thousands of full slot searches for obviously weaker weapons.
  for(let seed of shortlist.sort((a,b)=>rank(b)-rank(a)).slice(0,4)){
   const weapon=equipmentItem(seed.loadout.weapon!)!;
   for(let pass=0;pass<2;pass++)for(const slot of EQUIPMENT_SLOTS){
    if(slot==='weapon'||slot==='shield'&&(weapon.isTwoHanded||record.id==='lobstrosity'))continue;
    const choices=slotCandidates(owned.filter(i=>i.slot===slot&&(!required[slot]||required[slot]!(i))&&(slot!=='ammo'||usableAmmo(weapon,i,family))),family);
    for(const item of [...(required[slot]?[]:[undefined]),...choices]){
     const trial={...seed.loadout};if(item)trial[slot]=item.id;else delete trial[slot];
     const value=evaluate(trial,seed.style,seed.spell);
     if(value.supported&&(rank(value)>rank(seed)+1e-10||Math.abs(rank(value)-rank(seed))<1e-10&&preference(value.loadout)>preference(seed.loadout)))seed=value;
    }
   }
   if(rank(seed)>rank(best))best=seed;
  }
 }
 if(!best.supported)return best;
 const result=applyAreaDamage(calculateCombat(p,record,form,best.loadout,best.style,best.spell,state.onTask,isWildernessCombat(record,location)),record,location,state.stackSize);
 result.notes.push('Best found by a bounded search: weapon/spell screening, full-set seeds and two slot passes for four finalists per style. Required protection and compatible ammunition are preserved. Not a global optimum proof.','Owned quantities indicate availability. Replenishable runes, ammunition and charges are assumed; item quest/diary unlocks need review.');
 if(config.allowUnknownRequirements)result.notes.push('Unreviewed equipment skill requirements accepted by your setting.');
 if(m.boss||m.hybrid)result.notes.push('Encounter/phase DPS only; configured hunter timing is retained.');
 return result;
}
function usableAmmo(weapon:EquipmentItem,ammo:EquipmentItem,family:string):boolean{
 if(weapon.name==='Toxic blowpipe')return /dart/i.test(ammo.name);
 const applicability=ammoApplicability(weapon.id,ammo.id);
 return applicability!==AmmoApplicability.INVALID&&(family==='ranged'&&applicability===AmmoApplicability.INCLUDED||ammo.bonuses.prayer>0);
}
function preference(loadout:Loadout):number{
 return Object.values(loadout).reduce((sum,id)=>{const item=equipmentItem(id!);return sum+(item?.bonuses.prayer||0)*500+Object.values(item?.defensive||{}).reduce((a,b)=>a+b,0);},0);
}
export function exampleLoadout(set:GearSet):Loadout{
 const result:Loadout={};
 for(const row of set.slots){
  const slot=Object.entries(slotNames).find(([,label])=>label===row.slot)?.[0] as EquipmentSlot|undefined;if(!slot)continue;
  let item=itemForLabel(row.item);
  if(!item)for(const label of Object.keys(art.aliases).sort((a,b)=>b.length-a.length))if(row.item.toLowerCase().includes(label.toLowerCase())){const choice=itemForLabel(label);if(choice?.slot===slot){item=choice;break;}}
  if(item?.slot===slot)result[slot]=item.id;
 }
 return result;
}
