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

## Class progression

| Class | Features | Highest feature level | Archetypes |
|---|---:|---:|---:|
${classRows}
`;

const output = new URL("docs/generated-content-coverage.md", root);
if (process.argv.includes("--check")) {
  const current = await readFile(output, "utf8").catch(() => "");
  if (current !== report) {
    console.error("docs/generated-content-coverage.md is stale. Run npm run coverage.");
    process.exitCode = 1;
  } else {
    console.log("Generated content coverage is current.");
  }
} else {
  await writeFile(output, report);
  console.log("Updated docs/generated-content-coverage.md.");
}
