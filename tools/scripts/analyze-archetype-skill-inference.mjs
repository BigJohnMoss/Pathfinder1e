import archetypes from "../../generated/pf1e-archetypes.mjs";
import feats from "../../generated/pf1e-feats.mjs";
import { archetypeAutomationSummary } from "../../packages/engine/src/index.js";
import { inferredArchetypeSkillBonusDetails } from "../../packages/engine/src/archetype-skills.js";

if (process.argv.includes("--scaling-candidates")) {
  const candidates = [];
  for (const archetype of archetypes) {
    const manual = new Set(archetypeAutomationSummary(archetype, feats).manual);
    for (const replacement of archetype.replacements ?? []) {
      for (const feature of replacement.features ?? []) {
        if (!manual.has(`${feature.name} (level ${feature.level})`)) continue;
        const summary = String(feature.summary ?? "").replace(/\s+/g, " ");
        if (!/\bbonus(?:es)?[^.]{0,80}(?:double|increase)|\bincreases? (?:this|the) bonus\b/i.test(summary) || !/\bchecks?\b/i.test(summary)) continue;
        candidates.push({ archetypeId: archetype.id, classId: archetype.classId, featureId: feature.id, feature: feature.name, level: feature.level, summary });
      }
    }
  }
  console.log(`Scaling candidates: ${candidates.length}`);
  console.log(`Candidate archetypes: ${new Set(candidates.map((candidate) => candidate.archetypeId)).size}`);
  if (process.argv.includes("--details")) for (const candidate of candidates) console.log(JSON.stringify(candidate));
  process.exit(0);
}

const rows = [];
const newRows = [];
for (const archetype of archetypes) {
  const details = inferredArchetypeSkillBonusDetails(archetype);
  const explicitSourceKeys = new Set((archetype.skillBonusAdjustments ?? []).filter((adjustment) => adjustment.sourceFeatureId).map((adjustment) => `${adjustment.sourceFeatureId}:${adjustment.skill}`));
  const explicitValueKeys = new Set((archetype.skillBonusAdjustments ?? []).map((adjustment) => `${adjustment.skill}:${adjustment.condition ?? ""}`));
  for (const adjustment of details.adjustments) {
    const row = {
      archetypeId: archetype.id,
      classId: archetype.classId,
      featureId: adjustment.sourceFeatureId,
      fullyAutomated: details.fullyAutomatedFeatureIds.has(adjustment.sourceFeatureId),
      adjustment,
    };
    rows.push(row);
    if (!explicitSourceKeys.has(`${adjustment.sourceFeatureId ?? ""}:${adjustment.skill}`) && !explicitValueKeys.has(`${adjustment.skill}:${adjustment.condition ?? ""}`)) newRows.push(row);
  }
}

console.log(`Inferred adjustments: ${rows.length}`);
console.log(`Affected archetypes: ${new Set(rows.map((row) => row.archetypeId)).size}`);
console.log(`Affected features: ${new Set(rows.map((row) => `${row.archetypeId}:${row.featureId}`)).size}`);
console.log(`Fully automated features: ${new Set(rows.filter((row) => row.fullyAutomated).map((row) => `${row.archetypeId}:${row.featureId}`)).size}`);
console.log(`New runtime adjustments after explicit overlays: ${newRows.length}`);
if (process.argv.includes("--details")) for (const row of rows) console.log(JSON.stringify(row));
if (process.argv.includes("--new-details")) for (const row of newRows) console.log(JSON.stringify(row));
