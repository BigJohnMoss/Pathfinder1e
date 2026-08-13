import type { AbilityName, AbilityScores, CharacterArchetype, CharacterClass as SharedCharacterClass, CharacterDraftV1, CharacterFeat, CharacterSpell, CharacterTrait, CompanionProgressionAdjustment } from "../../types/src/index.js";

export type BabProgression = "full" | "three-quarters" | "half";
export type SaveProgression = "good" | "poor";

export type CharacterClass = SharedCharacterClass;
export function adjustedCompanionLevel(level: number, adjustment: CompanionProgressionAdjustment): number;
export function archetypeCompanionEffectiveLevel(grant: NonNullable<CharacterArchetype["companionGrants"]>[number], classLevel: number, characterLevel?: number): number;
export function inferArchetypeCompanionGrants(archetype: CharacterArchetype): NonNullable<CharacterArchetype["companionGrants"]>;
export function resolvedArchetypeCompanionGrants(archetype: CharacterArchetype): NonNullable<CharacterArchetype["companionGrants"]>;
export { confirmCriticalThreat, parseCriticalThreatRange, parseDiceExpression, resolveAttackRoll, rollD20Check, rollDice, rollDiceExpression } from "./dice.js";

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
  | { type: "level"; minimum?: number; maximum?: number }
  | { type: "bab" | "caster-level"; minimum: number }
  | { type: "class-level"; classId: string; minimum: number }
  | { type: "spell-level"; minimum: number; castingType?: "prepared" | "spontaneous" }
  | { type: "ability" | "skill"; key: string; minimum: number }
  | { type: "save"; key: "fortitude" | "reflex" | "will"; minimum: number }
  | { type: "feat" | "feature" | "spell-access"; id: string }
  | { type: "rule"; description: string }
  | { type: "ancestry"; id: string }
  | { type: "size"; minimum?: "fine" | "diminutive" | "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan" | "colossal"; maximum?: "fine" | "diminutive" | "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan" | "colossal" }
  | { type: "matching-choice"; featId: string; key: string }
  | { type: "choice-value"; featId: string; key: string; value: string }
  | { type: "any"; prerequisites: Exclude<Prerequisite, { type: "any" }>[] };
