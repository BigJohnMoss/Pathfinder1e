import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const data = JSON.parse(await readFile(new URL("generated/pf1e-data.json", root), "utf8"));
const equipment = JSON.parse(await readFile(new URL("packages/data/src/equipment/core-equipment.json", root), "utf8"));

function prerequisiteNodes(value) {
  if (!value || typeof value !== "object") return [];
  return [value, ...Object.values(value).flatMap(prerequisiteNodes)];
}

const prerequisiteRecords = data.feats.flatMap((feat) => prerequisiteNodes(feat.prerequisites));
const structuredPrerequisites = prerequisiteRecords.filter((item) => item.type && item.type !== "rule").length;
const manualPrerequisites = prerequisiteRecords.filter((item) => item.type === "rule").length;
const featsWithManualPrerequisites = data.feats.filter((feat) =>
  prerequisiteNodes(feat.prerequisites).some((item) => item.type === "rule")
).length;
const spellsWithFullRules = data.spells.filter((spell) => spell.description?.trim()).length;
const spellsWithSources = data.spells.filter((spell) => spell.source?.url).length;
const spellsWithCoreStats = data.spells.filter((spell) => spell.castingTime && spell.components?.length && spell.range && spell.duration).length;
const archetypeCoverage = Object.fromEntries(["full", "partial", "descriptive"].map((coverage) => [
  coverage,
  data.archetypes.filter((archetype) => (archetype.mechanicalCoverage ?? "partial") === coverage).length,
]));
const archetypeCoverageBaseline = { full: 76, partial: 1119, descriptive: 0 };
const structuredArchetypeAutomation = {
  resources: data.archetypes.filter((archetype) => archetype.resourceAdjustments?.length).length,
  companions: data.archetypes.filter((archetype) => archetype.companionGrants?.length || archetype.companionProgressionAdjustments?.length).length,
  spellcasting: data.archetypes.filter((archetype) => archetype.removesSpellcasting || archetype.spellListAdditions || archetype.bonusSpellAdditions || archetype.spellSlotAdjustmentPerLevel !== undefined || archetype.preparedSpellAdjustmentPerLevel !== undefined || archetype.spellsKnownAdjustmentPerLevel !== undefined).length,
  skills: data.archetypes.filter((archetype) => archetype.classSkillAdditions?.length || archetype.classSkillRemovals?.length || archetype.skillRanksPerLevel !== undefined).length,
  combatAndProficiencies: data.archetypes.filter((archetype) => archetype.babProgression || archetype.saveProgressionOverrides || archetype.hitDie || archetype.proficiencyAdjustments?.length).length,
};
const partialArchetypes = data.archetypes.filter((archetype) => (archetype.mechanicalCoverage ?? "partial") === "partial");
const archetypeText = (archetype) => JSON.stringify({
  summary: archetype.summary,
  replacesText: archetype.replacesText,
  replacements: archetype.replacements,
  featureOverrides: archetype.featureOverrides,
  mechanicalNotes: archetype.mechanicalNotes,
}).toLowerCase();
const automationSignals = [
  ["Resources and limited uses", /\b(pool|point|round|use(?:s)? per day|daily|resource)\b/],
  ["Companions, mounts, familiars, and eidolons", /\b(companion|mount|familiar|eidolon)\b/],
  ["Spell lists, slots, and casting", /\b(spell|caster|casting|cantrip|extract)\b/],
  ["Selectable progressions and dependent choices", /\b(choose|choice|select|option|talent|discovery|exploit|hex|revelation|arcana)\b/],
  ["Combat statistics and proficiencies", /\b(attack|damage|armor|armour|shield|save|initiative|proficien|base attack|ac\b)\b/],
  ["Skills", /\bskill|acrobatics|perception|stealth|spellcraft|knowledge\b/],
  ["Feats", /\b(feat|teamwork)\b/],
];
const automationCandidateCounts = automationSignals.map(([label, pattern]) => [
  label,
  partialArchetypes.filter((archetype) => pattern.test(archetypeText(archetype))).length,
]);
const categorizedPartialIds = new Set(partialArchetypes.filter((archetype) => automationSignals.some(([, pattern]) => pattern.test(archetypeText(archetype)))).map((archetype) => archetype.id));
const classRows = [...data.classes]
  .sort((left, right) => left.name.localeCompare(right.name))
  .map((characterClass) => {
    const featureLevels = (characterClass.features ?? []).map((feature) => feature.level ?? 0);
    const maximumFeatureLevel = featureLevels.length ? Math.max(...featureLevels) : 0;
    const archetypeCount = data.archetypes.filter((archetype) => archetype.classId === characterClass.id).length;
    return `| ${characterClass.name} | ${characterClass.features?.length ?? 0} | ${maximumFeatureLevel || "—"} | ${archetypeCount} |`;
  })
  .join("\n");

