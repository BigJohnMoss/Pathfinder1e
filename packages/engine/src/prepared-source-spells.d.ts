import type { CharacterSpell } from "../../types/src/index.js";
export function preparedSourceSpellCapacity(classId: string, classLevel: number, intelligenceModifier: number, bonusSpells?: number): number | null;
export function normalizePreparedSourceSpells(spellIds: string[], spells: CharacterSpell[], classId: string, maximumSpellLevel: number, capacity: number | null, automaticSpellIds?: string[]): string[];
export function preparedSourceAvailableSpells(spells: CharacterSpell[], classId: string, knownSpellIds: string[], automaticSpellIds?: string[]): CharacterSpell[];
