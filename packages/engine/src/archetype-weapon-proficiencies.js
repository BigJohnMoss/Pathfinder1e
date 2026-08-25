const completeProfiles = {
  "magus-spire-defender": {
    featureId: "magus-spire-defender-weapon-proficiency-1",
    needsChoice: true,
  },
  "monk-hellcat": {
    featureId: "monk-hellcat-weapon-proficiency-1",
    needsWeaponUse: true,
  },
  "monk-softstrike-monk": {
    featureId: "monk-softstrike-monk-weapon-proficiency-1",
    needsConditionalProficiency: true,
  },
};

export function inferredArchetypeWeaponProficiencyRuleDetails(archetype) {
  const profile = completeProfiles[archetype?.id];
  if (!profile) return { fullyAutomatedFeatureIds: new Set() };
  const proficiencyRules = (archetype.proficiencyAdjustments ?? []).filter((rule) => rule.sourceFeatureId === profile.featureId);
  const choices = (archetype.proficiencyChoices ?? []).filter((rule) => rule.sourceFeatureId === profile.featureId);
  const weaponUses = (archetype.weaponUseAdjustments ?? []).filter((rule) => rule.sourceFeatureId === profile.featureId);
  const complete = proficiencyRules.length > 0
    && (!profile.needsChoice || choices.length > 0)
    && (!profile.needsWeaponUse || weaponUses.length > 0)
    && (!profile.needsConditionalProficiency || proficiencyRules.some((rule) => rule.condition));
  return { fullyAutomatedFeatureIds: new Set(complete ? [profile.featureId] : []) };
}

const operationLabel = (operation) => operation === "replace" ? "Replaces weapon proficiencies" : operation === "remove" ? "Loses proficiency" : "Gains proficiency";

export function archetypeWeaponProficiencyRules(archetypes = [], selectedOptions = {}) {
  return (archetypes ?? []).flatMap((archetype) => {
    const rules = (archetype.proficiencyAdjustments ?? []).map((adjustment) => ({
      sourceFeatureId: adjustment.sourceFeatureId,
      label: operationLabel(adjustment.operation),
      proficiencies: adjustment.proficiencies,
      condition: adjustment.condition,
      source: archetype.name,
    }));
    const choices = (archetype.proficiencyChoices ?? []).flatMap((choice) => {
      const value = String(selectedOptions[`${choice.featureId}-${choice.choiceKey}`] ?? "").trim();
      return value ? [{
        sourceFeatureId: choice.sourceFeatureId,
        label: operationLabel(choice.operation),
        proficiencies: [value],
        condition: choice.condition,
        source: archetype.name,
      }] : [];
    });
    const weaponUses = (archetype.weaponUseAdjustments ?? []).map((adjustment) => ({
      sourceFeatureId: adjustment.sourceFeatureId,
      label: adjustment.label,
      proficiencies: adjustment.proficiencies,
      condition: adjustment.condition,
      source: archetype.name,
    }));
    return [...rules, ...choices, ...weaponUses];
  });
}

