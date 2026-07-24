export type OppositionPreparationSpell = { id: string; school?: string; schools?: string[]; levelByClass: Record<string, number> };
export function spellPreparationCost(spell: OppositionPreparationSpell, oppositionSchoolIds?: string[]): number;
export function preparedSpellSlotUsage(preparedSpellIds: string[], spells: OppositionPreparationSpell[], classId: string, oppositionSchoolIds?: string[]): Record<number, number>;
export function normalizePreparedSpellsWithOpposition(preparedSpellIds: string[], spells: OppositionPreparationSpell[], classId: string, preparedLimits: Array<{ level: number; count: number }>, oppositionSchoolIds?: string[]): string[];
