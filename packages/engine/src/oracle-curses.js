const fixedCurseFeatureId = "oracle-dual-cursed-oracle-fixed-curse-1";

const hauntedSpells = [
  { id: "mage-hand", spellLevel: 0, curseLevel: 1 },
  { id: "ghost-sound", spellLevel: 0, curseLevel: 1 },
  { id: "levitate", spellLevel: 2, curseLevel: 5 },
  { id: "minor-image", spellLevel: 2, curseLevel: 5 },
  { id: "telekinesis", spellLevel: 5, curseLevel: 10 },
  { id: "reverse-gravity", spellLevel: 7, curseLevel: 15 },
];

export function oracleCurseBenefits(characterClasses, classLevels, selections, optionGroups) {
  const oracle = characterClasses.find(({ id }) => id === "oracle");
  const oracleLevel = classLevels.oracle ?? 0;
  const curseLevel = oracleLevel + Math.floor(Object.entries(classLevels)
    .filter(([id]) => id !== "oracle")
    .reduce((total, [, level]) => total + level, 0) / 2);

  const activeCurses = new Map();
  for (const feature of oracle?.features ?? []) {
    if (feature.optionGroupId !== "oracle-curses" || feature.level > oracleLevel) continue;
    const selectedId = selections[feature.id];
    if (!selectedId) continue;
    const baseOptions = optionGroups.find(({ id }) => id === feature.optionGroupId)?.options ?? [];
    const isBaseChoice = baseOptions.some(({ id }) => id === selectedId)
      && (!feature.optionChoiceIds?.length || feature.optionChoiceIds.includes(selectedId));
    const isAugmentedChoice = (oracle.optionGroupAugmentations ?? []).some((augmentation) =>
      augmentation.targetGroupId === feature.optionGroupId &&
      feature.level >= (augmentation.minimumFeatureLevel ?? 1) &&
      optionGroups.find(({ id }) => id === augmentation.sourceGroupId)?.options.some((option) =>
        option.id === selectedId && (!augmentation.matchOptionLevel || option.minimumLevel === feature.level),
      ),
    );
    if (isBaseChoice || isAugmentedChoice) {
      const effectiveLevel = feature.id === fixedCurseFeatureId ? 1 : curseLevel;
      activeCurses.set(selectedId, Math.max(activeCurses.get(selectedId) ?? 0, effectiveLevel));
    }
  }

  const senses = [];
  const defenses = [];
  const conditionalModifiers = [];
  const cloudedVision = activeCurses.get("oracle-curse-clouded-vision") ?? 0;
  if (cloudedVision) {
    const source = "Clouded Vision";
    const range = cloudedVision >= 5 ? 60 : 30;
    senses.push({ sense: "darkvision", label: "Darkvision", operation: "grant", range, condition: `Sight limited to ${range} ft.`, source });
    if (cloudedVision >= 10) senses.push({ sense: "blindsense", label: "Blindsense", operation: "grant", range: 30, source });
    if (cloudedVision >= 15) senses.push({ sense: "blindsight", label: "Blindsight", operation: "grant", range: 15, source });
  }
  const lame = activeCurses.get("oracle-curse-lame") ?? 0;
  if (lame >= 5) defenses.push({ kind: "immunity", qualifier: "fatigue", value: 0, source: "Lame" });
  if (lame >= 15) defenses.push({ kind: "immunity", qualifier: "exhaustion", value: 0, source: "Lame" });

  const wasting = activeCurses.get("oracle-curse-wasting") ?? 0;
  if (wasting) {
    const source = "Wasting";
    conditionalModifiers.push({ label: "competence bonus on saves", bonus: 4, condition: "Against disease", source });
    if (wasting >= 5) defenses.push({ kind: "immunity", qualifier: "sickened", value: 0, source });
    if (wasting >= 10) defenses.push({ kind: "immunity", qualifier: "disease", value: 0, source });
    if (wasting >= 15) defenses.push({ kind: "immunity", qualifier: "nauseated", value: 0, source });
  }

  const powerlessProphecy = activeCurses.get("oracle-curse-powerless-prophecy") ?? 0;
  if (powerlessProphecy) {
    const source = "Powerless Prophecy";
    const improved = powerlessProphecy >= 10;
    defenses.push({
      kind: improved ? "improvedUncannyDodge" : "uncannyDodge",
      qualifier: improved ? "improved uncanny dodge" : "uncanny dodge",
      condition: improved ? `Uses ${oracleLevel} oracle levels as rogue levels` : undefined,
      value: 0,
      source,
    });
    if (powerlessProphecy >= 15) conditionalModifiers.push({
      label: "insight bonus to AC and saves",
      bonus: 4,
      condition: "During surprise rounds or when unaware of an attack",
      source,
    });
  }

  return {
    senses,
    defenses,
    conditionalModifiers,
    initiative: powerlessProphecy >= 5 ? 4 : 0,
    lame,
    charismaSkillPenalty: wasting ? -4 : 0,
    hauntedSpellAdditions: Object.fromEntries(hauntedSpells
      .filter(({ curseLevel }) => curseLevel <= (activeCurses.get("oracle-curse-haunted") ?? 0))
      .map(({ id, spellLevel }) => [id, spellLevel])),
  };
}

export function hauntedCurseSpells(catalogue, additions, classId, maximumSpellLevel) {
  if (classId !== "oracle") return [];
  return Object.entries(additions ?? {}).flatMap(([spellId, spellLevel]) => {
    if (spellLevel > maximumSpellLevel) return [];
    const spell = catalogue.find(({ id }) => id === spellId);
    return spell ? [{
      ...spell,
      levelByClass: { ...spell.levelByClass, oracle: spellLevel },
      bonusSpellSource: "Haunted Curse",
    }] : [];
  });
}
