import arcanist from "../../../packages/data/src/classes/arcanist.json";
import barbarian from "../../../packages/data/src/classes/barbarian.json";
import fighter from "../../../packages/data/src/classes/fighter.json";
import rogue from "../../../packages/data/src/classes/rogue.json";
import human from "../../../packages/data/src/races/human.json";
import combatCasting from "../../../packages/data/src/feats/combat-casting.json";
import powerAttack from "../../../packages/data/src/feats/power-attack.json";
import exploits from "../../../packages/data/src/options/arcanist-exploits.json";
import ragePowers from "../../../packages/data/src/options/rage-powers.json";
import rogueTalents from "../../../packages/data/src/options/rogue-talents.json";
import mageArmor from "../../../packages/data/src/spells/mage-armor.json";
import magicMissile from "../../../packages/data/src/spells/magic-missile.json";

export const classes = [arcanist, barbarian, fighter, rogue];
export { human };
export const feats = [combatCasting, powerAttack];
export const optionGroups = [exploits, ragePowers, rogueTalents];
export const spells = [mageArmor, magicMissile];
export const skills = [{name:"Acrobatics",ability:"dexterity"},{name:"Climb",ability:"strength"},{name:"Diplomacy",ability:"charisma"},{name:"Knowledge (arcana)",ability:"intelligence"},{name:"Perception",ability:"wisdom"},{name:"Spellcraft",ability:"intelligence"},{name:"Stealth",ability:"dexterity"}] as const;
