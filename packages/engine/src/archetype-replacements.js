const normalized = (value) => String(value ?? "")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const featureName = (feature) => normalized(feature?.name)
  .replace(/\s*\((?:ex|su|sp)\)\s*$/i, "")
  .replace(/^\d+(?:st|nd|rd|th)-level\s+/, "")
  .trim();

function replacementClauses(archetype) {
  const clauses = [];
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const summary = normalized(feature.summary);
    for (const match of summary.matchAll(/\b(?:this|these) (?:ability|feature|abilities|features)?\s*(?:otherwise )?replaces?\s+(.+?)(?=[.]|$)/gi)) clauses.push(match[1]);
  }
  return clauses;
}

export function inferArchetypeReplacementFeatureIds(characterClass, archetype) {
  const explicit = new Set((archetype?.replacements ?? []).flatMap((replacement) => replacement.featureIds ?? []));
  const clauses = replacementClauses(archetype);
  if (!clauses.length) return [];
  return (characterClass?.features ?? []).flatMap((feature) => {
    if (explicit.has(feature.id)) return [];
    const name = featureName(feature);
    if (name.length < 4) return [];
    const matched = clauses.some((clause) => clause
      .split(/\s*(?:,|;|\band\b|\bor\b)\s*/i)
      .map((component) => component
        .replace(/^the\s+/i, "")
        .replace(/\s*\([^)]*\)\s*$/i, "")
        .replace(/\s+(?:class feature|class ability|bonus feat)$/i, "")
        .trim())
      .some((component) => {
        if (component === name) return true;
        const leadingLevel = component.match(/^(\d+)(?:st|nd|rd|th)-level\s+(.+)$/i);
        if (leadingLevel && Number(leadingLevel[1]) === feature.level && leadingLevel[2] === name) return true;
        const trailingLevel = component.match(/^(.+?)(?: gained)? at (\d+)(?:st|nd|rd|th) level$/i);
        return Boolean(trailingLevel && trailingLevel[1] === name && Number(trailingLevel[2]) === feature.level);
      }));
    return matched ? [feature.id] : [];
  });
}
