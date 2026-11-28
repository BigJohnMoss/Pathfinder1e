import type { CharacterClass, CharacterSpell } from "../../types/src/index.js";

export function oracleCureInflictSpells(
  eligibleSpells: CharacterSpell[],
  characterClass: CharacterClass | undefined,
  selectedOptions: Record<string, string>,
): CharacterSpell[];
