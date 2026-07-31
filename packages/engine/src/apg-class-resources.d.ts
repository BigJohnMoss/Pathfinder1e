export type ApgAbilityModifiers = Partial<Record<"intelligence" | "charisma", number>>;
export function apgClassResourceMaximums(classId: string, level: number, abilityModifiers?: ApgAbilityModifiers): Record<string, number>;
export function normalizeClassResourceUses(uses: Record<string, number> | null | undefined, maximums: Record<string, number>): Record<string, number>;
export function normalizeClassResourcesByClass(usesByClass: Record<string, Record<string, number>> | null | undefined, classLevels: Array<{ classId: string; level: number }>, abilityModifiers?: ApgAbilityModifiers): Record<string, Record<string, number>>;
