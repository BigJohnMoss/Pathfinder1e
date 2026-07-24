export function arcaneBondDetailOptions<T extends { id: string }>(options: T[], selectedBond: { id: string } | null | undefined, requiredBondId: string): T[];
