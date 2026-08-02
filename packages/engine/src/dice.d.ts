export type DiceRoll = { count: number; sides: number; modifier: number; rolls: number[]; subtotal: number; total: number };
export type D20Roll = DiceRoll & { natural: number; outcome: "natural-20" | "natural-1" | "normal" };
export function rollDice(count: number, sides: number, modifier?: number, random?: () => number): DiceRoll;
export function parseDiceExpression(expression: string): { count: number; sides: number; modifier: number };
export function rollDiceExpression(expression: string, extraModifier?: number, random?: () => number): DiceRoll;
export function rollD20Check(modifier?: number, random?: () => number): D20Roll;
export function parseCriticalThreatRange(critical: string): { minimum: number; multiplier: number };
export function resolveAttackRoll(roll: D20Roll, armorClass: number, critical?: string): { hit: boolean; criticalThreat: boolean; armorClass: number; threatMinimum: number; criticalMultiplier: number };
export function confirmCriticalThreat(attackResolution: ReturnType<typeof resolveAttackRoll>, confirmationRoll: D20Roll): { attempted: boolean; confirmed: boolean; confirmation: ReturnType<typeof resolveAttackRoll> | null };
