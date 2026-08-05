import archetypes from "../../generated/pf1e-archetypes.mjs";
import feats from "../../generated/pf1e-feats.mjs";
import {
  archetypeAutomationSummary,
  archetypeInitiativeBonusAdjustments,
} from "../../packages/engine/src/index.js";
import { inferredArchetypeInitiativeBonusDetails } from "../../packages/engine/src/archetype-initiative.js";

const rows = [];
const runtimeRows = [];
for (const archetype of archetypes) {
  const details = inferredArchetypeInitiativeBonusDetails(archetype);
  const runtime = new Set(archetypeInitiativeBonusAdjustments(archetype).map((adjustment) => JSON.stringify(adjustment)));
  for (const adjustment of details.adjustments) {
    const row = {
      archetypeId: archetype.id,
      classId: archetype.classId,
      featureId: adjustment.sourceFeatureId,
      fullyAutomated: details.fullyAutomatedFeatureIds.has(adjustment.sourceFeatureId),
      adjustment,
    };
    rows.push(row);
    if (runtime.has(JSON.stringify(adjustment))) runtimeRows.push(row);
  }
}

const manualFeatures = archetypes
  .filter((archetype) => (archetype.mechanicalCoverage ?? "partial") !== "full")
  .reduce((count, archetype) => {
    const manual = new Set(archetypeAutomationSummary(archetype, feats).manual);
    return count + (archetype.replacements ?? []).flatMap((replacement) => replacement.features ?? [])
      .filter((feature) => manual.has(`${feature.name} (level ${feature.level})`)).length;
  }, 0);
console.log(`Inferred initiative adjustments: ${rows.length}`);
console.log(`Affected archetypes: ${new Set(rows.map((row) => row.archetypeId)).size}`);
console.log(`Fully automated features: ${new Set(rows.filter((row) => row.fullyAutomated).map((row) => `${row.archetypeId}:${row.featureId}`)).size}`);
console.log(`New runtime adjustments after explicit overlays: ${runtimeRows.length}`);
console.log(`Conditional adjustments: ${runtimeRows.filter((row) => row.adjustment.condition).length}`);
console.log(`Permanent roll adjustments: ${runtimeRows.filter((row) => !row.adjustment.condition).length}`);
console.log(`Remaining manual features: ${manualFeatures}`);
if (process.argv.includes("--details")) for (const row of rows) console.log(JSON.stringify(row));
if (process.argv.includes("--runtime-details")) for (const row of runtimeRows) console.log(JSON.stringify(row));
