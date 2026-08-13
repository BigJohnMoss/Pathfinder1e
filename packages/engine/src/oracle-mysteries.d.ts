import type { CharacterSpell, CharacterOption } from "../../types/src/index.js";
export function mysteryBonusSpells(spells: CharacterSpell[], selectedMystery: CharacterOption | null | undefined, oracleLevel: number, classId?: string, replacedClassLevels?: number[]): CharacterSpell[];
export function revelationsThroughLevel(selectedMystery: CharacterOption | null | undefined, oracleLevel: number): NonNullable<CharacterOption["revelations"]>;