export interface PrerequisiteResult { prerequisite: Prerequisite; met: boolean }
export interface PrerequisiteContext { classId?: string; classLevels?: Record<string, number>; ancestryId?: string; size?: string; classLevel?: number; acquisitionLevel?: number; casterLevel?: number; spellLevels?: Partial<Record<"prepared" | "spontaneous", number>>; abilities?: Partial<AbilityScores>; baseAttackBonus?: number; saves?: Partial<Record<"fortitude" | "reflex" | "will", number>>; skillRanks?: Record<string, number>; selectedIds?: string[]; featureIds?: string[]; spellIds?: string[]; candidateId?: string; selectedFeatChoices?: Record<string, string> }

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
export function archetypeConditionalModifiers(archetypes: CharacterArchetype[], classLevels: Record<string, number>): Array<{ label: string; bonus: number; condition: string; source: string }>;
export function archetypeAbilityScoreBonuses(archetypes: CharacterArchetype[], classLevels: Record<string, number>): AbilityScores;
export function archetypeAbilityScoreAdjustments(archetype: CharacterArchetype): NonNullable<CharacterArchetype["abilityScoreAdjustments"]>;
export function inferArchetypeAbilityScoreAdjustments(archetype: CharacterArchetype): NonNullable<CharacterArchetype["abilityScoreAdjustments"]>;
export function inferArchetypeSpellcastingProgression(archetype: CharacterArchetype): { classId: string; minimumLevel: number; spellListClassId?: string } | undefined;
export function archetypeInitiativeBonus(archetypes: CharacterArchetype[], classLevels: Record<string, number>): number;
export function archetypeInitiativeBonusAdjustments(archetype: CharacterArchetype): NonNullable<CharacterArchetype["conditionalModifiers"]>;
export function inferArchetypeInitiativeBonusAdjustments(archetype: CharacterArchetype): NonNullable<CharacterArchetype["conditionalModifiers"]>;
export function archetypeSavingThrowBonuses(archetypes: CharacterArchetype[], classLevels: Record<string, number>): Record<"fortitude" | "reflex" | "will", number>;
export function archetypeSaveBonusAdjustments(archetype: CharacterArchetype): Array<NonNullable<CharacterArchetype["conditionalModifiers"]>[number] & { saveTargets: Array<"fortitude" | "reflex" | "will"> }>;
export function inferArchetypeSaveBonusAdjustments(archetype: CharacterArchetype): Array<NonNullable<CharacterArchetype["conditionalModifiers"]>[number] & { saveTargets: Array<"fortitude" | "reflex" | "will"> }>;
export function archetypeCombatBonuses(archetypes: CharacterArchetype[], classLevels: Record<string, number>): { attackRolls: number; damageRolls: number; armorClass: Record<"normal" | "touch" | "flatFooted", number>; combatManeuverBonus: number; combatManeuverDefense: number };
export function archetypeCombatModifierAdjustments(archetype: CharacterArchetype): Array<NonNullable<CharacterArchetype["conditionalModifiers"]>[number] & { combatTargets: Array<"attackRolls" | "damageRolls" | "armorClass" | "cmb" | "cmd">; bonusType?: string; armorClassParts?: Array<"normal" | "touch" | "flatFooted"> }>;
export function inferArchetypeCombatModifierAdjustments(archetype: CharacterArchetype): Array<NonNullable<CharacterArchetype["conditionalModifiers"]>[number] & { combatTargets: Array<"attackRolls" | "damageRolls" | "armorClass" | "cmb" | "cmd">; bonusType?: string; armorClassParts?: Array<"normal" | "touch" | "flatFooted"> }>;
export function archetypeSenses(archetypes: CharacterArchetype[], classLevels: Record<string, number>): Array<{ sense: "darkvision" | "low-light-vision" | "scent" | "blindsense" | "blindsight" | "tremorsense"; label: string; operation: "grant" | "increase"; range?: number; condition?: string; source: string }>;
export function archetypeSenseAdjustments(archetype: CharacterArchetype): Array<{ sourceFeatureId: string; sense: "darkvision" | "low-light-vision" | "scent" | "blindsense" | "blindsight" | "tremorsense"; label: string; operation: "grant" | "increase"; minimumLevel: number; range?: number; rangeByLevel?: Array<{ level: number; range: number }>; condition?: string }>;
export function inferArchetypeSenseAdjustments(archetype: CharacterArchetype): ReturnType<typeof archetypeSenseAdjustments>;
export function archetypeLandSpeedAdjustments(archetype: CharacterArchetype): NonNullable<CharacterArchetype["landSpeedAdjustments"]>;
export function inferArchetypeLandSpeedAdjustments(archetype: CharacterArchetype): NonNullable<CharacterArchetype["landSpeedAdjustments"]>;
export function archetypeDefenseAdjustments(archetype: CharacterArchetype): NonNullable<CharacterArchetype["defenseAdjustments"]>;
export function inferArchetypeDefenseAdjustments(archetype: CharacterArchetype): NonNullable<CharacterArchetype["defenseAdjustments"]>;
export function archetypeDefenses(archetypes: CharacterArchetype[], classLevels: Record<string, number>): Array<NonNullable<CharacterArchetype["defenseAdjustments"]>[number] & { value: number; source: string }>;
export function inferArchetypeSkillCheckRules(archetype: CharacterArchetype): NonNullable<CharacterArchetype["skillCheckRules"]>;
export function archetypeSkillCheckRules(archetypes: CharacterArchetype[], classLevels: Record<string, number>): Array<NonNullable<CharacterArchetype["skillCheckRules"]>[number] & { source: string }>;
export function archetypeSkillBonuses(archetypes: CharacterArchetype[], classLevels: Record<string, number>): { skillBonuses: Record<string, number>; conditionalModifiers: Array<{ label: string; bonus: number; condition: string; source: string }> };
export function inferArchetypeSkillAbilityOverrides(archetype: CharacterArchetype): NonNullable<CharacterArchetype["skillAbilityOverrides"]>;
export function archetypeSkillAbilityOverrides(archetype: CharacterArchetype): NonNullable<CharacterArchetype["skillAbilityOverrides"]>;
export function effectiveArchetypeSkillAbility(archetypes: CharacterArchetype[], classLevels: Record<string, number>, skill: string, defaultAbility: AbilityName): AbilityName;
export function inferArchetypeSkillBonusAdjustments(archetype: CharacterArchetype): NonNullable<CharacterArchetype["skillBonusAdjustments"]>;
export function archetypeSkillBonusAdjustments(archetype: CharacterArchetype): NonNullable<CharacterArchetype["skillBonusAdjustments"]>;
export function characterLandSpeed(baseSpeed: number, armorCategory: "none" | "light" | "medium" | "heavy", load: "light" | "medium" | "heavy" | "overloaded", archetypes: CharacterArchetype[], classLevels: Record<string, number>): { speed: number; baseSpeed: number; armorCategory: string; load: string; adjustments: Array<{ label: string; bonus: number; source: string }> };
export function spellsAvailableToClass<T extends { id: string; name: string; levelByClass: Record<string, number> }>(spells: T[], classId: string, maximumSpellLevel: number, spellListAdditions?: Record<string, number>, spellListExclusions?: string[]): T[];
export function normalizePreparedSpells<T extends { id: string; levelByClass: Record<string, number> }>(preparedSpellIds: string[], spells: T[], classId: string, preparedLimits: Array<{ level: number; count: number }>): string[];
export function normalizeSelectedFeats<T extends { id: string; prerequisites: Prerequisite[]; repeatable?: boolean }>(selectedFeatIds: string[], feats: T[], context: PrerequisiteContext, slotCount: number, slotLevels?: number[], repeatableFeatIds?: string[]): string[];
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
export function isTransmutationSpell(spell: Pick<CharacterSpell, "school" | "schools">): boolean;
export function spellHasSchool(spell: Pick<CharacterSpell, "school" | "schools">, school: string): boolean;
export function spellHasDescriptor(spell: Pick<CharacterSpell, "descriptors">, descriptor: string): boolean;
export function isPersonalRangeSpell(spell: Pick<CharacterSpell, "range">): boolean;
export function extendedSpellDuration(duration?: string | null): string | null;
export function arcaneReservoir(level: number): { maximum: number; dailyRefresh: number };
export { bardicPerformanceRounds } from "./bardic-performance.js";
export { druidWildShapeUses } from "./druid-wild-shape.js";
export { apgClassResourceMaximums, applyArchetypeResourceAdjustments, normalizeClassResourceUses, normalizeClassResourcesByClass } from "./apg-class-resources.js";
export { eidolonEvolutionPool, eidolonProgression, eidolonBaseForm, validateEidolonEvolutions } from "./eidolon.js";
export { drakeCompanionProgression } from "./drake.js";
export { animalCompanionProgression, familiarProgression, normalizeCompanionState } from "./companions.js";
export { witchPatronSpells } from "./witch-patrons.js";
export { preparedSourceSpellCapacity, normalizePreparedSourceSpells, preparedSourceAvailableSpells } from "./prepared-source-spells.js";
export function bonusSpellsPerDay(abilityScore: number, maximumSpellLevel: number): Array<{ level: number; count: number }>;
export function spellSaveDC(abilityScore: number, spellLevel: number): number;
export function spellcastingProgression(characterClass: CharacterClass & { spellcasting?: { ability: string; castingType: string; slotsByLevel: number[][]; preparedByLevel?: number[][]; spellLevelUnlocks?: number[]; preparesFromSlots?: boolean } }, level: number, options?: { abilityScore?: number }): { ability: string; castingType: string; maximumSpellLevel: number; slots: Array<{ level: number; base: number; bonus: number; count: number }>; prepared: Array<{ level: number; count: number }> } | null;
export function normalizeCharacterDraft(value: unknown, options?: { classIds?: string[] | null; ancestryIds?: string[] | null; archetypeIds?: string[] | null; archetypeIdsByClass?: Record<string, string[]> | null }): CharacterDraftV1 | null;
export function applyArchetype(characterClass: CharacterClass, archetype?: CharacterArchetype, referenceClasses?: CharacterClass[], spellCatalog?: CharacterSpell[]): CharacterClass;
export function inferArchetypeReplacementFeatureIds(characterClass: CharacterClass, archetype?: CharacterArchetype): string[];
export function inferArchetypeSpellAdditions(archetype?: CharacterArchetype, spells?: CharacterSpell[]): { spellListAdditions: Record<string, number>; bonusSpellAdditions: Record<string, number>; spellGrants: NonNullable<CharacterArchetype["spellGrants"]> };
export function inferArchetypeSpellAccess(archetype?: CharacterArchetype, spells?: CharacterSpell[]): { spellListAdditions: Record<string, number>; spellListExclusions: string[] };
export function inferredArchetypeSpellAccessDetails(archetype?: CharacterArchetype, spells?: CharacterSpell[]): { spellListAdditions: Record<string, number>; spellListExclusions: string[]; sourceFeatureIds: Set<string>; fullyAutomatedFeatureIds: Set<string>; sentenceCoverage: Array<{ sourceFeatureId: string; sentenceIndex: number }> };
export function inferArchetypeSpellModifiers(archetype?: CharacterArchetype, spells?: CharacterSpell[]): NonNullable<CharacterArchetype["spellModifierAdjustments"]>;
export function inferredArchetypeSpellModifierDetails(archetype?: CharacterArchetype, spells?: CharacterSpell[]): { adjustments: NonNullable<CharacterArchetype["spellModifierAdjustments"]>; sentenceCoverage: Array<{ sourceFeatureId: string; sentenceIndex: number }>; fullyAutomatedFeatureIds: Set<string> };
export function archetypeSpellModifiers(characterClass: CharacterClass, classLevel: number, spell: CharacterSpell): { casterLevel: number; saveDc: number; concentration: number; sources: string[] };
export function inferArchetypeWildEmpathyAdjustments(archetype?: CharacterArchetype): NonNullable<CharacterArchetype["wildEmpathyAdjustments"]>;
export function inferredArchetypeWildEmpathyDetails(archetype?: CharacterArchetype): { adjustments: NonNullable<CharacterArchetype["wildEmpathyAdjustments"]>; sentenceCoverage: Array<{ sourceFeatureId: string; sentenceIndex: number }>; fullyAutomatedFeatureIds: Set<string> };
export function archetypeWildEmpathyChecks(characterClasses?: CharacterClass[], classLevels?: Record<string, number>, abilityModifiers?: Partial<Record<AbilityName, number>>, skillTotals?: Record<string, number>): Array<{ id: string; name: string; modifier: number; description: string }>;
export function inferArchetypeClassSkillChanges(archetype?: CharacterArchetype): { additions: string[]; removals: string[] };
export function inferArchetypeProficiencyAdjustments(archetype?: CharacterArchetype): Array<{ category: "weapon" | "armor" | "shield"; operation: "add" | "remove" | "replace"; proficiencies: string[] }>;
export function inferArchetypeSkillRankAdjustment(archetype?: CharacterArchetype): { operation: "add" | "replace"; value: number } | undefined;
export function inferArchetypeResourceAdjustments(archetype?: CharacterArchetype): Array<{ resourceId: string; label: string; unit: string; operation: "replace"; minimumLevel: number; base: number; perInterval?: number; interval?: number; levelDivisor?: number; levelMultiplier?: number; abilityModifier?: AbilityName; abilityMultiplier?: number; minimum?: number; maximum?: number; maximumByLevel?: Array<{ level: number; maximum: number }> }>;
export function resolvedArchetypeResourceAdjustments(archetype?: CharacterArchetype): NonNullable<CharacterArchetype["resourceAdjustments"]>;
export function inferArchetypeTemporaryHitPointActions(archetype?: CharacterArchetype): Array<{ sourceFeatureId: string; action: NonNullable<CharacterClass["features"][number]["resourceActions"]>[number] }>;
export function inferArchetypeRerollActions(archetype?: CharacterArchetype): Array<{ sourceFeatureId: string; action: NonNullable<CharacterClass["features"][number]["resourceActions"]>[number] }>;
export function inferArchetypeSpellLikeAbilityActions(archetype?: CharacterArchetype): Array<{ sourceFeatureId: string; action: NonNullable<CharacterClass["features"][number]["resourceActions"]>[number] }>;
export function inferArchetypeResourceSpellActions(archetype?: CharacterArchetype): Array<{ sourceFeatureId: string; action: NonNullable<CharacterClass["features"][number]["resourceActions"]>[number] }>;
export function inferArchetypeResourceActions(archetype?: CharacterArchetype, excludedFeatureIds?: Set<string>): Array<{ sourceFeatureId: string; action: NonNullable<CharacterClass["features"][number]["resourceActions"]>[number] }>;
export function inferArchetypeTimedEffectActions(archetype?: CharacterArchetype): Array<{ sourceFeatureId: string; action: NonNullable<CharacterClass["features"][number]["resourceActions"]>[number] }>;
export function inferArchetypeChannelEnergyActions(archetype?: CharacterArchetype): Array<{ sourceFeatureId: string; action: NonNullable<CharacterClass["features"][number]["resourceActions"]>[number] }>;
export function inferArchetypeSpellcastingAbility(archetype?: CharacterArchetype): "intelligence" | "wisdom" | "charisma" | undefined;
export function inferArchetypeGrantedFeats(archetype: CharacterArchetype, feats: CharacterFeat[]): Array<{ featureId: string; featId: string; level: number }>;
export function inferArchetypeFeatChoices(archetype: CharacterArchetype, feats: CharacterFeat[], maximumLevel?: number): Array<CharacterClass["features"][number] & { classId: string }>;
export function inferArchetypeFeatAlternatives(archetype: CharacterArchetype, feats: CharacterFeat[]): Array<{ sourceFeatureId: string; optionGroupId: string; minimumLevel: number; mode: "augment" | "replace"; ignoreFeatPrerequisites: boolean; featChoiceIds?: string[]; featChoiceTypes?: string[] }>;
export function archetypeConflictReasons(left?: CharacterArchetype, right?: CharacterArchetype, characterClass?: CharacterClass): string[];
export function compatibleArchetypes(selected: CharacterArchetype[], candidate: CharacterArchetype, characterClass?: CharacterClass): boolean;
export function archetypeEligibilityIssues(archetype?: CharacterArchetype, context?: Record<string, unknown>): string[];
export function applyArchetypes(characterClass: CharacterClass, archetypes?: CharacterArchetype[], referenceClasses?: CharacterClass[], spellCatalog?: CharacterSpell[]): CharacterClass;
export function archetypeAutomationSummary(archetype?: CharacterArchetype, feats?: CharacterFeat[], spells?: CharacterSpell[]): { automated: string[]; manual: string[] };
export function baseAttackBonus(progression: BabProgression, level: number): number;
export function savingThrow(progression: SaveProgression, level: number): number;
export function classBaseAttackBonus(characterClass: CharacterClass, level: number): number;
export function classSavingThrow(characterClass: CharacterClass, save: "fortitude" | "reflex" | "will", level: number): number;
export function spellcastingTradition(characterClass: CharacterClass): "arcane" | "divine" | null;
export function effectiveSpellcastingLevels(classes: CharacterClass[], classLevels: Array<{ classId: string; level: number }>, prestigeTargets?: Record<string, string[]>): Record<string, number>;
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
