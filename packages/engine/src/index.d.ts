export type BabProgression = "full" | "three-quarters" | "half";
export type SaveProgression = "good" | "poor";

export interface CharacterClass {
  babProgression: string;
  saves: Record<"fortitude" | "reflex" | "will", string>;
  skillRanksPerLevel: number;
  features: Array<{ id: string; level: number; name: string; summary: string; choiceRequired?: boolean; [key: string]: unknown }>;
}

export interface ClassProgression {
  level: number;
  baseAttackBonus: number;
  saves: Record<"fortitude" | "reflex" | "will", number>;
  skillRanks: number;
  featSlots: number;
  features: CharacterClass["features"];
}

export type AbilityName = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
export type AbilityScores = Record<AbilityName, number>;
export interface CharacterCombatStats {
  abilityModifiers: AbilityScores;
  baseAttackBonus: number;
  saves: Record<"fortitude" | "reflex" | "will", number>;
  initiative: number;
  armorClass: { normal: number; touch: number; flatFooted: number };
  combatManeuverBonus: number;
  combatManeuverDefense: number;
  averageHitPoints: number;
}
export interface PrerequisiteResult { prerequisite: { type: string; key?: string; id?: string; minimum?: number }; met: boolean }

export function abilityModifier(score: number): number;
export const abilityNames: AbilityName[];
export function abilityModifiers(abilities: AbilityScores): AbilityScores;
export function characterCombatStats(characterClass: CharacterClass, level: number, abilities: AbilityScores): CharacterCombatStats;
export function averageHitPoints(hitDie: number, level: number, constitutionModifier?: number): number;
export function baseAttackBonus(progression: BabProgression, level: number): number;
export function savingThrow(progression: SaveProgression, level: number): number;
export function featSlotsAtLevel(level: number, options?: { bonusFeats?: number }): number;
export function skillRanksThroughLevel(characterClass: CharacterClass, level: number, intelligenceScore: number, options?: { racialBonusPerLevel?: number }): number;
export function skillTotal(characterClass: CharacterClass, skill: { name: string }, abilityScore: number, ranks: number): { total: number; isClassSkill: boolean };
export function classProgression(characterClass: CharacterClass, level: number, options?: { intelligenceScore?: number; racialSkillBonusPerLevel?: number; bonusFeats?: number }): ClassProgression;
export function featuresAtLevel(characterClass: CharacterClass, level: number): CharacterClass["features"];
export function featuresThroughLevel(characterClass: CharacterClass, level: number): CharacterClass["features"];
export function availableOptions(group: { options: unknown[] }, classId: string, classLevel: number, selectedIds?: string[]): unknown[];
export function featPrerequisiteResults(feat: { prerequisites: PrerequisiteResult["prerequisite"][] }, context: { abilities?: Partial<AbilityScores>; baseAttackBonus?: number; classLevel?: number; selectedIds?: string[] }): PrerequisiteResult[];
export function prerequisitesMet(prerequisites: PrerequisiteResult["prerequisite"][], context: { abilities?: Partial<AbilityScores>; baseAttackBonus?: number; classLevel?: number; selectedIds?: string[] }): boolean;
