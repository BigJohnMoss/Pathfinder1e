const normalized = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[’‘]/g, "'")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLowerCase();

export function namedDeeds(feature) {
  const summary = String(feature?.summary ?? "");
  return [...summary.matchAll(/(?:^|[.!?]\s+)([A-Z][A-Za-z’' -]{1,70})\s*\((?:Ex|Su|Sp)\)\s*:?(?=\s|$)/g)]
    .map((match) => match[1].trim())
    .filter((name, index, names) => names.findIndex((candidate) => normalized(candidate) === normalized(name)) === index);
}

export function inferredArchetypeDeedRuleDetails(archetype) {
  const entries = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (!/^Deeds?(?:\s*\([^)]+\))?$/i.test(String(feature.name ?? "").trim()) || !feature.deedRules?.length) continue;
    const actionIds = new Set((feature.resourceActions ?? []).map((action) => action.id));
    const rulesByName = new Map(feature.deedRules.map((rule) => [normalized(rule.name), rule]));
    const publishedNames = namedDeeds(feature);
    const completeNames = publishedNames.length > 0 && publishedNames.every((name) => rulesByName.has(normalized(name)));
    const completeActions = feature.deedRules.every((rule) => rule.kind !== "active" || Boolean(rule.actionIds?.length) && rule.actionIds.every((id) => actionIds.has(id)));
    const validLevels = feature.deedRules.every((rule) => Number.isInteger(rule.minimumLevel) && rule.minimumLevel >= 1 && rule.minimumLevel <= 20);
    entries.push(...feature.deedRules.map((rule) => ({ ...rule, sourceFeatureId: feature.id })));
    if (completeNames && completeActions && validLevels) fullyAutomatedFeatureIds.add(feature.id);
  }
  return { rules: entries, fullyAutomatedFeatureIds };
}

export function archetypeDeedRules(archetypes = [], classLevels = {}) {
  return archetypes.flatMap((archetype) => inferredArchetypeDeedRuleDetails(archetype).rules
    .filter((rule) => (classLevels[archetype.classId] ?? 0) >= rule.minimumLevel)
    .map((rule) => ({ ...rule, source: archetype.name })));
}
