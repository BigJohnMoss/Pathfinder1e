export function optionsGrantedBySelection<T extends { id: string }>(
  options: T[],
  selectedGrant: Record<string, unknown> | undefined,
  property?: string
): T[];
