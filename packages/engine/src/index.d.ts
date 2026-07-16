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
export type Prerequisite =
  | { type: "level" | "bab" | "caster-level"; minimum: number }
  | { type: "class-level"; classId: string; minimum: number }
  | { type: "ability" | "skill"; key: string; minimum: number }
  | { type: "feat" | "feature"; id: string }
  | { type: "matching-choice"; featId: string; key: string }
  | { type: "any"; prerequisites: Exclude<Prerequisite, { type: "any" }>[] };
export interface PrerequisiteResult { prerequisite: Prerequisite; met: boolean }
export interface PrerequisiteContext { classId?: string; classLevel?: number; casterLevel?: number; abilities?: Partial<AbilityScores>; baseAttackBonus?: number; skillRanks?: Record<string, number>; selectedIds?: string[]; featureIds?: string[]; candidateId?: string; selectedFeatChoices?: Record<string, string> }

export function abilityModifier(score: number): number;
export const abilityNames: AbilityName[];
export function abilityModifiers(abilities: AbilityScores): AbilityScores;
export function characterCombatStats(characterClass: CharacterClass, level: number, abilities: AbilityScores): CharacterCombatStats;
export function averageHitPoints(hitDie: number, level: number, constitutionModifier?: number): number;
export function carryingCapacity(strength: number): { light: number; medium: number; heavy: number };
export function encumbrance(strength: number, items: Array<{ weight: number; quantity: number }>): { carriedWeight: number; capacity: { light: number; medium: number; heavy: number }; load: "light" | "medium" | "heavy" | "overloaded" };
export function spellsAvailableToClass<T extends { name: string; levelByClass: Record<string, number> }>(spells: T[], classId: string, maximumSpellLevel: number): T[];
export function normalizePreparedSpells<T extends { id: string; levelByClass: Record<string, number> }>(preparedSpellIds: string[], spells: T[], classId: string, preparedLimits: Array<{ level: number; count: number }>): string[];
export function normalizeSelectedFeats<T extends { id: string; prerequisites: Prerequisite[] }>(selectedFeatIds: string[], feats: T[], context: PrerequisiteContext, slotCount: number): string[];
export function normalizeSelectedFeatChoices<T extends { id: string; choice?: { options?: Array<{ id: string }>; allowCustom?: boolean } }>(selectedFeatChoices: Record<string, string> | null | undefined, selectedFeatIds: string[], feats: T[]): Record<string, string>;
export function normalizeSpellSlotUses(slotUses: Record<string, number> | null | undefined, slots: Array<{ level: number; count: number }>): Record<number, number>;
export function arcaneReservoir(level: number): { maximum: number; dailyRefresh: number };
export function bonusSpellsPerDay(abilityScore: number, maximumSpellLevel: number): Array<{ level: number; count: number }>;
export function spellSaveDC(abilityScore: number, spellLevel: number): number;
export function spellcastingProgression(characterClass: CharacterClass & { spellcasting?: { ability: string; castingType: string; slotsByLevel: number[][]; preparedByLevel: number[][] } }, level: number, options?: { abilityScore?: number }): { ability: string; castingType: string; maximumSpellLevel: number; slots: Array<{ level: number; base: number; bonus: number; count: number }>; prepared: Array<{ level: number; count: number }> } | null;
export function normalizeCharacterDraft(value: unknown, options?: { classIds?: string[] | null; ancestryIds?: string[] | null }): { version: 1; name: string; classId: string; ancestryId: string; level: number; humanAbility: AbilityName; baseAbilities: AbilityScores; selectedFeatIds: string[]; selectedFeatChoices: Record<string, string>; skillRanks: Record<string, number>; selectedOptions: Record<string, string>; preparedSpells: string[]; spellSlotUses: Record<string, number>; arcaneReservoir: number | null } | null;
export function baseAttackBonus(progression: BabProgression, level: number): number;
export function savingThrow(progression: SaveProgression, level: number): number;
export function featSlotsAtLevel(level: number, options?: { bonusFeats?: number }): number;
export function skillRanksThroughLevel(characterClass: CharacterClass, level: number, intelligenceScore: number, options?: { racialBonusPerLevel?: number }): number;
export function skillTotal(characterClass: CharacterClass, skill: { name: string }, abilityScore: number, ranks: number): { total: number; isClassSkill: boolean };
export function skillRankBudget(totalRanks: number, allocations: Record<string, number>): { allocated: number; remaining: number; overspent: number };
export function classProgression(characterClass: CharacterClass, level: number, options?: { intelligenceScore?: number; racialSkillBonusPerLevel?: number; bonusFeats?: number }): ClassProgression;
export function featuresAtLevel(characterClass: CharacterClass, level: number): CharacterClass["features"];
export function featuresThroughLevel(characterClass: CharacterClass, level: number): CharacterClass["features"];
export function availableOptions(group: { options: Array<{ id: string; name: string; benefit: string; classIds: string[]; minimumLevel: number; prerequisites: Prerequisite[] }> }, classId: string, classLevel: number, selectedIds?: string[], context?: PrerequisiteContext): Array<{ id: string; name: string; benefit: string; classIds: string[]; minimumLevel: number; prerequisites: Prerequisite[] }>;
export function featPrerequisiteResults(feat: { prerequisites: Prerequisite[] }, context: PrerequisiteContext): PrerequisiteResult[];
export function prerequisitesMet(prerequisites: Prerequisite[], context: PrerequisiteContext): boolean;
