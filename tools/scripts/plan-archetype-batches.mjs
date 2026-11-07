import archetypes from "../../generated/pf1e-archetypes.mjs";
import feats from "../../generated/pf1e-feats.mjs";
import spells from "../../generated/pf1e-spells.mjs";
import { archetypeAutomationSummary } from "../../packages/engine/src/index.js";

const args = process.argv.slice(2);
const positional = args.filter((value) => !value.startsWith("--"));
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")
    ? args[index + 1]
    : fallback;
};
const limit = Number.parseInt(option("--limit", positional[0] ?? "30"), 10);
const minimum = Number.parseInt(option("--min", positional[1] ?? "2"), 10);
const classFilter = option("--class", "");
const json = args.includes("--json");

const normalizeName = (value) => String(value ?? "")
  .replace(/\s*\((?:ex|sp|su)\)\s*$/i, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const records = archetypes
  .filter((archetype) => !classFilter || archetype.classId === classFilter)
  .flatMap((archetype) => {
    const manual = new Set(archetypeAutomationSummary(archetype, feats, spells).manual);
    const features = (archetype.replacements ?? [])
      .flatMap((replacement) => replacement.features ?? [])
      .filter((feature) => manual.has(`${feature.name} (level ${feature.level})`));
    return features.map((feature) => ({
      archetypeId: archetype.id,
      archetypeName: archetype.name,
      classId: archetype.classId,
      featureId: feature.id,
      featureName: feature.name,
      normalizedName: normalizeName(feature.name),
      level: feature.level,
      summary: String(feature.summary ?? "").replace(/\s+/g, " ").trim(),
      manualCount: manual.size,
    }));
  });

const families = [...records.reduce((groups, record) => {
  const group = groups.get(record.normalizedName) ?? [];
  group.push(record);
  groups.set(record.normalizedName, group);
  return groups;
}, new Map()).entries()]
  .map(([key, entries]) => {
    const archetypeIds = new Set(entries.map((entry) => entry.archetypeId));
    const classes = [...new Set(entries.map((entry) => entry.classId))].sort();
    const names = entries.reduce((counts, entry) => {
      counts.set(entry.featureName, (counts.get(entry.featureName) ?? 0) + 1);
      return counts;
    }, new Map());
    const name = [...names.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
    return {
      key,
      name,
      features: entries.length,
      archetypes: archetypeIds.size,
      singleManualArchetypes: new Set(entries.filter((entry) => entry.manualCount === 1).map((entry) => entry.archetypeId)).size,
      classes,
      samples: entries.slice(0, 3).map(({ archetypeId, classId, featureId, level, summary }) => ({ archetypeId, classId, featureId, level, summary })),
    };
  })
  .filter((family) => family.features >= minimum)
  .sort((left, right) =>
    right.singleManualArchetypes - left.singleManualArchetypes ||
    right.features - left.features ||
    left.name.localeCompare(right.name),
  )
  .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 30);

const result = {
  manualFeatures: records.length,
  manualArchetypes: new Set(records.map((record) => record.archetypeId)).size,
  repeatedFamilies: families.length,
  families,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Manual features: ${result.manualFeatures} across ${result.manualArchetypes} archetypes`);
  console.log("Repeated feature-name families (prioritized by archetypes closed):");
  for (const family of families) {
    console.log(`${String(family.singleManualArchetypes).padStart(3)} close / ${String(family.features).padStart(3)} features / ${String(family.archetypes).padStart(3)} archetypes  ${family.name}  [${family.classes.join(", ")}]`);
  }
}