const report = `# Generated content coverage

This report is generated from the application's source data by \`npm run coverage\`. Run \`npm run coverage:check\` to detect stale documentation.

## Catalogue

| Area | Records |
|---|---:|
| Classes | ${data.classes.length} |
| Archetypes | ${data.archetypes.length} |
| Ancestries | ${data.races.length} |
| Option groups | ${data.optionGroups.length} |
| Feats | ${data.feats.length} |
| Traits | ${data.traits.length} |
| Spells | ${data.spells.length} |
| Equipment | ${equipment.items.length} |

## Feat prerequisites

| Coverage | Count |
|---|---:|
| Structured prerequisite rules | ${structuredPrerequisites} |
| Manual-review prerequisite rules | ${manualPrerequisites} |
| Feats containing a manual-review rule | ${featsWithManualPrerequisites} |

Manual-review rules remain visibly locked in the builder. They are not silently treated as satisfied.

## Archetype automation

| Coverage | Count |
|---|---:|
| Fully automated | ${archetypeCoverage.full} |
| Partially automated | ${archetypeCoverage.partial} |
| Rules reference only | ${archetypeCoverage.descriptive} |

### Structured automation

| Reusable subsystem | Archetypes |
|---|---:|
| Resources and limited uses | ${structuredArchetypeAutomation.resources} |
| Companions and effective levels | ${structuredArchetypeAutomation.companions} |
| Spell lists, slots, and casting | ${structuredArchetypeAutomation.spellcasting} |
| Class skills and skill-rank progressions | ${structuredArchetypeAutomation.skills} |
| Combat statistics and proficiencies | ${structuredArchetypeAutomation.combatAndProficiencies} |

Partial archetypes apply their replacement progression, restrictions, stacking rules, and persistence. Bespoke effects without a shared builder subsystem remain visibly identified for manual handling.

### Partial-archetype automation candidates

These rule-text signals are multi-label: one archetype can contribute to several subsystem queues.

| Candidate subsystem | Partial archetypes |
|---|---:|
${automationCandidateCounts.map(([label, count]) => `| ${label} | ${count} |`).join("\n")}
| Narrative or uncategorized effects | ${partialArchetypes.length - categorizedPartialIds.size} |

## Spell details

| Coverage | Count |
|---|---:|
| Full rules descriptions | ${spellsWithFullRules} |
| Rules source links | ${spellsWithSources} |
| Core casting statistics | ${spellsWithCoreStats} |

## Class progression

| Class | Features | Highest feature level | Archetypes |
|---|---:|---:|---:|
${classRows}
`;

const output = new URL("docs/generated-content-coverage.md", root);
if (process.argv.includes("--check")) {
  const coverageRegressions = [
    archetypeCoverage.full < archetypeCoverageBaseline.full && `fully automated archetypes fell below ${archetypeCoverageBaseline.full}`,
    archetypeCoverage.partial > archetypeCoverageBaseline.partial && `partial archetypes exceeded ${archetypeCoverageBaseline.partial}`,
    archetypeCoverage.descriptive > archetypeCoverageBaseline.descriptive && "rules-reference-only archetypes were introduced",
  ].filter(Boolean);
  if (coverageRegressions.length) {
    console.error(`Archetype automation coverage regressed: ${coverageRegressions.join("; ")}.`);
    process.exitCode = 1;
  }
  const current = await readFile(output, "utf8").catch(() => "");
  const normalizedCurrent = current.replace(/\r\n/g, "\n");
  if (normalizedCurrent !== report) {
    console.error("docs/generated-content-coverage.md is stale. Run npm run coverage.");
    process.exitCode = 1;
  } else {
    console.log("Generated content coverage is current.");
  }
} else {
  await writeFile(output, report);
  console.log("Updated docs/generated-content-coverage.md.");
}
