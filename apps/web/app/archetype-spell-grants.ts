import type { ArchetypeSpellGrant, CharacterSpell } from "../../../packages/types/src/index.js";

export function spellsFromArchetypeGrants<T extends Pick<CharacterSpell, "id" | "levelByClass">>(
  catalogue: T[],
  grants: ArchetypeSpellGrant[] | undefined,
  classId: string,
  classLevel: number,
  maximumSpellLevel: number,
  mode: ArchetypeSpellGrant["mode"],
  activeEffectNames: string[] = [],
  selectedOptionIds: string[] = [],
) {
  return (grants ?? []).flatMap((grant) => {
    if (grant.requiredActiveEffectName && !activeEffectNames.includes(grant.requiredActiveEffectName)) return [];
    if (grant.requiredOptionId && !selectedOptionIds.includes(grant.requiredOptionId)) return [];
    const spell = catalogue.find((candidate) => candidate.id === grant.spellId);
    return spell && grant.mode === mode && grant.minimumClassLevel <= classLevel && grant.spellLevel <= maximumSpellLevel
      ? [{ ...spell, levelByClass: { ...spell.levelByClass, [classId]: grant.spellLevel } }]
      : [];
  });
}
