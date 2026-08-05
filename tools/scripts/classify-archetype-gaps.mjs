import archetypes from "../../generated/pf1e-archetypes.mjs";
import feats from "../../generated/pf1e-feats.mjs";
import { archetypeAutomationSummary } from "../../packages/engine/src/index.js";

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
    const manual = new Set(archetypeAutomationSummary(archetype, feats).manual);
    return (archetype.replacements ?? []).flatMap((replacement) => (replacement.features ?? []).flatMap((feature) => {
      if (!manual.has(`${feature.name} (level ${feature.level})`)) return [];
      const text = feature.summary ?? "";
      const tags = classifiers.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
      return [{ archetypeId: archetype.id, classId: archetype.classId, archetype: archetype.name, feature: feature.name, level: feature.level, tags: tags.length ? tags : ["narrative-exception"], summary: text }];
    }));
  });

const tagCounts = Object.entries(records.flatMap((record) => record.tags).reduce((counts, tag) => ({ ...counts, [tag]: (counts[tag] ?? 0) + 1 }), {})).sort((left, right) => right[1] - left[1]);
const classCounts = Object.entries(records.reduce((counts, record) => ({ ...counts, [record.classId]: (counts[record.classId] ?? 0) + 1 }), {})).sort((left, right) => right[1] - left[1]);
const result = {
  partialArchetypes: new Set(records.map((record) => record.archetypeId)).size,
  manualFeatures: records.length,
  tagCounts: Object.fromEntries(tagCounts),
  classCounts: Object.fromEntries(classCounts),
  records,
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
  console.log("\nReusable mechanic batches:");
  for (const [tag, count] of tagCounts) console.log(`${String(count).padStart(4)}  ${tag}`);
  console.log("\nLargest class queues:");
  for (const [classId, count] of classCounts.slice(0, 15)) console.log(`${String(count).padStart(4)}  ${classId}`);
}
