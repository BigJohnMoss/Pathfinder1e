import type { CharacterClass, CharacterOptionGroup } from "../../types/src/index.js";
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
};
