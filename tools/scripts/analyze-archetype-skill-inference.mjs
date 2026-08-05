import archetypes from "../../generated/pf1e-archetypes.mjs";
import { inferredArchetypeSkillBonusDetails } from "../../packages/engine/src/archetype-skills.js";

const rows = [];
const newRows = [];
for (const archetype of archetypes) {
  const details = inferredArchetypeSkillBonusDetails(archetype);
  const explicitKeys = new Set((archetype.skillBonusAdjustments ?? []).map((adjustment) => `${adjustment.skill}:${adjustment.condition ?? ""}`));
  for (const adjustment of details.adjustments) {
    const row = {
      archetypeId: archetype.id,
      classId: archetype.classId,
      featureId: adjustment.sourceFeatureId,
      fullyAutomated: details.fullyAutomatedFeatureIds.has(adjustment.sourceFeatureId),
      adjustment,
    };
    rows.push(row);
    if (!explicitKeys.has(`${adjustment.skill}:${adjustment.condition ?? ""}`)) newRows.push(row);
  }
}

console.log(`Inferred adjustments: ${rows.length}`);
console.log(`Affected archetypes: ${new Set(rows.map((row) => row.archetypeId)).size}`);
console.log(`Affected features: ${new Set(rows.map((row) => `${row.archetypeId}:${row.featureId}`)).size}`);
console.log(`Fully automated features: ${new Set(rows.filter((row) => row.fullyAutomated).map((row) => `${row.archetypeId}:${row.featureId}`)).size}`);
console.log(`New runtime adjustments after explicit overlays: ${newRows.length}`);
if (process.argv.includes("--details")) for (const row of rows) console.log(JSON.stringify(row));
