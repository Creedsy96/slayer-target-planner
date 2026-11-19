import type {Attack,FightPlan,GearSet,GearSlot,GuideForm,GuideRecord,GuideState,LocationPlan,Supply} from './types';

const elemental:Partial<Record<Attack,[string,string,string]>>={air:['Mystic air staff','Wind wave','Wind surge'],water:['Mystic water staff','Water wave','Water surge'],earth:['Mystic earth staff','Earth wave','Earth surge'],fire:['Mystic fire staff','Fire wave','Fire surge']};
const attackName:Record<Attack,string>={stab:'Stab',slash:'Slash',crush:'Crush',light:'Light ammunition',standard:'Standard ammunition',heavy:'Heavy ammunition',powered:'Powered Magic (non-elemental)',barrage:'Ice Burst / Ice Barrage',air:'Air spells',water:'Water spells',earth:'Earth spells',fire:'Fire spells',vampyrebane:'Vampyrebane melee',godspell:'Flames of Zamorak',dart:'Magic Dart'};
export function offenceName(attack:Attack):string{return attackName[attack];}

/** Examples are coherent loadouts, not an assertion of globally optimal DPS or
 * current prices. Mandatory protection overrides ordinary upgrade slots. */
export function gearSet(record:GuideRecord,form:GuideForm,plan:FightPlan,state:GuideState,location:LocationPlan|undefined,tier:'mid'|'max'):GearSet{
  const high=tier==='max',m=plan.mechanics,slots:Record<string,string>={};
  const notes:string[]=['Examples assume the item, spell and prayer unlocks. Choose substitutes you can actually use.'];
  let attack=plan.attack,twoHanded=false;
  slots.Head=state.onTask?'Slayer helmet (i)':plan.family==='melee'?(high?'Neitiznot faceguard':'Helm of Neitiznot'):plan.family==='ranged'?(high?'Masori mask (f)':'Blessed coif'):(high?'Ancestral hat':'Mystic hat');
  if(plan.family==='melee'){
    slots.Neck=high?'Amulet of rancour':'Amulet of fury';slots.Cape=high?'Infernal cape':'Fire cape';
    slots.Body=plan.defence==='prayer'?(high?'Sunfire fanatic cuirass':'Proselyte hauberk'):(high?'Torva platebody':"Torag's platebody");
    slots.Legs=plan.defence==='prayer'?(high?'Sunfire fanatic chausses':'Proselyte cuisse'):(high?'Torva platelegs':"Verac's plateskirt");
    if(attack==='crush'){slots.Weapon=high?"Inquisitor's mace":'Sarachnis cudgel';if(high&&plan.defence==='tank'){slots.Body="Inquisitor's hauberk";slots.Legs="Inquisitor's plateskirt";}}
    else if(attack==='stab')slots.Weapon=high?((form.def??0)>=120?"Osmumten's fang":'Ghrazi rapier'):'Dragon sword';
    else {slots.Weapon=high&&!!form.size&&form.size>=3&&!m.shield?'Scythe of Vitur':high?'Blade of saeldor':'Abyssal whip';twoHanded=slots.Weapon==='Scythe of Vitur';}
    slots['Off-hand']=twoHanded?'None — two-handed weapon':high?'Avernic defender':'Dragon defender';
    slots.Hands=high?'Ferocious gloves':'Barrows gloves';slots.Feet=high?'Primordial boots':'Dragon boots';slots.Ring=high?'Ultor ring':'Berserker ring (i)';slots.Ammo='God blessing';
    if(/magical melee/i.test(form['attack style']||'')&&plan.defence==='tank'){
      slots.Body=high?'Masori body (f)':"Karil's leathertop";slots.Legs=high?'Masori chaps (f)':"Karil's leatherskirt";
      notes.push('Magical-melee attacks still use Protect from Melee, but defensive accuracy is affected by Magic defence. This tank example uses ranged armour.');
    }
    if(m.dragonfire&&attack==='stab')slots.Weapon=high?'Dragon hunter lance':'Zamorakian hasta';
  }else if(plan.family==='ranged'){
    slots.Neck=high?'Necklace of anguish':'Amulet of fury';slots.Cape=high?"Dizana's quiver":"Ava's accumulator";
    slots.Body=high?'Masori body (f)':"Blessed d'hide body";slots.Legs=high?'Masori chaps (f)':"Blessed d'hide chaps";
    slots.Hands=high?'Zaryte vambraces':'Barrows gloves';slots.Feet=high?'Pegasian boots':"Blessed d'hide boots";slots.Ring=high?'Venator ring':'Archers ring (i)';
    if(m.shield)attack='heavy';
    if(attack==='heavy'){
      slots.Weapon=high?(m.dragonfire?'Dragon hunter crossbow':'Zaryte crossbow'):'Dragon crossbow';
      slots['Off-hand']=high?'Twisted buckler':'Book of law';slots.Ammo=high?'Diamond dragon bolts (e)':'Diamond bolts (e)';
    }else if(attack==='light'){
      slots.Weapon='Toxic blowpipe';slots.Ammo=high?'Dragon darts and Zulrah scales':'Amethyst darts and Zulrah scales';twoHanded=true;
    }else{
      slots.Weapon=high?((form.mage??0)>=150?'Twisted bow':'Bow of faerdhinen'):'Magic shortbow (i)';
      slots.Ammo=high?(slots.Weapon==='Twisted bow'?'Dragon arrows':'Crystal armour and bow charges'):'Amethyst arrows';twoHanded=true;
      if(slots.Weapon==='Bow of faerdhinen'){slots.Body='Crystal body';slots.Legs='Crystal legs';notes.push('The Bow of faerdhinen example relies on its crystal armour synergy; do not replace the body/legs with Masori without changing the method.');}
    }
    if(twoHanded)slots['Off-hand']='None — two-handed weapon';
  }else{
    slots.Neck=high?'Occult necklace':'Amulet of glory';slots.Cape=high?'Imbued god cape':'God cape';
    slots.Body=high?'Ancestral robe top':"Ahrim's robetop";slots.Legs=high?'Ancestral robe bottom':"Ahrim's robeskirt";
    slots.Hands=high?'Tormented bracelet':'Barrows gloves';slots.Feet=high?'Eternal boots':'Mystic boots';slots.Ring=high?'Magus ring':'Seers ring (i)';slots.Ammo='God blessing';
    slots['Off-hand']=high?"Elidinis' ward (f)":"Book of darkness";
    const spell=elemental[attack];
    if(spell){slots.Weapon=high?'Harmonised nightmare staff':spell[0];slots.Spell=high?spell[2]:spell[1];notes.push('Use the displayed standard elemental spell to exploit the weakness. A powered trident or Shadow does not gain that elemental bonus.');}
    else if(attack==='barrage'){
      slots.Weapon=high?'Kodai wand':'Ancient staff';slots.Spell=high?'Ice Barrage':'Ice Burst';
      if(high){slots.Body='Virtus robe top';slots.Legs='Virtus robe bottom';}
      notes.push('Requires Ancient Magicks. Ice Burst needs 70 Magic; Ice Barrage needs 94 Magic. Only stack targets in a suitable multi-combat room.');
    }else if(attack==='dart'){slots.Weapon="Slayer's staff (e)";slots.Spell='Magic Dart';notes.push('Keep the enchanted staff charged; the creature’s special damage restriction overrides generic Magic upgrades.');}
    else if(attack==='godspell'){slots.Weapon=high?'Staff of the dead':'Zamorak staff';slots.Spell='Flames of Zamorak';}
    else{
      slots.Weapon=high?(m.magicDefenceTank||m.shield?'Sanguinesti staff':"Tumeken's shadow"):'Trident of the seas';
      if(slots.Weapon==="Tumeken's shadow"){twoHanded=true;slots['Off-hand']='None — two-handed weapon';}
      notes.push('Powered Magic is non-elemental. Level boosts can affect powered-staff damage; do not apply an elemental weakness multiplier.');
    }
    if(m.magicDefenceTank){slots.Body=high?'Masori body (f)':"Karil's leathertop";slots.Legs=high?'Masori chaps (f)':"Karil's leatherskirt";notes.push('This tank set trades Magic accuracy for Magic defence and sustain. An Ancestral/Shadow damage setup is a separate alternative, not a reason to use Protect from Magic at Kraken.');}
  }
  if(m.weapon&&plan.family===(m.family||'melee')){
    slots.Weapon=m.weapon[high?1:0];
    if(['Arclight','Emberlight','Blisterwood flail','Leaf-bladed sword','Leaf-bladed battleaxe','Trident of the seas','Trident of the swamp','Zamorak staff','Staff of the dead'].includes(slots.Weapon)){
      twoHanded=false;slots['Off-hand']=plan.family==='melee'?(high?'Avernic defender':'Dragon defender'):high?"Elidinis' ward (f)":'Book of darkness';
    }
    if(slots.Weapon==='Sunspear'){slots['Off-hand']='None in this spear example';twoHanded=true;}
    if(slots.Weapon.includes('Ogre')){twoHanded=true;slots['Off-hand']='None — two-handed weapon';slots.Ammo=record.id==='chompy-bird'?'Ogre arrows':'Rune brutal arrows';}
  }
  if(['turoth','kurask'].includes(record.id)&&plan.family==='melee')attack=high?'slash':'stab';
  if(['turoth','kurask'].includes(record.id)&&plan.family==='ranged')slots.Ammo=high?'Amethyst broad bolts':'Broad bolts';
  if(m.head&&!state.onTask)slots.Head=m.head;
  if(m.neck)slots.Neck=m.neck;
  if(m.shield){slots['Off-hand']=m.shield[high?1:0];twoHanded=false;}
  if(m.dragonfire&&plan.family==='melee')slots['Off-hand']=high?'Dragonfire shield':'Anti-dragon shield';
  if(m.boots)slots.Feet=m.boots;
  if(location&&/Karuulm/i.test(location.name)&&!m.boots){slots.Feet=high?'Boots of brimstone':'Boots of stone';notes.push('Protective Karuulm boots stay in both examples. Upgrade this slot only if the elite Kourend & Kebos diary removes the hazard.');}
  if(m.shayzien){
    for(const [slot,item]of Object.entries({Head:'Shayzien helm (5)',Body:'Shayzien body (5)',Legs:'Shayzien greaves (5)',Hands:'Shayzien gloves (5)',Feet:'Shayzien boots (5)'}))slots[slot]=item;
    slots.Weapon='Toxic blowpipe';slots.Ammo=high?'Dragon darts and Zulrah scales':'Amethyst darts and Zulrah scales';slots['Off-hand']='None — two-handed weapon';attack='light';
    notes.push('Full tier-5 armour is retained. A Slayer-helmet substitution assumes the hard Kourend & Kebos diary and must be checked separately.');
  }
  if(record.id==='lobstrosity')slots['Off-hand']='None — underwater restriction';
  if(location?.wilderness){
    notes.push('Wilderness risk-aware example: expensive body armour, jewellery and boots are downgraded. Weapon/helmet/charges can still be lost; do not assume any protected-item or anti-skull behaviour.');
    slots.Body=plan.family==='melee'?'Monk’s robe top':plan.family==='ranged'?"Black d'hide body":'Mystic robe top';
    slots.Legs=plan.family==='melee'?'Monk’s robe':plan.family==='ranged'?"Black d'hide chaps":'Mystic robe bottom';
    slots.Neck=m.neck||'Amulet of glory';slots.Feet=m.boots||'Climbing boots';slots.Ring='Ring of dueling';
    if(high&&!m.weapon&&!m.shield){slots.Weapon=plan.family==='melee'?'Ursine chainmace':plan.family==='ranged'?'Webweaver bow':'Accursed sceptre';attack=plan.family==='melee'?'crush':plan.family==='ranged'?'standard':'powered';slots['Off-hand']=plan.family==='melee'?'Dragon defender':plan.family==='magic'?'Book of darkness':'None — two-handed weapon';if(plan.family==='ranged')slots.Ammo='Revenant ether charges';}
  }
  if(twoHanded&&m.shield)throw Error('Prepared setup combines a required shield and two-handed weapon.');
  const order=['Head','Neck','Cape','Weapon','Off-hand','Body','Legs','Hands','Feet','Ring','Ammo','Spell'];
  const rows:GearSlot[]=order.filter(slot=>slots[slot]).map(slot=>({slot,item:slots[slot]}));
  let offence=offenceName(attack);
  if(attack==='vampyrebane')offence=high?'Vampyrebane · Sunspear’s selected melee style':'Vampyrebane · Crush (blisterwood flail)';
  return {tier,title:high?(location?.wilderness?'Max stats · risk-aware':'Max stats · high-end example'):'Mid-level · practical example',offence,slots:rows,notes,switches:m.switches?[m.switches[high?1:0]]:[]};
}

