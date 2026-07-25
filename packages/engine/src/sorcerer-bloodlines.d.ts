export type BloodlineSpellEntry = { sorcererLevel: number; spellLevel: number; name: string };
export type BloodlinePower = { name: string; level: number; summary: string };
export type SorcererBloodline = { id: string; classSkill?: string; arcana?: string; bonusSpells?: BloodlineSpellEntry[]; bonusFeats?: string[]; powers?: BloodlinePower[] };
export function bloodlineBonusSpells<T extends { name: string }>(spells: T[], selectedBloodline: SorcererBloodline | null | undefined, sorcererLevel: number): T[];
export function bloodlineClassSkills(baseClassSkills: string[] | undefined, selectedBloodline: SorcererBloodline | null | undefined): string[];
export function bloodlinePowersThroughLevel(selectedBloodline: SorcererBloodline | null | undefined, sorcererLevel: number): BloodlinePower[];
