export type CompanionKind = "animal" | "mount" | "familiar" | "eidolon";
export type CompanionState = { kind: CompanionKind; optionId: string; name: string; currentHitPoints: number | null; skillRanks: Record<string, number>; featIds: string[] };
export function animalCompanionProgression(level: number): { effectiveLevel: number; hitDice: number; baseAttackBonus: number; saves: Record<"fortitude" | "reflex" | "will", number>; skillRanks: number; feats: number; naturalArmorBonus: number; strengthDexterityBonus: number; bonusTricks: number; specialAbilities: string[] };
export function familiarProgression(level: number, masterHitPoints?: number): { effectiveLevel: number; hitPoints: number; naturalArmorAdjustment: number; intelligence: number; specialAbilities: string[] };
export function normalizeCompanionState(value: unknown): Record<string, CompanionState>;
