import type { CharacterClass, CharacterOptionGroup, CharacterSpell } from "../../types/src/index.js";
import type { archetypeSenses } from "./index.js";

export function oracleCurseBenefits(
  characterClasses: CharacterClass[],
  classLevels: Record<string, number>,
  selections: Record<string, string>,
  optionGroups: CharacterOptionGroup[],
): {
  senses: ReturnType<typeof archetypeSenses>;
  defenses: Array<{ kind: "immunity" | "uncannyDodge" | "improvedUncannyDodge"; qualifier: string; value: number; source: string; condition?: string }>;
  conditionalModifiers: Array<{ label: string; bonus: number; condition: string; source: string }>;
  initiative: number;
  lame: number;
  charismaSkillPenalty: number;
  hauntedSpellAdditions: Record<string, number>;
};

export function hauntedCurseSpells<T extends Pick<CharacterSpell, "id" | "levelByClass">>(
  catalogue: T[],
  additions: Record<string, number> | undefined,
  classId: string,
  maximumSpellLevel: number,
): Array<T & { bonusSpellSource: string }>;
