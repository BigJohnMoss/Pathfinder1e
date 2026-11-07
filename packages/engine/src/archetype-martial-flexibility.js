import { resolvedArchetypeResourceAdjustments } from "./archetype-resources.js";

const profiles = {
  "fighter-martial-master": {
    featureId: "fighter-martial-master-martial-flexibility-ex-5",
    modes: [
      { id: "one-move", label: "1 feat — move action", featCount: 1, actionType: "move", minimumLevel: 5, maximumLevel: 8 },
      { id: "one-swift", label: "1 feat — swift action", featCount: 1, actionType: "swift", minimumLevel: 9, maximumLevel: 13 },
      { id: "two-move", label: "2 feats — move action", featCount: 2, actionType: "move", minimumLevel: 9, maximumLevel: 13 },
      { id: "one-free", label: "1 feat — free action", featCount: 1, actionType: "free", minimumLevel: 14, maximumLevel: 16 },
      { id: "two-swift", label: "2 feats — swift action", featCount: 2, actionType: "swift", minimumLevel: 14, maximumLevel: 19 },
      { id: "three-move", label: "3 feats — move action", featCount: 3, actionType: "move", minimumLevel: 14, maximumLevel: 16 },
      { id: "one-immediate", label: "1 feat — immediate action", featCount: 1, actionType: "immediate", minimumLevel: 17, maximumLevel: 19 },
      { id: "three-swift", label: "3 feats — swift action", featCount: 3, actionType: "swift", minimumLevel: 17, maximumLevel: 19 },
      { id: "any-swift", label: "Any number — swift action", featCount: 1, variableFeatCount: true, actionType: "swift", minimumLevel: 20 },
    ],
  },
  "oracle-warsighted": {
    featureId: "oracle-warsighted-martial-flexibility-ex-1",
    modes: [
      { id: "one-move", label: "1 feat — move action", featCount: 1, actionType: "move", minimumLevel: 1, maximumLevel: 6 },
      { id: "one-swift", label: "1 feat — swift action", featCount: 1, actionType: "swift", minimumLevel: 7, maximumLevel: 10 },
      { id: "two-move", label: "2 feats — move action", featCount: 2, actionType: "move", minimumLevel: 7, maximumLevel: 10 },
      { id: "one-free", label: "1 feat — free action", featCount: 1, actionType: "free", minimumLevel: 11, maximumLevel: 14 },
      { id: "two-swift", label: "2 feats — swift action", featCount: 2, actionType: "swift", minimumLevel: 11 },
      { id: "three-move", label: "3 feats — move action", featCount: 3, actionType: "move", minimumLevel: 11, maximumLevel: 14 },
      { id: "one-immediate", label: "1 feat — immediate action", featCount: 1, actionType: "immediate", minimumLevel: 15 },
      { id: "three-swift", label: "3 feats — swift action", featCount: 3, actionType: "swift", minimumLevel: 15 },
    ],
  },
  "fighter-varisian-free-style-fighter": {
    featureId: "fighter-varisian-free-style-fighter-martial-flexibility-ex-1",
    modes: [
      { id: "one-move", label: "1 feat — move action", featCount: 1, actionType: "move", minimumLevel: 1, maximumLevel: 5 },
      { id: "one-swift", label: "1 feat — swift action", featCount: 1, actionType: "swift", minimumLevel: 6, maximumLevel: 9 },
      { id: "two-move", label: "2 feats — move action", featCount: 2, actionType: "move", minimumLevel: 6, maximumLevel: 9 },
      { id: "one-free", label: "1 feat — free action", featCount: 1, actionType: "free", minimumLevel: 10, maximumLevel: 11 },
      { id: "two-swift", label: "2 feats — swift action", featCount: 2, actionType: "swift", minimumLevel: 10 },
      { id: "three-move", label: "3 feats — move action", featCount: 3, actionType: "move", minimumLevel: 10, maximumLevel: 11 },
      { id: "one-immediate", label: "1 feat — immediate action", featCount: 1, actionType: "immediate", minimumLevel: 12, maximumLevel: 19 },
      { id: "three-swift", label: "3 feats — swift action", featCount: 3, actionType: "swift", minimumLevel: 12, maximumLevel: 19 },
      { id: "any-swift", label: "Any number — swift action", featCount: 1, variableFeatCount: true, actionType: "swift", minimumLevel: 20 },
    ],
  },
  "sorcerer-eldritch-scrapper": {
    featureId: "sorcerer-eldritch-scrapper-martial-flexibility-ex-1",
    additionalFeatIds: ["arcane-strike", "combat-casting"],
    modes: [
      { id: "one-move", label: "1 feat — move action", featCount: 1, actionType: "move", minimumLevel: 1, maximumLevel: 8 },
      { id: "one-move-9", label: "1 feat — move action", featCount: 1, actionType: "move", minimumLevel: 9, maximumLevel: 14 },
      { id: "two-standard", label: "2 feats — standard action", featCount: 2, actionType: "standard", minimumLevel: 9, maximumLevel: 14 },
      { id: "one-swift", label: "1 feat — swift action", featCount: 1, actionType: "swift", minimumLevel: 15 },
      { id: "two-move-15", label: "2 feats — move action", featCount: 2, actionType: "move", minimumLevel: 15 },
      { id: "three-standard", label: "3 feats — standard action", featCount: 3, actionType: "standard", minimumLevel: 15 },
    ],
  },
};

export function inferredArchetypeMartialFlexibilityDetails(archetype) {
  const profile = profiles[archetype?.id];
  if (!profile) return { actions: [], fullyAutomatedFeatureIds: new Set(), sentenceCoverage: [] };
  const feature = (archetype.replacements ?? []).flatMap((replacement) => replacement.features ?? []).find((candidate) => candidate.id === profile.featureId);
  if (!feature) return { actions: [], fullyAutomatedFeatureIds: new Set(), sentenceCoverage: [] };
  const resource = resolvedArchetypeResourceAdjustments(archetype).find((candidate) => candidate.sourceFeatureId === feature.id || candidate.resourceId === `archetype-${feature.id}`);
  if (!resource) return { actions: [], fullyAutomatedFeatureIds: new Set(), sentenceCoverage: [] };
  const summary = String(feature.summary ?? "");
  const sentences = summary.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
  return {
    actions: [{
      sourceFeatureId: feature.id,
      action: {
        id: `${feature.id}-select-feats`,
        label: "Use Martial Flexibility",
        classId: archetype.classId,
        minimumLevel: feature.level,
        resourceId: resource.resourceId,
        costPerSelectedFeat: true,
        modeLabel: "Feat package",
        modes: profile.modes,
        featSelection: {
          label: "Temporary combat feat",
          featType: "combat",
          source: "catalogue",
          countByLevel: [{ level: feature.level, count: 1 }],
          ...(profile.additionalFeatIds ? { additionalFeatIds: profile.additionalFeatIds } : {}),
        },
        activeEffect: {
          name: "Martial Flexibility",
          targets: ["self"],
          bonus: 0,
          description: "The selected feats are active and count as possessed for their duration.",
          defaultRounds: 10,
          fixedRounds: true,
          replaceExisting: true,
        },
        summary,
      },
    }],
    fullyAutomatedFeatureIds: new Set([feature.id]),
    sentenceCoverage: sentences.map((_, sentenceIndex) => ({ sourceFeatureId: feature.id, sentenceIndex })),
  };
}

export function inferArchetypeMartialFlexibilityActions(archetype) {
  return inferredArchetypeMartialFlexibilityDetails(archetype).actions;
}
