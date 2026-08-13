import archetypes from "../../generated/pf1e-archetypes.mjs";
import feats from "../../generated/pf1e-feats.mjs";
import spells from "../../generated/pf1e-spells.mjs";
import { archetypeAutomationSummary, inferArchetypeReplacementFeatureIds, inferArchetypeSpellAccess, inferArchetypeSpellAdditions, inferArchetypeSpellLikeAbilityActions, inferArchetypeSpellModifiers, inferArchetypeWildEmpathyAdjustments } from "../../packages/engine/src/index.js";
import data from "../../generated/pf1e-data.mjs";

const args = new Map(process.argv.slice(2).map((value, index, values) => value.startsWith("--") ? [value, values[index + 1]?.startsWith("--") ? true : values[index + 1] ?? true] : [value, true]));
const classFilter = typeof args.get("--class") === "string" ? args.get("--class") : null;
const tagFilter = typeof args.get("--tag") === "string" ? args.get("--tag") : null;

const classifiers = [
  ["actions", /\b(?:standard|move|swift|immediate|free|full-round) action\b|\bactivate\b|\bspend\b/i],
  ["resources", /\b(?:times?|rounds?|minutes?|points?) per day\b|\bpool\b|\breservoir\b/i],
  ["movement", /\b(?:land |burrow |climb |fly |swim )?speed\b|\bmovement\b|\bmove through\b|\bdifficult terrain\b/i],
  ["numeric-modifiers", /[+–-]\d+\s+(?:bonus|penalty)|\bbonus (?:on|to|equal to)\b|\bpenalty (?:on|to|equal to)\b/i],
  ["defenses", /\bimmune|\bimmunity|\bresistance|\bdamage reduction|\bconcealment|\bmiss chance|\bevasion\b/i],
  ["attacks", /\battack rolls?\b|\bdamage rolls?\b|\bcritical hit\b|\bcombat maneuver\b|\bCMB\b|\bCMD\b/i],
  ["skills", /\bskill checks?\b|\b(?:Acrobatics|Appraise|Bluff|Climb|Diplomacy|Intimidate|Perception|Stealth|Survival|Swim) checks?\b/i],
  ["spells", /\bspell(?:s|casting|-like)?\b|\bcaster level\b|\bconcentration\b/i],
  ["companions", /\bcompanion\b|\bfamiliar\b|\bmount\b|\beidolon\b|\bphantom\b/i],
  ["transformations", /\bpolymorph\b|\bshape\b|\bform of\b|\btransform/i],
  ["senses", /\bscent\b|\bdarkvision\b|\blow-light vision\b|\bblindsight\b|\btremorsense\b/i],
];

const records = archetypes
  .filter((archetype) => (archetype.mechanicalCoverage ?? "partial") !== "full")
  .filter((archetype) => !classFilter || archetype.classId === classFilter)
  .flatMap((archetype) => {
    const manual = new Set(archetypeAutomationSummary(archetype, feats, spells).manual);
    return (archetype.replacements ?? []).flatMap((replacement) => (replacement.features ?? []).flatMap((feature) => {
      if (!manual.has(`${feature.name} (level ${feature.level})`)) return [];
      const text = feature.summary ?? "";
      const tags = classifiers.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
      return [{ archetypeId: archetype.id, classId: archetype.classId, archetype: archetype.name, feature: feature.name, level: feature.level, tags: tags.length ? tags : ["narrative-exception"], summary: text }];
    }));
  });

const inferredSpellBatches = archetypes.flatMap((archetype) => {
  const inferred = inferArchetypeSpellAdditions(archetype, spells);
  const spellList = Object.keys(inferred.spellListAdditions).filter((id) => archetype.spellListAdditions?.[id] === undefined);
  const known = inferred.spellGrants.filter((grant) => archetype.bonusSpellAdditions?.[grant.spellId] === undefined && !(archetype.spellGrants ?? []).some((explicit) => explicit.mode === grant.mode && explicit.spellId === grant.spellId));
  return spellList.length || known.length ? [{ archetypeId: archetype.id, rules: spellList.length + known.length }] : [];
});

const inferredSpellAccessBatches = archetypes.flatMap((archetype) => {
  const inferred = inferArchetypeSpellAccess(archetype, spells);
  const additions = Object.keys(inferred.spellListAdditions).filter((id) => archetype.spellListAdditions?.[id] === undefined);
  const exclusions = inferred.spellListExclusions.filter((id) => !archetype.spellListExclusions?.includes(id));
  return additions.length || exclusions.length ? [{ archetypeId: archetype.id, additions: additions.length, exclusions: exclusions.length }] : [];
});
const inferredSpellModifierBatches = archetypes.flatMap((archetype) => {
  const adjustments = inferArchetypeSpellModifiers(archetype, spells);
  return adjustments.length ? [{ archetypeId: archetype.id, rules: adjustments.length }] : [];
});
const inferredWildEmpathyBatches = archetypes.flatMap((archetype) => {
  const adjustments = inferArchetypeWildEmpathyAdjustments(archetype);
  return adjustments.length ? [{ archetypeId: archetype.id, rules: adjustments.length }] : [];
});
const inferredSpellLikeAbilityBatches = archetypes.flatMap((archetype) => {
  const actions = inferArchetypeSpellLikeAbilityActions(archetype);
  return actions.length ? [{ archetypeId: archetype.id, actions: actions.length }] : [];
});
const inferredReplacementBatches = archetypes.flatMap((archetype) => {
  const characterClass = data.classes.find((entry) => entry.id === archetype.classId);
  const featureIds = characterClass ? inferArchetypeReplacementFeatureIds(characterClass, archetype) : [];
  return featureIds.length ? [{ archetypeId: archetype.id, featureIds: featureIds.length }] : [];
});

