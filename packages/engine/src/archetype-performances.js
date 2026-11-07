const normalized = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[’‘]/g, "'")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLowerCase();

export function namedPerformances(feature) {
  const summary = String(feature?.summary ?? "");
  return [...summary.matchAll(/(?:^|[.!?]\s+)([A-Z][A-Za-z’' -]{1,70})\s*\((?:Ex|Su|Sp)\)\s*:?(?=\s|$)/g)]
    .map((match) => match[1].trim())
    .filter((name, index, names) => names.findIndex((candidate) => normalized(candidate) === normalized(name)) === index);
}

export function inferredArchetypePerformanceRuleDetails(archetype) {
  const rules = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (!/^(?:Bardic Performance|Raging Song)(?:\s*\([^)]+\))?$/i.test(String(feature.name ?? "").trim()) || !feature.performanceRules?.length) continue;
    const actionIds = new Set((feature.resourceActions ?? []).map((action) => action.id));
    const rulesByName = new Map(feature.performanceRules.map((rule) => [normalized(rule.name), rule]));
    const publishedNames = namedPerformances(feature);
    const completeNames = publishedNames.length > 0 && publishedNames.every((name) => rulesByName.has(normalized(name)));
    const completeActions = feature.performanceRules.every((rule) => rule.kind !== "active" || Boolean(rule.actionIds?.length) && rule.actionIds.every((id) => actionIds.has(id)));
    const validLevels = feature.performanceRules.every((rule) => Number.isInteger(rule.minimumLevel) && rule.minimumLevel >= 1 && rule.minimumLevel <= 20);
    rules.push(...feature.performanceRules.map((rule) => ({ ...rule, sourceFeatureId: feature.id })));
    if (completeNames && completeActions && validLevels) fullyAutomatedFeatureIds.add(feature.id);
  }
  return { rules, fullyAutomatedFeatureIds };
}

export function archetypePerformanceRules(archetypes = [], classLevels = {}) {
  return archetypes.flatMap((archetype) => inferredArchetypePerformanceRuleDetails(archetype).rules
    .filter((rule) => (classLevels[archetype.classId] ?? 0) >= rule.minimumLevel)
    .map((rule) => ({ ...rule, source: archetype.name })));
}
