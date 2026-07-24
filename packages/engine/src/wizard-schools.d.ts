export type WizardSchoolOption = { id: string; [key: string]: unknown };
export function oppositionSchoolOptions<T extends WizardSchoolOption>(options: T[], selectedSchool?: WizardSchoolOption | null): T[];
