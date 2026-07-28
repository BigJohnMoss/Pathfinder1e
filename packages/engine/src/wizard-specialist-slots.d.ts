export type SpecialistSpell = { id: string; name: string; school?: string; schools?: string[]; levelByClass: Record<string, number>; summary: string };
export type SpecialistSchool = { id: string; associatedSchool?: string; elementalSpellIdsByLevel?: Record<string, string[]> };
export function specialistSchoolSpells<T extends SpecialistSpell>(spells: T[], selectedSchool: SpecialistSchool | null | undefined, spellLevel: number): T[];
