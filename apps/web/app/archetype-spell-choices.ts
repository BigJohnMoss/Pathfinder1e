import type { CharacterClass, CharacterOption, CharacterSpell, ClassFeatureOccurrence } from "../../../packages/types/src/index.js";

const choicePrefix = (classId: string) => `archetype-adjusted-spell-${classId}-`;

export function isAdjustedSpellChoice(feature: ClassFeatureOccurrence) {
  return feature.optionGroupId === "archetype-spell-choices" &&
    Boolean(feature.schoolSpellChoice || (feature.spellChoiceClassId && feature.spellChoiceLevelIncrease));
}

function adjustedSpellLevel(feature: ClassFeatureOccurrence, spell: CharacterSpell, maximumSpellLevel: number) {
  const limit = Math.min(maximumSpellLevel, feature.maximumSpellLevel ?? 9);
  const restriction = feature.schoolSpellChoice;
  if (restriction) {
    if (spell.school !== restriction.school) return undefined;
    const preferredLevel = spell.levelByClass[restriction.preferredClassId];
    if (preferredLevel !== undefined) return preferredLevel <= limit ? preferredLevel : undefined;
    const eligibleLevels = Object.values(spell.levelByClass).filter((level) => level <= limit - restriction.otherListsBelowMaximum);
    return eligibleLevels.length ? Math.min(...eligibleLevels) : undefined;
  }
  if (!feature.spellChoiceClassId || !feature.spellChoiceLevelIncrease) return undefined;
  const sourceLevel = spell.levelByClass[feature.spellChoiceClassId];
  if (sourceLevel === undefined) return undefined;
  const level = sourceLevel + feature.spellChoiceLevelIncrease;
  return level <= limit ? level : undefined;
}

export function adjustedSpellChoiceOptions(spells: CharacterSpell[], feature: ClassFeatureOccurrence, characterClass: CharacterClass, maximumSpellLevel: number): CharacterOption[] {
  const { id: classId, spellListExclusions } = characterClass;
  const excluded = new Set(spellListExclusions);
  return spells.flatMap((spell) => {
    if (excluded.has(spell.id)) return [];
    const spellLevel = adjustedSpellLevel(feature, spell, maximumSpellLevel);
    if (spellLevel === undefined) return [];
    return [{
      id: `${choicePrefix(classId)}${spell.id}`,
      name: feature.schoolSpellChoice ? `${spell.name} (level ${spellLevel})` : spell.name,
      groupId: "archetype-spell-choices",
      classIds: [classId],
      minimumLevel: feature.level,
      prerequisites: [],
      benefit: `Learn this as a level-${spellLevel} bonus spell. ${spell.summary}`,
      spellId: spell.id,
      spellLevel,
      source: spell.source ?? feature.source ?? { title: "Archives of Nethys", url: "https://www.aonprd.com/Spells.aspx" },
    }];
  });
}

export function spellsFromAdjustedChoices(
  spells: CharacterSpell[],
  characterClass: CharacterClass | undefined,
  classLevel: number,
  maximumSpellLevel: number,
  selectedOptions: Record<string, string>,
): CharacterSpell[] {
  if (!characterClass) return [];
  const { id: classId, features, spellListExclusions } = characterClass;
  const prefix = choicePrefix(classId);
  const chosen = new Map<string, CharacterSpell>();
  for (const feature of features) {
    if (!isAdjustedSpellChoice(feature) || feature.level > classLevel) continue;
    const choiceId = selectedOptions[feature.id];
    if (!choiceId?.startsWith(prefix)) continue;
    const baseSpellId = choiceId.slice(prefix.length);
    const spell = spells.find((candidate) => candidate.id === baseSpellId);
    if (!spell || spellListExclusions?.includes(baseSpellId) || chosen.has(baseSpellId)) continue;
    const level = adjustedSpellLevel(feature, spell, maximumSpellLevel);
    if (level === undefined) continue;
    const source = feature.name.replace(/\s+\((?:Ex|Su|Sp)\)$/i, "");
    const nativeLevel = characterClass.spellListAdditions?.[baseSpellId] ?? spell.levelByClass[characterClass.spellListClassId ?? classId];
    const reusesNativeSpell = Boolean(feature.schoolSpellChoice) && nativeLevel === level;
    chosen.set(baseSpellId, {
      ...spell,
      id: reusesNativeSpell ? baseSpellId : `${baseSpellId}-${classId}-archetype-level-${level}`,
      ...(reusesNativeSpell ? {} : { baseSpellId }),
      bonusSpellSource: source,
      name: reusesNativeSpell ? spell.name : `${spell.name} (${source})`,
      levelByClass: { ...spell.levelByClass, [classId]: level },
    });
  }
  return [...chosen.values()];
}
