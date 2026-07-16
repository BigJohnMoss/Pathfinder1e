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

export function abilityModifier(score: number): number;
export function baseAttackBonus(progression: BabProgression, level: number): number;
export function savingThrow(progression: SaveProgression, level: number): number;
export function featSlotsAtLevel(level: number, options?: { bonusFeats?: number }): number;
export function skillRanksThroughLevel(characterClass: CharacterClass, level: number, intelligenceScore: number, options?: { racialBonusPerLevel?: number }): number;
export function classProgression(characterClass: CharacterClass, level: number, options?: { intelligenceScore?: number; racialSkillBonusPerLevel?: number; bonusFeats?: number }): ClassProgression;
export function featuresAtLevel(characterClass: CharacterClass, level: number): CharacterClass["features"];
export function featuresThroughLevel(characterClass: CharacterClass, level: number): CharacterClass["features"];
export function availableOptions(group: { options: unknown[] }, classId: string, classLevel: number, selectedIds?: string[]): unknown[];
export function prerequisitesMet(prerequisites: unknown[], context: unknown): boolean;
