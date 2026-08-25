export function archetypeFixedOptionGrantDetails(archetype) {
  const grants = (archetype?.fixedOptionGrants ?? []).filter((grant) =>
    grant?.sourceFeatureId &&
    grant?.optionGroupId &&
    grant?.optionId &&
    Number.isInteger(grant.minimumLevel) &&
    grant.minimumLevel >= 1 &&
    grant.minimumLevel <= 20,
  );
  return {
    grants,
    fullyAutomatedFeatureIds: new Set(grants.map((grant) => grant.sourceFeatureId)),
  };
}

export function fixedOptionIdsThroughLevel(characterClass, level) {
  return [...new Set((characterClass?.fixedOptionGrants ?? [])
    .filter((grant) => level >= grant.minimumLevel)
    .map((grant) => grant.optionId))];
}
