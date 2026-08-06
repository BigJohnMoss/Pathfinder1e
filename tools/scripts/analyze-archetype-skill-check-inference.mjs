import archetypes from "../../generated/pf1e-archetypes.mjs";
import feats from "../../generated/pf1e-feats.mjs";
import { archetypeAutomationSummary, inferArchetypeSkillCheckRules } from "../../packages/engine/src/index.js";
import { inferredArchetypeSkillCheckDetails } from "../../packages/engine/src/archetype-skill-checks.js";

const rows = archetypes.flatMap((archetype) => inferArchetypeSkillCheckRules(archetype).map((rule) => ({ archetype, rule })));
const manualFeatures = archetypes.filter((archetype) => (archetype.mechanicalCoverage ?? "partial") !== "full").reduce((total, archetype) => {
  const manual = new Set(archetypeAutomationSummary(archetype, feats).manual);
  return total + (archetype.replacements ?? []).flatMap((replacement) => replacement.features ?? []).filter((feature) => manual.has(`${feature.name} (level ${feature.level})`)).length;
}, 0);
console.log(`Inferred deterministic skill-check rules: ${rows.length}`);
console.log(`Affected archetypes: ${new Set(rows.map(({ archetype }) => archetype.id)).size}`);
console.log(`Fully automated features: ${archetypes.reduce((total, archetype) => total + inferredArchetypeSkillCheckDetails(archetype).fullyAutomatedFeatureIds.size, 0)}`);
console.log(`Take 10 rules: ${rows.filter(({ rule }) => rule.result === 10).length}`);
console.log(`Take 20 rules: ${rows.filter(({ rule }) => rule.result === 20).length}`);
console.log(`Conditional rules: ${rows.filter(({ rule }) => rule.condition).length}`);
console.log(`Remaining manual features: ${manualFeatures}`);
