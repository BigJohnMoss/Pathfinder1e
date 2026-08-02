export type DiceRoll = { count: number; sides: number; modifier: number; rolls: number[]; subtotal: number; total: number };
export type D20Roll = DiceRoll & { natural: number; outcome: "natural-20" | "natural-1" | "normal" };
export function rollDice(count: number, sides: number, modifier?: number, random?: () => number): DiceRoll;
export function parseDiceExpression(expression: string): { count: number; sides: number; modifier: number };
export function rollDiceExpression(expression: string, extraModifier?: number, random?: () => number): DiceRoll;
export function rollD20Check(modifier?: number, random?: () => number): D20Roll;