export function supplies(record:GuideRecord,form:GuideForm,plan:FightPlan,location?:LocationPlan):Supply[]{
  const list:Supply[]=[];
  const add=(item:string,purpose:string,kind:Supply['kind'],essential=false)=>list.push({item,purpose,kind,essential});
  const poison=(form.poisonous||'').toLowerCase();
  if(plan.mechanics.venom||poison.includes('venom'))add('Anti-venom+ or extended anti-venom+','Venom protection; keep it active for the encounter.','protection',true);
  else if(plan.mechanics.poison||/^yes/.test(poison))add('Antidote++ / antipoison','Prevent or cure the source-listed poison.','protection',true);
  if(plan.mechanics.dragonfire)add('Extended antifire','Use with the displayed protective shield. Duration and breath type matter; prayer alone is not a substitute.','protection',true);
  add('Prayer potions or super restores',record.id==='cerberus'?'High consumption: summoned souls drain Prayer even when blocked.':'If using protection or offensive prayers, bring restoration. Quantity depends on your stats, gear and trip length.','prayer');
  if(plan.family==='melee')add('Super combat potion / super attack + super strength','Offensive boost; use super defence when useful for tanking.','boost');
  if(plan.family==='ranged')add('Ranging potion','Ranged level boost.','boost');
  if(plan.family==='magic')add('Magic potion or an owned heart boost','Use boosts appropriate to the spell/staff. Fixed-spell damage does not always scale with a simple Magic-level boost.','boost');
  if(plan.mechanics.hybrid)add('Boosts for the secondary style','Bring the other style’s potion and weapon/armour switch.','boost');
  if(plan.mechanics.boss)add('Saradomin brews + super restores, or high-healing food','Choose a sustainable healing method; brews lower combat stats and require restoration.','utility');
  else add('Food and an escape teleport','Adjust quantity to the actual incoming damage and travel route.','utility');
  if(record.id==='zogre'||record.id==='skogre')add('Relicym’s balm or Sanfew serum','Disease treatment for the Zogre encounter.','protection',true);
  if(location&&/Neypotzli/i.test(location.name))add('Locally prepared moonlight potions/food','The local supply method can replace much of a standard potion inventory once unlocked.','utility');
  for(const tool of plan.mechanics.tools||[])add(tool,'Creature-specific kit; check the encounter note.','utility',true);
  return list;
}
