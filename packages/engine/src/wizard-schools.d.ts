export function oppositionSchoolOptions<T extends { id: string }>(options: T[], selectedSchool?: { id: string; associatedSchool?: string; elementalOppositionSchool?: string } | null): T[];
