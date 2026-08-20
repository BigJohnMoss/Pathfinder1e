import type { CharacterArchetype, CharacterClass, PrecisionDamageAdjustment } from "../../types/src/index.js";

export function inferredArchetypePrecisionDamageDetails(archetype?: CharacterArchetype): { adjustments: PrecisionDamageAdjustment[]; fullyAutomatedFeatureIds: Set<string> };
export function inferArchetypePrecisionDamageAdjustments(archetype?: CharacterArchetype): PrecisionDamageAdjustment[];
export function precisionDamageAtLevel(adjustment: PrecisionDamageAdjustment, level: number): number;
export function characterPrecisionDamageRules(characterClasses: CharacterClass[], classLevels: Record<string, number>): Array<PrecisionDamageAdjustment & { id: string; source: string; dice: number }>;
