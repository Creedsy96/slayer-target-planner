// GPL-3.0: thin export surface around the unchanged pinned OSRS Wiki engine.
export {default as Calc} from './source/src/lib/PlayerVsNPCCalc';
export {noStatExceptions,availableEquipment as equipment,calculateEquipmentBonusesFromGear as bonuses,calculateAttackSpeed as speed,ammoApplicability,AmmoApplicability,getCanonicalItemId as canonicalId} from './source/src/lib/Equipment';
export {getMonsters as monsters,INITIAL_MONSTER_INPUTS as monsterInputs} from './source/src/lib/Monsters';
export {getCombatStylesForCategory as styles} from './source/src/utils';
export {spells} from './source/src/types/Spell';
export {PotionMap} from './source/src/utils';
export {Prayer} from './source/src/enums/Prayer';
export {BurnImmunity} from './source/src/types/Monster';
export {IMMUNE_TO_BURN_DAMAGE_NPC_IDS as burnImmuneIds} from './source/src/lib/constants';
