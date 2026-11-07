const armorMasterFeatureIds = [
  "fighter-armor-master-deflective-shield-ex-2",
  "fighter-armor-master-armored-defense-ex-5",
  "fighter-armor-master-fortification-ex-9",
  "fighter-armor-master-indestructible-ex-20",
];

const molthuniFeatureId = "fighter-molthuni-defender-armored-defense-ex-3";
const molthuniChoicePrefix = "fighter-molthuni-defender-armored-defense-maneuver-";
const maneuverNames = {
  "molthuni-bull-rush": "Bull rush",
  "molthuni-dirty-trick": "Dirty trick",
  "molthuni-drag": "Drag",
  "molthuni-grapple": "Grapple",
  "molthuni-overrun": "Overrun",
  "molthuni-reposition": "Reposition",
  "molthuni-trip": "Trip",
};

const classLevel = (archetype, classLevels) => Math.max(0, Number(classLevels?.[archetype.classId]) || 0);

export function inferredArchetypeArmorConditionedDefenseDetails(archetype) {
  const ids = archetype?.id === "fighter-armor-master"
    ? armorMasterFeatureIds
    : archetype?.id === "fighter-molthuni-defender"
      ? [molthuniFeatureId]
      : [];
  const available = new Set((archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? []).map((feature) => feature.id));
  return {
    fullyAutomatedFeatureIds: new Set(ids.filter((id) => available.has(id))),
  };
}

const armorMasterBenefits = (archetype, level, armorCategory, shieldBonus) => {
  const source = archetype.name;
  const armorClass = { normal: 0, touch: 0, flatFooted: 0 };
  const defenses = [];
  const conditionalModifiers = [];

  if (level >= 2 && shieldBonus > 0) {
    armorClass.touch = Math.min(shieldBonus, 1 + Math.floor((level - 2) / 4), 6);
  }
  if (level >= 5 && armorCategory !== "none") {
    const early = { light: 1, medium: 2, heavy: 3 }[armorCategory];
    const late = { light: 4, medium: 8, heavy: 12 }[armorCategory];
    defenses.push({
      sourceFeatureId: armorMasterFeatureIds[1],
      kind: "damageReduction",
      label: "Armored Defense",
      value: level >= 19 ? late : early,
      qualifier: "—",
      condition: "while wearing armor and not stunned, unconscious, or helpless; stacks with adamantine armor but not other DR",
      source,
    });
  }
  if (level >= 9 && armorCategory !== "none") {
    defenses.push({
      sourceFeatureId: armorMasterFeatureIds[2],
      kind: "fortification",
      label: "Fortification",
      value: level >= 13 ? 75 : 25,
      qualifier: level >= 13 ? "moderate" : "light",
      condition: "while wearing armor; use the better value rather than stacking with armor fortification",
      source,
    });
  }
  if (level >= 20 && armorCategory !== "none") {
    defenses.push({
      sourceFeatureId: armorMasterFeatureIds[3],
      kind: "immunity",
      label: "Indestructible",
      value: 0,
      qualifier: "critical hits and sneak attacks",
      condition: "while wearing armor",
      source,
    });
    conditionalModifiers.push({
      label: "Equipped armor cannot be sundered",
      condition: "while wearing armor that does not have the fragile quality",
      source,
    });
  }
  return {
    armorClass,
    defenses,
    conditionalModifiers,
    handledFeatureIds: armorMasterFeatureIds,
    suppressedConditionalModifierLabels: [`${source}:Touch Armor Class`],
  };
};

const molthuniBenefits = (archetype, level, armorCategory, selectedOptions) => {
  if (level < 3 || !["medium", "heavy"].includes(armorCategory)) return { conditionalModifiers: [], handledFeatureIds: [molthuniFeatureId] };
  const armorTrainingBonus = Math.min(4, 1 + Math.floor((level - 3) / 4));
  const defenseBonus = (armorCategory === "heavy" ? 3 : 1) + armorTrainingBonus - 1;
  const source = archetype.name;
  const maneuvers = "bull rush, dirty trick, drag, grapple, overrun, reposition, and trip";
  const selectedManeuvers = [...new Set(Object.entries(selectedOptions ?? {})
    .filter(([featureId]) => featureId === molthuniFeatureId || featureId.startsWith(molthuniChoicePrefix))
    .map(([, optionId]) => optionId)
    .filter((optionId) => maneuverNames[optionId]))];
  return {
    handledFeatureIds: [molthuniFeatureId],
    conditionalModifiers: [
      { label: "CMD", bonus: defenseBonus, condition: `against ${maneuvers} while wearing ${armorCategory} armor`, source },
      { label: "Acrobatics DC through threatened squares", bonus: defenseBonus, condition: `while wearing ${armorCategory} armor`, source },
      ...selectedManeuvers.map((maneuver) => ({
        label: `${maneuverNames[maneuver]} CMB`,
        bonus: Math.floor(armorTrainingBonus / 2),
        condition: `while wearing ${armorCategory} armor`,
        source,
      })),
    ],
  };
};

export function archetypeArmorConditionedBenefits(archetypes = [], classLevels = {}, context = {}) {
  const armorCategory = context.armorCategory ?? "none";
  const shieldBonus = Math.max(0, Number(context.shieldBonus) || 0);
  const result = {
    armorClass: { normal: 0, touch: 0, flatFooted: 0 },
    defenses: [],
    conditionalModifiers: [],
    handledFeatureIds: [],
    suppressedConditionalModifierLabels: [],
  };
  for (const archetype of archetypes ?? []) {
    const level = classLevel(archetype, classLevels);
    const benefits = archetype.id === "fighter-armor-master"
      ? armorMasterBenefits(archetype, level, armorCategory, shieldBonus)
      : archetype.id === "fighter-molthuni-defender"
        ? molthuniBenefits(archetype, level, armorCategory, context.selectedOptions)
        : null;
    if (!benefits) continue;
    for (const part of Object.keys(result.armorClass)) result.armorClass[part] += benefits.armorClass?.[part] ?? 0;
    result.defenses.push(...(benefits.defenses ?? []));
    result.conditionalModifiers.push(...(benefits.conditionalModifiers ?? []));
    result.handledFeatureIds.push(...(benefits.handledFeatureIds ?? []));
    result.suppressedConditionalModifierLabels.push(...(benefits.suppressedConditionalModifierLabels ?? []));
  }
  result.handledFeatureIds = [...new Set(result.handledFeatureIds)];
  result.suppressedConditionalModifierLabels = [...new Set(result.suppressedConditionalModifierLabels)];
  return result;
}
