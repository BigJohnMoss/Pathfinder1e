import archetypes from "../../generated/pf1e-archetypes.mjs";
import feats from "../../generated/pf1e-feats.mjs";
import { archetypeAutomationSummary, inferArchetypeRerollActions, inferArchetypeResourceAdjustments } from "../../packages/engine/src/index.js";

const rows = archetypes.flatMap((archetype) => inferArchetypeRerollActions(archetype).map((entry) => ({
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

console.log(`Inferred reroll actions: ${rows.length}`);
console.log(`Affected archetypes: ${new Set(rows.map((row) => row.archetypeId)).size}`);
console.log(`Actions with tracked resources: ${rows.filter((row) => row.action.resourceId).length}`);
console.log(`Inferred archetype resources: ${archetypes.reduce((count, archetype) => count + inferArchetypeResourceAdjustments(archetype).length, 0)}`);
console.log(`Remaining manual features: ${manualFeatures}`);
if (process.argv.includes("--details")) for (const row of rows) console.log(JSON.stringify(row));
