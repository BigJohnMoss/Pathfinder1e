export type SpecialistSpell = { id: string; name: string; school: string; levelByClass: Record<string, number>; summary: string };
export function specialistSchoolSpells<T extends SpecialistSpell>(spells: T[], selectedSchool: { id: string } | null | undefined, spellLevel: number): T[];
