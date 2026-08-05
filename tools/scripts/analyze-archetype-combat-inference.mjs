import archetypes from "../../generated/pf1e-archetypes.mjs";
import feats from "../../generated/pf1e-feats.mjs";
import { archetypeAutomationSummary, archetypeCombatModifierAdjustments } from "../../packages/engine/src/index.js";
import { inferredArchetypeCombatModifierDetails } from "../../packages/engine/src/archetype-combat.js";

const rows = [];
const runtimeRows = [];
for (const archetype of archetypes) {
  const details = inferredArchetypeCombatModifierDetails(archetype);
  const runtime = new Set(archetypeCombatModifierAdjustments(archetype).map((adjustment) => JSON.stringify(adjustment)));
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
const targetCounts = runtimeRows.flatMap((row) => row.adjustment.combatTargets).reduce((counts, target) => ({ ...counts, [target]: (counts[target] ?? 0) + 1 }), {});
console.log(`Inferred combat adjustments: ${rows.length}`);
console.log(`Affected archetypes: ${new Set(rows.map((row) => row.archetypeId)).size}`);
console.log(`Fully automated features: ${new Set(rows.filter((row) => row.fullyAutomated).map((row) => `${row.archetypeId}:${row.featureId}`)).size}`);
console.log(`New runtime adjustments after explicit overlays: ${runtimeRows.length}`);
console.log(`Conditional adjustments: ${runtimeRows.filter((row) => row.adjustment.condition).length}`);
console.log(`Permanent combat adjustments: ${runtimeRows.filter((row) => !row.adjustment.condition).length}`);
console.log(`Targets: ${Object.entries(targetCounts).map(([target, count]) => `${target}=${count}`).join(", ")}`);
console.log(`Remaining manual features: ${manualFeatures}`);
if (process.argv.includes("--details")) for (const row of rows) console.log(JSON.stringify(row));
if (process.argv.includes("--runtime-details")) for (const row of runtimeRows) console.log(JSON.stringify(row));
