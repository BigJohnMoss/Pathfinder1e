export interface DrakeCompanionProgression {
  effectiveLevel: number;
  hitDice: number;
  baseAttackBonus: number;
  baseSaveBonus: number;
  skillRanks: number;
  feats: number;
  naturalArmorBonus: number;
  abilityScoreIncreases: number;
  sizeIncreases: number;
  drakePowers: number;
  specialAbilities: string[];
}
export interface DrakeCompanionSchedule {
  powerLevels?: number[];
  sizeLevels?: number[];
}
export function drakeCompanionProgression(level: number, schedule?: DrakeCompanionSchedule): DrakeCompanionProgression;
