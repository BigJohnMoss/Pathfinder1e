export interface PhantomProgression {
  effectiveLevel: number;
  hitDice: number;
  baseAttackBonus: number;
  goodSaveBonus: number;
  badSaveBonus: number;
  skillRanks: number;
  feats: number;
  armorBonus: number;
  dexterityCharismaBonus: number;
  slamDamage: string;
  slamCritical: string;
  abilityScores: Record<"strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma", number>;
  focus: PhantomFocusDetails | null;
  specialAbilities: string[];
}
export interface PhantomFocusDetails {
  skills: string[];
  goodSaves: string[];
  traits: string[];
  abilityFocus?: "strength" | "constitution";
  abilities: Array<{ minimumLevel: number; name: string; summary: string }>;
}
export function phantomFocusDetails(optionId: string, level: number): PhantomFocusDetails | null;
export function phantomProgression(level: number, optionId?: string): PhantomProgression;
