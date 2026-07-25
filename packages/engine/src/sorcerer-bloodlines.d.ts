export type BloodlineSpellEntry = { sorcererLevel: number; spellLevel: number; name: string };
export type BloodlinePower = { name: string; level: number; summary: string };
export type SorcererBloodline = { id: string; classSkill?: string; classSkillChoices?: string[]; arcana?: string; bonusSpells?: BloodlineSpellEntry[]; bonusFeats?: string[]; powers?: BloodlinePower[] };
export function bloodlineBonusSpells<T extends { name: string; levelByClass?: Record<string, number> }>(spells: T[], selectedBloodline: SorcererBloodline | null | undefined, sorcererLevel: number, classId?: string): Array<T & { levelByClass: Record<string, number> }>;
export function bloodlineClassSkills(baseClassSkills: string[] | undefined, selectedBloodline: SorcererBloodline | null | undefined, selectedClassSkill?: string): string[];
export function bloodlinePowersThroughLevel(selectedBloodline: SorcererBloodline | null | undefined, sorcererLevel: number): BloodlinePower[];
