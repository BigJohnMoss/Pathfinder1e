export const archetypeAutomationArrayFields = [
  "conditionalModifiers",
  "skillBonusAdjustments",
  "landSpeedAdjustments",
  "resourceAdjustments",
  "companionGrants",
  "companionProgressionAdjustments",
  "optionGroupAugmentations",
  "proficiencyAdjustments",
  "classSkillAdditions",
  "classSkillRemovals",
];

export function mergeArchetypeAutomation(archetypes, overlayFiles = []) {
  const overlays = overlayFiles.flatMap((file) => file.overlays ?? []);
  const byArchetypeId = new Map();
  for (const overlay of overlays) byArchetypeId.set(overlay.archetypeId, [...(byArchetypeId.get(overlay.archetypeId) ?? []), overlay]);
  return archetypes.map((archetype) => {
    const matching = byArchetypeId.get(archetype.id) ?? [];
    if (!matching.length) return archetype;
    const merged = { ...archetype };
    for (const field of archetypeAutomationArrayFields) {
      const additions = matching.flatMap((overlay) => overlay[field] ?? []);
      if (additions.length) {
        const combined = [...(merged[field] ?? []), ...additions];
        const seen = new Set();
        merged[field] = combined.filter((entry) => {
          const key = typeof entry === "string" ? entry : JSON.stringify(entry);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    }
    const featurePatches = matching.flatMap((overlay) => overlay.featurePatches ?? []);
    if (featurePatches.length) {
      const patchesById = new Map(featurePatches.map((patch) => [patch.featureId, patch]));
      merged.replacements = (merged.replacements ?? []).map((replacement) => ({
        ...replacement,
        features: (replacement.features ?? []).map((feature) => {
          const patch = patchesById.get(feature.id);
          if (!patch) return feature;
          const { featureId, ...changes } = patch;
          return { ...feature, ...changes };
        }),
      }));
    }
    const coverage = matching.map((overlay) => overlay.mechanicalCoverage).filter(Boolean).at(-1);
    if (coverage) merged.mechanicalCoverage = coverage;
    const notes = matching.flatMap((overlay) => overlay.mechanicalNotes ?? []);
    if (notes.length) merged.mechanicalNotes = notes;
    return merged;
  });
}
