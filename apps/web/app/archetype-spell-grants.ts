import type { ArchetypeSpellGrant, CharacterSpell } from "../../../packages/types/src/index.js";

export function spellsFromArchetypeGrants<T extends Pick<CharacterSpell, "id" | "levelByClass">>(
  catalogue: T[],
  grants: ArchetypeSpellGrant[] | undefined,
  classId: string,
  classLevel: number,
  maximumSpellLevel: number,
  mode: ArchetypeSpellGrant["mode"],
) {
  return (grants ?? []).flatMap((grant) => {
    const spell = catalogue.find((candidate) => candidate.id === grant.spellId);
    return spell && grant.mode === mode && grant.minimumClassLevel <= classLevel && grant.spellLevel <= maximumSpellLevel
      ? [{ ...spell, levelByClass: { ...spell.levelByClass, [classId]: grant.spellLevel } }]
      : [];
  });
}
