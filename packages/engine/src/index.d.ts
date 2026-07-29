import type { CharacterArchetype, CharacterClass as SharedCharacterClass, CharacterDraftV1, CharacterFeat, CharacterTrait } from "../../types/src/index.js";

export type BabProgression = "full" | "three-quarters" | "half";
export type SaveProgression = "good" | "poor";

export type CharacterClass = SharedCharacterClass;

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
export type Prerequisite =
  | { type: "level" | "bab" | "caster-level"; minimum: number }
  | { type: "class-level"; classId: string; minimum: number }
  | { type: "ability" | "skill"; key: string; minimum: number }
  | { type: "feat" | "feature"; id: string }
  | { type: "ancestry"; id: string }
  | { type: "size"; minimum?: "fine" | "diminutive" | "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan" | "colossal"; maximum?: "fine" | "diminutive" | "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan" | "colossal" }
  | { type: "matching-choice"; featId: string; key: string }
  | { type: "choice-value"; featId: string; key: string; value: string }
  | { type: "any"; prerequisites: Exclude<Prerequisite, { type: "any" }>[] };
export interface PrerequisiteResult { prerequisite: Prerequisite; met: boolean }
export interface PrerequisiteContext { classId?: string; classLevels?: Record<string, number>; ancestryId?: string; size?: string; classLevel?: number; casterLevel?: number; abilities?: Partial<AbilityScores>; baseAttackBonus?: number; skillRanks?: Record<string, number>; selectedIds?: string[]; featureIds?: string[]; candidateId?: string; selectedFeatChoices?: Record<string, string> }

