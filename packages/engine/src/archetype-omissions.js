const normalized = (value) => String(value ?? "")
  .replace(/[’']/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const featureName = (feature) => normalized(feature?.name)
  .replace(/\s+(?:ex|su|sp)$/, "")
  .trim();

function omittedNames(feature) {
  const summary = String(feature?.summary ?? "").replace(/\s+/g, " ").trim();
  if (!summary || summary.split(/(?<=[.!?])\s+/).length !== 1) return [];
  const marker = " does not gain ";
  const markerIndex = summary.toLowerCase().indexOf(marker);
  if (markerIndex < 1 || !/^(?:an?|the|unlike)\b/i.test(summary)) return [];
  const omitted = summary.slice(markerIndex + marker.length);
  if (/[,;:]|\b(?:but|though|except|unless|until|when|while|if|instead|other)\b/i.test(omitted)) return [];
  let list = omitted
    .replace(/[.!?]+$/, "")
    .replace(/^an?\s+|^the\s+/i, "")
    .replace(/\s+(?:class features?|class abilit(?:y|ies)|features?|abilit(?:y|ies))$/i, "")
    .trim();
  if (/^this$/i.test(list)) list = featureName(feature);
  return list.split(/\s+(?:and|or)\s+/i).map(normalized).filter(Boolean);
}

const targetMatches = (targetId, omittedName) => {
  const target = normalized(targetId).replace(/\s+\d+$/, "");
  return target.includes(omittedName);
};

export function inferredArchetypeOmissionDetails(archetype) {
  const omissions = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const replacement of archetype?.replacements ?? []) {
    const targets = replacement.featureIds ?? [];
    if (!targets.length) continue;
    for (const feature of replacement.features ?? []) {
      const names = omittedNames(feature);
      if (!names.length || !names.every((name) => targets.some((target) => targetMatches(target, name)))) continue;
      omissions.push({ sourceFeatureId: feature.id, omittedNames: names });
      fullyAutomatedFeatureIds.add(feature.id);
    }
  }
  return { omissions, fullyAutomatedFeatureIds };
}

export function inferArchetypeOmissions(archetype) {
  return inferredArchetypeOmissionDetails(archetype).omissions;
}
