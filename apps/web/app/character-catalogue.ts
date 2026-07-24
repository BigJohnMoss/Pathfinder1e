import generatedData from "../../../generated/pf1e-data.json";
import type { Prerequisite } from "../../../packages/engine/src/index.js";

export type CharacterFeat = {
  id: string;
  name: string;
  benefit: string;
  prerequisites: Prerequisite[];
  choice?: {
    key: string;
    label: string;
    options?: Array<{ id: string; name: string }>;
    allowCustom?: boolean;
  };
};

export type CharacterOption = {
  id: string;
  name: string;
  benefit: string;
  classIds: string[];
  minimumLevel: number;
  prerequisites: Prerequisite[];
};

export type CharacterOptionGroup = {
  id: string;
  name: string;
  options: CharacterOption[];
};

function orderedById<T extends { id: string }>(items: readonly T[], ids: readonly string[]) {
  const byId = new Map(items.map(item => [item.id, item]));
  return ids.flatMap(id => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

export const classes = orderedById(generatedData.classes, ["arcanist", "barbarian", "fighter", "monk", "rogue"]);
export const ancestries = orderedById(generatedData.races, ["human", "dwarf", "elf", "gnome", "half-elf", "halfling", "half-orc"]);
export const feats = [...generatedData.feats].sort((left, right) => left.name.localeCompare(right.name)) as unknown as CharacterFeat[];
export const optionGroups = orderedById(generatedData.optionGroups, ["arcanist-exploits", "rage-powers", "rogue-talents", "combat-feats", "fighter-weapon-groups"]) as unknown as CharacterOptionGroup[];
export const spells = generatedData.spells;

export const skills = [
  {name:"Acrobatics",ability:"dexterity"},{name:"Appraise",ability:"intelligence"},{name:"Bluff",ability:"charisma"},{name:"Climb",ability:"strength"},{name:"Craft",ability:"intelligence"},{name:"Diplomacy",ability:"charisma"},{name:"Disable Device",ability:"dexterity"},{name:"Disguise",ability:"charisma"},{name:"Escape Artist",ability:"dexterity"},{name:"Fly",ability:"dexterity"},{name:"Handle Animal",ability:"charisma"},{name:"Heal",ability:"wisdom"},{name:"Intimidate",ability:"charisma"},
  {name:"Knowledge (arcana)",ability:"intelligence"},{name:"Knowledge (dungeoneering)",ability:"intelligence"},{name:"Knowledge (engineering)",ability:"intelligence"},{name:"Knowledge (geography)",ability:"intelligence"},{name:"Knowledge (history)",ability:"intelligence"},{name:"Knowledge (local)",ability:"intelligence"},{name:"Knowledge (nature)",ability:"intelligence"},{name:"Knowledge (nobility)",ability:"intelligence"},{name:"Knowledge (planes)",ability:"intelligence"},{name:"Knowledge (religion)",ability:"intelligence"},{name:"Perform (dance)",ability:"charisma"},
  {name:"Linguistics",ability:"intelligence"},{name:"Perception",ability:"wisdom"},{name:"Perform",ability:"charisma"},{name:"Profession",ability:"wisdom"},{name:"Ride",ability:"dexterity"},{name:"Sense Motive",ability:"wisdom"},{name:"Sleight of Hand",ability:"dexterity"},{name:"Spellcraft",ability:"intelligence"},{name:"Stealth",ability:"dexterity"},{name:"Survival",ability:"wisdom"},{name:"Swim",ability:"strength"},{name:"Use Magic Device",ability:"charisma"}
] as const;