export function abilityModifier(score: number): number;
export const abilityNames: AbilityName[];
export function abilityScorePointCost(score: number): number;
export function pointBuySummary(abilities: AbilityScores, budget?: 10 | 15 | 20 | 25): { budget: number; spent: number; remaining: number; valid: boolean };
export function abilityBoostCount(level: number): number;
export function normalizeAbilityBoosts(boosts: unknown, level: number): AbilityName[];
export function abilityModifiers(abilities: AbilityScores): AbilityScores;
export function characterCombatStats(characterClass: CharacterClass, level: number, abilities: AbilityScores): CharacterCombatStats;
export function averageHitPoints(hitDie: number, level: number, constitutionModifier?: number): number;
export function multiclassAverageHitPoints(classes: CharacterClass[], classLevels: Array<{ classId: string; level: number }>, constitutionModifier?: number): number;
export function carryingCapacity(strength: number): { light: number; medium: number; heavy: number };
export function encumbrance(strength: number, items: Array<{ weight: number; quantity: number }>): { carriedWeight: number; capacity: { light: number; medium: number; heavy: number }; load: "light" | "medium" | "heavy" | "overloaded" };
export function spellsAvailableToClass<T extends { id: string; name: string; levelByClass: Record<string, number> }>(spells: T[], classId: string, maximumSpellLevel: number, spellListAdditions?: Record<string, number>): T[];
export function normalizePreparedSpells<T extends { id: string; levelByClass: Record<string, number> }>(preparedSpellIds: string[], spells: T[], classId: string, preparedLimits: Array<{ level: number; count: number }>): string[];
export function normalizeSelectedFeats<T extends { id: string; prerequisites: Prerequisite[] }>(selectedFeatIds: string[], feats: T[], context: PrerequisiteContext, slotCount: number): string[];
export function normalizeSelectedFeatChoices<T extends { id: string; choice?: { options?: Array<{ id: string }>; allowCustom?: boolean } }>(selectedFeatChoices: Record<string, string> | null | undefined, selectedFeatIds: string[], feats: T[]): Record<string, string>;
export function normalizeSelectedTraits(selectedTraitIds: unknown, traits: CharacterTrait[], slotCount?: number): string[];
export function normalizeSelectedAlternateRacialTraits(selectedIds: string[], alternateTraits?: Array<{ id: string; replaces: string[] }>): string[];
export function normalizeSelectedTraitChoices(selectedTraitChoices: unknown, selectedTraitIds: string[], traits: CharacterTrait[], sources?: { spells?: Array<{ id: string; levelByClass?: Record<string, number> }>; classes?: Array<{ id: string }>; classId?: string }): Record<string, string>;
export function traitBonuses(selectedTraitIds: string[], traits: CharacterTrait[], selectedTraitChoices?: Record<string, string>, sources?: { spells?: Array<{ id: string; name?: string; levelByClass?: Record<string, number> }>; classes?: Array<{ id: string }>; classId?: string }): { initiative: number; saves: Record<"fortitude" | "reflex" | "will", number>; skillBonuses: Record<string, number>; classSkills: string[]; conditionalModifiers?: Array<{ label: string; bonus?: number; condition: string; source: string }>; spellBonuses?: Record<string, { casterLevel: number; metamagicLevelAdjustment: number }> };
export type MechanicalBonusSource = { source: string; target: string; bonus: number; choice?: string };
export function featBonuses(selectedFeatIds: string[], feats: CharacterFeat[], selectedFeatChoices?: Record<string, string>, context?: { level?: number; skillRanks?: Record<string, number> }): {
  initiative: number;
  saves: Record<"fortitude" | "reflex" | "will", number>;
  armorClass: Record<"normal" | "touch" | "flatFooted", number>;
  hitPoints: number;
  skillBonuses: Record<string, number>;
  weaponBonuses: Record<string, { attack: number; damage: number }>;
  sources: MechanicalBonusSource[];
};
export function normalizeSpellSlotUses(slotUses: Record<string, number> | null | undefined, slots: Array<{ level: number; count: number }>): Record<number, number>;
export function arcaneReservoir(level: number): { maximum: number; dailyRefresh: number };
export { bardicPerformanceRounds } from "./bardic-performance.js";
export { druidWildShapeUses } from "./druid-wild-shape.js";
export function bonusSpellsPerDay(abilityScore: number, maximumSpellLevel: number): Array<{ level: number; count: number }>;
export function spellSaveDC(abilityScore: number, spellLevel: number): number;
export function spellcastingProgression(characterClass: CharacterClass & { spellcasting?: { ability: string; castingType: string; slotsByLevel: number[][]; preparedByLevel?: number[][]; spellLevelUnlocks?: number[]; preparesFromSlots?: boolean } }, level: number, options?: { abilityScore?: number }): { ability: string; castingType: string; maximumSpellLevel: number; slots: Array<{ level: number; base: number; bonus: number; count: number }>; prepared: Array<{ level: number; count: number }> } | null;
export function normalizeCharacterDraft(value: unknown, options?: { classIds?: string[] | null; ancestryIds?: string[] | null; archetypeIds?: string[] | null; archetypeIdsByClass?: Record<string, string[]> | null }): CharacterDraftV1 | null;
export function applyArchetype(characterClass: CharacterClass, archetype?: CharacterArchetype): CharacterClass;
export function baseAttackBonus(progression: BabProgression, level: number): number;
export function savingThrow(progression: SaveProgression, level: number): number;
export function featSlotsAtLevel(level: number, options?: { bonusFeats?: number }): number;
export function skillRanksThroughLevel(characterClass: CharacterClass, level: number, intelligenceScore: number, options?: { racialBonusPerLevel?: number }): number;
export function skillTotal(characterClass: CharacterClass, skill: { name: string }, abilityScore: number, ranks: number): { total: number; isClassSkill: boolean };
export function skillRankBudget(totalRanks: number, allocations: Record<string, number>): { allocated: number; remaining: number; overspent: number };
export function normalizeSkillRanks(allocations: Record<string, number> | null | undefined, totalRanks: number, maximumRanksPerSkill: number): Record<string, number>;
export function classProgression(characterClass: CharacterClass, level: number, options?: { intelligenceScore?: number; racialSkillBonusPerLevel?: number; bonusFeats?: number }): ClassProgression;
export function multiclassProgression(
  classes: CharacterClass[],
  classLevels: Array<{ classId: string; level: number }>,
  options?: { intelligenceScore?: number; racialSkillBonusPerLevel?: number; bonusFeats?: number }
): ClassProgression & {
  classLevels: Array<{ classId: string; className: string; level: number }>;
  features: Array<CharacterClass["features"][number] & { classId: string; className: string; classLevel: number }>;
};
export function featuresAtLevel(characterClass: CharacterClass, level: number): CharacterClass["features"];
export function featuresThroughLevel(characterClass: CharacterClass, level: number): CharacterClass["features"];
export function availableOptions(group: { options: Array<{ id: string; name: string; benefit: string; classIds: string[]; minimumLevel: number; prerequisites: Prerequisite[] }> }, classId: string, classLevel: number, selectedIds?: string[], context?: PrerequisiteContext): Array<{ id: string; name: string; benefit: string; classIds: string[]; minimumLevel: number; prerequisites: Prerequisite[] }>;
export function featPrerequisiteResults(feat: { prerequisites: Prerequisite[] }, context: PrerequisiteContext): PrerequisiteResult[];
export function prerequisitesMet(prerequisites: Prerequisite[], context: PrerequisiteContext): boolean;
