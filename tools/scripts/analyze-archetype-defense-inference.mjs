import archetypes from "../../generated/pf1e-archetypes.mjs";
import feats from "../../generated/pf1e-feats.mjs";
import { archetypeAutomationSummary, archetypeDefenseAdjustments } from "../../packages/engine/src/index.js";
import { inferredArchetypeDefenseDetails } from "../../packages/engine/src/archetype-defenses.js";

const rows = [];
for (const archetype of archetypes) {
  const details = inferredArchetypeDefenseDetails(archetype);
  const runtime = new Set(archetypeDefenseAdjustments(archetype).map((adjustment) => JSON.stringify(adjustment)));
  for (const adjustment of details.adjustments) rows.push({ archetypeId: archetype.id, classId: archetype.classId, featureId: adjustment.sourceFeatureId, fullyAutomated: details.fullyAutomatedFeatureIds.has(adjustment.sourceFeatureId), runtime: runtime.has(JSON.stringify(adjustment)), adjustment });
}
const manualFeatures = archetypes.filter((archetype) => (archetype.mechanicalCoverage ?? "partial") !== "full").reduce((count, archetype) => {
  const manual = new Set(archetypeAutomationSummary(archetype, feats).manual);
  return count + (archetype.replacements ?? []).flatMap((replacement) => replacement.features ?? []).filter((feature) => manual.has(`${feature.name} (level ${feature.level})`)).length;
}, 0);
const runtimeRows = archetypes.flatMap((archetype) => archetypeDefenseAdjustments(archetype).map((adjustment) => ({ archetypeId: archetype.id, adjustment })));
console.log(`Inferred defense adjustments: ${rows.length}`);
console.log(`Runtime defense adjustments: ${runtimeRows.length}`);
console.log(`Affected archetypes: ${new Set(runtimeRows.map((row) => row.archetypeId)).size}`);
console.log(`Fully automated features: ${new Set(rows.filter((row) => row.fullyAutomated).map((row) => `${row.archetypeId}:${row.featureId}`)).size}`);
for (const kind of ["damageReduction", "energyResistance", "spellResistance", "immunity", "evasion", "improvedEvasion", "uncannyDodge", "improvedUncannyDodge", "fortification", "concealment", "missChance", "fastHealing"]) console.log(`${kind}: ${runtimeRows.filter((row) => row.adjustment.kind === kind).length}`);
console.log(`Conditional adjustments: ${runtimeRows.filter((row) => row.adjustment.condition).length}`);
console.log(`Remaining manual features: ${manualFeatures}`);
if (process.argv.includes("--details")) for (const row of rows) console.log(JSON.stringify(row));
