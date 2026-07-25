import generatedData from "../../../generated/pf1e-data.mjs";
import type { CharacterAncestry, CharacterClass, CharacterFeat, CharacterOptionGroup, CharacterSpell } from "../../../packages/types/src/index.js";
export type { CharacterFeat, CharacterOption, CharacterOptionGroup, CharacterSpell } from "../../../packages/types/src/index.js";

function orderedById<T extends { id: string }>(items: readonly T[], ids: readonly string[]) {
  const byId = new Map(items.map(item => [item.id, item]));
  return ids.flatMap(id => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

export const classes = orderedById<CharacterClass>(generatedData.classes, ["arcanist", "barbarian", "cleric", "fighter", "monk", "rogue", "sorcerer", "wizard"]);
export const ancestries = orderedById<CharacterAncestry>(generatedData.races, ["human", "dwarf", "elf", "gnome", "half-elf", "halfling", "half-orc"]);
export const feats = [...generatedData.feats].sort((left, right) => left.name.localeCompare(right.name));
export const optionGroups = orderedById<CharacterOptionGroup>(generatedData.optionGroups, ["arcanist-exploits", "rage-powers", "cleric-deities", "cleric-alignments", "cleric-channel-energy", "cleric-domains", "sorcerer-bloodlines", "wizard-arcane-bonds", "wizard-familiars", "wizard-bonded-objects", "wizard-schools", "wizard-opposition-schools", "rogue-talents", "combat-feats", "fighter-weapon-groups"]);
export const spells = generatedData.spells;

export const skills = [
  {name:"Acrobatics",ability:"dexterity"},{name:"Appraise",ability:"intelligence"},{name:"Bluff",ability:"charisma"},{name:"Climb",ability:"strength"},{name:"Craft",ability:"intelligence"},{name:"Diplomacy",ability:"charisma"},{name:"Disable Device",ability:"dexterity"},{name:"Disguise",ability:"charisma"},{name:"Escape Artist",ability:"dexterity"},{name:"Fly",ability:"dexterity"},{name:"Handle Animal",ability:"charisma"},{name:"Heal",ability:"wisdom"},{name:"Intimidate",ability:"charisma"},
  {name:"Knowledge (arcana)",ability:"intelligence"},{name:"Knowledge (dungeoneering)",ability:"intelligence"},{name:"Knowledge (engineering)",ability:"intelligence"},{name:"Knowledge (geography)",ability:"intelligence"},{name:"Knowledge (history)",ability:"intelligence"},{name:"Knowledge (local)",ability:"intelligence"},{name:"Knowledge (nature)",ability:"intelligence"},{name:"Knowledge (nobility)",ability:"intelligence"},{name:"Knowledge (planes)",ability:"intelligence"},{name:"Knowledge (religion)",ability:"intelligence"},{name:"Perform (dance)",ability:"charisma"},
  {name:"Linguistics",ability:"intelligence"},{name:"Perception",ability:"wisdom"},{name:"Perform",ability:"charisma"},{name:"Profession",ability:"wisdom"},{name:"Ride",ability:"dexterity"},{name:"Sense Motive",ability:"wisdom"},{name:"Sleight of Hand",ability:"dexterity"},{name:"Spellcraft",ability:"intelligence"},{name:"Stealth",ability:"dexterity"},{name:"Survival",ability:"wisdom"},{name:"Swim",ability:"strength"},{name:"Use Magic Device",ability:"charisma"}
] as const;
