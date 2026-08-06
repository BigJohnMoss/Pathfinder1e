import archetypes from "../../generated/pf1e-archetypes.mjs";
import feats from "../../generated/pf1e-feats.mjs";
import { archetypeAutomationSummary, inferArchetypeTemporaryHitPointActions } from "../../packages/engine/src/index.js";

const rows = archetypes.flatMap((archetype) => inferArchetypeTemporaryHitPointActions(archetype).map((entry) => ({
  archetypeId: archetype.id,
  classId: archetype.classId,
  ...entry,
})));
const manualFeatures = archetypes
  .filter((archetype) => (archetype.mechanicalCoverage ?? "partial") !== "full")
  .reduce((count, archetype) => {
    const manual = new Set(archetypeAutomationSummary(archetype, feats).manual);
    return count + (archetype.replacements ?? []).flatMap((replacement) => replacement.features ?? [])
      .filter((feature) => manual.has(`${feature.name} (level ${feature.level})`)).length;
  }, 0);

console.log(`Inferred temporary-hit-point actions: ${rows.length}`);
console.log(`Affected archetypes: ${new Set(rows.map((row) => row.archetypeId)).size}`);
console.log(`Actions with bounded resources: ${rows.filter((row) => row.action.resourceId).length}`);
console.log(`Actions with tracked expiry: ${rows.filter((row) => row.action.temporaryHitPointsDurationRoundsByLevel?.length).length}`);
console.log(`Remaining manual features: ${manualFeatures}`);
if (process.argv.includes("--details")) for (const row of rows) console.log(JSON.stringify(row));
