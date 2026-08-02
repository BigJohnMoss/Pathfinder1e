import { readFile, readdir, writeFile } from "node:fs/promises";
import { inferArchetypeClassSkillChanges, inferArchetypeProficiencyAdjustments, inferArchetypeResourceAdjustments, inferArchetypeSkillRankAdjustment } from "../../packages/engine/src/index.js";

const root = new URL("../../", import.meta.url);
const directory = new URL("packages/data/src/archetypes/", root);
const reportFile = new URL("docs/generated-archetype-coverage.md", root);
const files = (await readdir(directory)).filter(file => file.endsWith(".json")).sort();
const records = [];
const ancestryIds = new Map([
  ["Dwarf", "dwarf"],
  ["Elf", "elf"],
  ["Gnome", "gnome"],
  ["Half-Elf", "half-elf"],
  ["Half-Orc", "half-orc"],
  ["Halfling", "halfling"],
  ["Human", "human"]
]);

for (const file of files) {
  const url = new URL(file, directory);
  const archetype = JSON.parse(await readFile(url, "utf8"));
  const generated = archetype.source?.title === "Archives of Nethys";
  const coverage = archetype.mechanicalCoverage ?? (generated ? "partial" : "full");
  const notes = archetype.mechanicalNotes ?? (coverage === "partial"
    ? ["Replacement progression is automated. Bespoke effects without a shared builder subsystem remain descriptive."]
    : []);
  const ancestryOnly = archetype.summary?.match(/^\(([^)]+) Only\)/i)?.[1];
  const namedAncestries = ancestryOnly?.split(/\s+and\s+/i) ?? [];
  const supportedAncestryIds = namedAncestries.map(name => ancestryIds.get(name)).filter(Boolean);
  const requirements = archetype.requirements ?? (supportedAncestryIds.length === 1
    ? [{ type: "ancestry", id: supportedAncestryIds[0] }]
    : supportedAncestryIds.length > 1
      ? [{ type: "any", prerequisites: supportedAncestryIds.map(id => ({ type: "ancestry", id })) }]
      : []);
  const manualRequirements = archetype.manualRequirements ?? (ancestryOnly && supportedAncestryIds.length !== namedAncestries.length
    ? [`Restricted to ${ancestryOnly} characters; that ancestry is not yet available in this builder.`]
    : []);
  const updated = {
    ...archetype,
    mechanicalCoverage: coverage,
    ...(notes.length ? { mechanicalNotes: notes } : {}),
    ...(requirements.length ? { requirements } : {}),
    ...(manualRequirements.length ? { manualRequirements } : {})
  };
  await writeFile(url, `${JSON.stringify(updated, null, 2)}\n`);
  records.push(updated);
}

const byClass = new Map();
for (const archetype of records) byClass.set(archetype.classId, [...(byClass.get(archetype.classId) ?? []), archetype]);
const inferredClassSkillCount = records.filter(archetype => {
  const inferred = inferArchetypeClassSkillChanges(archetype);
  return inferred.additions.length > 0 || inferred.removals.length > 0;
}).length;
const inferredProficiencyCount = records.filter(archetype =>
  inferArchetypeProficiencyAdjustments(archetype).length > 0
).length;
const inferredSkillRankCount = records.filter(archetype =>
  inferArchetypeSkillRankAdjustment(archetype)
).length;
const automatedResourceCount = records.filter(archetype =>
  (archetype.resourceAdjustments?.length ?? 0) > 0 || inferArchetypeResourceAdjustments(archetype).length > 0
).length;
const lines = [
  "# Generated Archetype Mechanical Coverage",
  "",
  "This report distinguishes selectable replacement integration from bespoke rules automation.",
  "",
  "| Class | Full | Partial | Descriptive | Total |",
  "|---|---:|---:|---:|---:|",
  ...[...byClass].sort(([left], [right]) => left.localeCompare(right)).map(([classId, archetypes]) => {
    const count = coverage => archetypes.filter(archetype => archetype.mechanicalCoverage === coverage).length;
    return `| ${classId[0].toUpperCase()}${classId.slice(1)} | ${count("full")} | ${count("partial")} | ${count("descriptive")} | ${archetypes.length} |`;
  }),
  "",
  "## Definitions",
  "",
  "- **Full:** replacement progression and bespoke selections/effects use existing builder subsystems.",
  "- **Partial:** replacement progression is automated; one-off effects remain readable rules text.",
  "- **Descriptive:** the rules are present for reference but require manual handling.",
  "",
  "## Shared subsystem automation",
  "",
  `- **Class-skill rules:** ${inferredClassSkillCount} archetypes have calculated additions or removals recognized from standard rules text.`,
  `- **Weapon and armor proficiency rules:** ${inferredProficiencyCount} archetypes have calculated grants, losses, or exceptions recognized from standard rules text.`,
  `- **Skill-rank progression rules:** ${inferredSkillRankCount} archetypes have calculated fixed or additive ranks per level recognized from standard rules text.`,
  `- **Reusable daily resources:** ${automatedResourceCount} archetypes have bounded fixed, level-scaled, or ability-scaled pools connected to spend, refresh, and persistence controls.`
];
await writeFile(reportFile, `${lines.join("\n")}\n`);
console.log(`Annotated ${records.length} archetypes and updated ${reportFile.pathname}.`);