const tagCounts = Object.entries(records.flatMap((record) => record.tags).reduce((counts, tag) => ({ ...counts, [tag]: (counts[tag] ?? 0) + 1 }), {})).sort((left, right) => right[1] - left[1]);
const classCounts = Object.entries(records.reduce((counts, record) => ({ ...counts, [record.classId]: (counts[record.classId] ?? 0) + 1 }), {})).sort((left, right) => right[1] - left[1]);
const result = {
  partialArchetypes: new Set(records.map((record) => record.archetypeId)).size,
  manualFeatures: records.length,
  tagCounts: Object.fromEntries(tagCounts),
  classCounts: Object.fromEntries(classCounts),
  records,
  inferredFixedSpellRules: inferredSpellBatches.reduce((total, item) => total + item.rules, 0),
  inferredFixedSpellArchetypes: inferredSpellBatches.length,
  inferredSpellAccessAdditions: inferredSpellAccessBatches.reduce((total, item) => total + item.additions, 0),
  inferredSpellAccessExclusions: inferredSpellAccessBatches.reduce((total, item) => total + item.exclusions, 0),
  inferredSpellAccessArchetypes: inferredSpellAccessBatches.length,
  inferredSpellModifierRules: inferredSpellModifierBatches.reduce((total, item) => total + item.rules, 0),
  inferredSpellModifierArchetypes: inferredSpellModifierBatches.length,
  inferredWildEmpathyRules: inferredWildEmpathyBatches.reduce((total, item) => total + item.rules, 0),
  inferredWildEmpathyArchetypes: inferredWildEmpathyBatches.length,
  inferredSpellLikeAbilityActions: inferredSpellLikeAbilityBatches.reduce((total, item) => total + item.actions, 0),
  inferredSpellLikeAbilityArchetypes: inferredSpellLikeAbilityBatches.length,
  inferredReplacementFeatureIds: inferredReplacementBatches.reduce((total, item) => total + item.featureIds, 0),
  inferredReplacementArchetypes: inferredReplacementBatches.length,
};

if (tagFilter) {
  const candidates = Object.values(records.reduce((groups, record) => {
    const group = groups[record.archetypeId] ?? { archetypeId: record.archetypeId, classId: record.classId, archetype: record.archetype, manualFeatures: 0, matchingFeatures: 0 };
    group.manualFeatures += 1;
    if (record.tags.includes(tagFilter)) group.matchingFeatures += 1;
    groups[record.archetypeId] = group;
    return groups;
  }, {})).filter((candidate) => candidate.matchingFeatures > 0).sort((left, right) => left.manualFeatures - right.manualFeatures || right.matchingFeatures - left.matchingFeatures || left.archetype.localeCompare(right.archetype));
  console.log(`${tagFilter} candidates: ${candidates.length}`);
  for (const candidate of candidates.slice(0, 100)) console.log(`${String(candidate.manualFeatures).padStart(2)} manual / ${String(candidate.matchingFeatures).padStart(2)} matching  ${candidate.classId}/${candidate.archetypeId}  ${candidate.archetype}`);
} else if (args.has("--json")) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Partial archetypes with manual features: ${result.partialArchetypes}`);
  console.log(`Manual features: ${result.manualFeatures}`);
  console.log(`Inferred fixed spell rules: ${result.inferredFixedSpellRules} across ${result.inferredFixedSpellArchetypes} archetypes`);
  console.log(`Inferred catalog spell access: ${result.inferredSpellAccessAdditions} additions and ${result.inferredSpellAccessExclusions} exclusions across ${result.inferredSpellAccessArchetypes} archetypes`);
  console.log(`Inferred deterministic spell modifiers: ${result.inferredSpellModifierRules} across ${result.inferredSpellModifierArchetypes} archetypes`);
  console.log(`Inferred Wild Empathy rules: ${result.inferredWildEmpathyRules} across ${result.inferredWildEmpathyArchetypes} archetypes`);
  console.log(`Inferred spell-like ability actions: ${result.inferredSpellLikeAbilityActions} across ${result.inferredSpellLikeAbilityArchetypes} archetypes`);
  console.log(`Inferred missing replacement targets: ${result.inferredReplacementFeatureIds} across ${result.inferredReplacementArchetypes} archetypes`);
  console.log("\nReusable mechanic batches:");
  for (const [tag, count] of tagCounts) console.log(`${String(count).padStart(4)}  ${tag}`);
  console.log("\nLargest class queues:");
  for (const [classId, count] of classCounts.slice(0, 15)) console.log(`${String(count).padStart(4)}  ${classId}`);
}
