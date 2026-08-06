import archetypes from "../../generated/pf1e-archetypes.mjs";
import feats from "../../generated/pf1e-feats.mjs";
import { archetypeAutomationSummary, archetypeLandSpeedAdjustments } from "../../packages/engine/src/index.js";
import { inferredArchetypeLandSpeedDetails } from "../../packages/engine/src/archetype-movement.js";

const rows = [];
for (const archetype of archetypes) {
  const details = inferredArchetypeLandSpeedDetails(archetype);
  const runtime = new Set(archetypeLandSpeedAdjustments(archetype).map((adjustment) => JSON.stringify(adjustment)));
  for (const adjustment of details.adjustments) rows.push({ archetypeId: archetype.id, classId: archetype.classId, featureId: adjustment.sourceFeatureId, fullyAutomated: details.fullyAutomatedFeatureIds.has(adjustment.sourceFeatureId), runtime: runtime.has(JSON.stringify(adjustment)), adjustment });
}
const manualFeatures = archetypes.filter((archetype) => (archetype.mechanicalCoverage ?? "partial") !== "full").reduce((count, archetype) => {
  const manual = new Set(archetypeAutomationSummary(archetype, feats).manual);
  return count + (archetype.replacements ?? []).flatMap((replacement) => replacement.features ?? []).filter((feature) => manual.has(`${feature.name} (level ${feature.level})`)).length;
}, 0);
const runtimeRows = rows.filter((row) => row.runtime);
console.log(`Inferred land-speed adjustments: ${rows.length}`);
console.log(`Affected archetypes: ${new Set(rows.map((row) => row.archetypeId)).size}`);
console.log(`Fully automated features: ${new Set(rows.filter((row) => row.fullyAutomated).map((row) => `${row.archetypeId}:${row.featureId}`)).size}`);
console.log(`Runtime land-speed adjustments: ${runtimeRows.length}`);
console.log(`Conditional adjustments: ${runtimeRows.filter((row) => row.adjustment.condition).length}`);
console.log(`Equipment-aware adjustments: ${runtimeRows.filter((row) => row.adjustment.armorCategories?.length || row.adjustment.prohibitedLoads?.length).length}`);
console.log(`Remaining manual features: ${manualFeatures}`);
if (process.argv.includes("--details")) for (const row of rows) console.log(JSON.stringify(row));
