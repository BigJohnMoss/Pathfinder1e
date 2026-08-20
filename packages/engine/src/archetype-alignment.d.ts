import type { Alignment, CharacterArchetype } from "../../types/src/index.js";
export const characterAlignments: Alignment[];
export function characterAlignmentLabel(alignment: string): string;
export function inferArchetypeAllowedAlignments(archetype?: CharacterArchetype): Alignment[];
export function inferredArchetypeAlignmentDetails(archetype?: CharacterArchetype): { rules: Array<{ sourceFeatureId: string; allowedAlignments: Alignment[] }>; fullyAutomatedFeatureIds: string[] };
