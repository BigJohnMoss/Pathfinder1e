import { resolvedArchetypeResourceAdjustments } from "./archetype-resources.js";

const featureLabel = (feature) => String(feature?.name ?? "Archetype feature").replace(/\s*\((?:Ex|Su|Sp)(?:,\s*(?:Ex|Su|Sp))*\)\s*$/i, "").trim();
const normalized = (value) => String(value ?? "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
const actionIdPart = (value) => normalized(value).replace(/\s+/g, "-");

function resourceFeature(resource, features) {
  if (resource.sourceFeatureId) {
    const exact = features.find((feature) => feature.id === resource.sourceFeatureId);
    if (exact) return exact;
  }
  const inferredId = String(resource.resourceId ?? "").replace(/^archetype-/, "");
  const exactId = features.find((feature) => feature.id === inferredId);
  if (exactId) return exactId;
  const label = normalized(resource.label);
  const matches = features.filter((feature) => normalized(featureLabel(feature)) === label);
  return matches.length === 1 ? matches[0] : undefined;
}

export function inferredArchetypeResourceActionDetails(archetype, excludedFeatureIds = new Set()) {
  const actions = [];
  const features = (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? []);
  const usedResourceIds = new Set();
  for (const resource of resolvedArchetypeResourceAdjustments(archetype)) {
    if (!resource?.resourceId || resource.hidden || resource.dedicatedAction || usedResourceIds.has(resource.resourceId)) continue;
    const feature = resourceFeature(resource, features);
    if (!feature || feature.resourceActions?.length || excludedFeatureIds.has(feature.id)) continue;
    const label = featureLabel(feature);
    actions.push({
      sourceFeatureId: feature.id,
      action: {
        id: `${feature.id}-use-${actionIdPart(resource.resourceId)}`,
        label: resource.unit === "round" ? `Use 1 round of ${label}` : `Use ${label}`,
        classId: archetype.classId,
        minimumLevel: Math.max(1, Number(resource.minimumLevel ?? feature.level ?? 1)),
        resourceId: resource.resourceId,
        cost: 1,
        summary: feature.summary,
      },
    });
    usedResourceIds.add(resource.resourceId);
  }
  return { actions, fullyAutomatedFeatureIds: new Set() };
}

export function inferArchetypeResourceActions(archetype, excludedFeatureIds) {
  return inferredArchetypeResourceActionDetails(archetype, excludedFeatureIds).actions;
}
