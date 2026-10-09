import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-tempest-tamer.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const speech = features.find((feature) => /^Speech of the Sea/.test(feature.name));
const walker = features.find((feature) => /^Whirlpool Walker/.test(feature.name));
const wildShape = features.find((feature) => /^Tempest Wild Shape/.test(feature.name));

speech.progressionProfiles = [{
  id: "tempest-tamer-bonus-languages",
  label: "Bonus language options",
  classId: "druid",
  columns: [
    { id: "added", label: "Added" },
    { id: "removed", label: "Removed" },
  ],
  steps: [{ level: 1, values: { added: "Aquan, Auran", removed: "Sylvan" } }],
  summary: "Use Aquan and Auran as Druid bonus-language options; Sylvan is not available from the class.",
}];

archetype.conditionalModifiers = [{
  sourceFeatureId: walker.id,
  label: "Whirlpool Walker",
  condition: "saving throws against air- or water-descriptor spells; spell-like or supernatural abilities of air, aquatic, or water creatures; and vortex, whirlpool, or similar damage or forced movement",
  minimumLevel: 4,
  base: 4,
  minimum: 4,
  maximum: 4,
}];

wildShape.resourceActions = [{
  id: "tempest-tamer-wild-shape",
  label: "Assume Tempest Wild Shape",
  classId: "druid",
  minimumLevel: 4,
  resourceId: "tempestWildShape",
  cost: 1,
  actionTypeByLevel: [{ level: 4, actionType: "standard" }],
  modeLabel: "Elemental form",
  modes: [
    { id: "small-water", label: "Small water elemental", minimumLevel: 4, summary: "Use elemental body I to assume a Small water elemental form." },
    { id: "small-air", label: "Small air elemental", minimumLevel: 6, summary: "Use elemental body I to assume a Small air elemental form." },
    { id: "medium-air", label: "Medium air elemental", minimumLevel: 8, summary: "Use elemental body II to assume a Medium air elemental form." },
    { id: "medium-water", label: "Medium water elemental", minimumLevel: 8, summary: "Use elemental body II to assume a Medium water elemental form." },
    { id: "large-air", label: "Large air elemental", minimumLevel: 10, summary: "Use elemental body III to assume a Large air elemental form." },
    { id: "large-water", label: "Large water elemental", minimumLevel: 10, summary: "Use elemental body III to assume a Large water elemental form." },
    { id: "huge-air", label: "Huge air elemental", minimumLevel: 12, summary: "Use elemental body IV to assume a Huge air elemental form." },
    { id: "huge-water", label: "Huge water elemental", minimumLevel: 12, summary: "Use elemental body IV to assume a Huge water elemental form." },
  ],
  activeEffect: {
    name: "Tempest Wild Shape",
    targets: ["self"],
    bonus: 0,
    description: "Air- or water-elemental form using the selected elemental body tier; lasts 1 hour per Druid level or until dismissed.",
    defaultRounds: 999,
    fixedRounds: true,
    replaceExisting: true,
  },
  summary: "Spend one use to assume an unlocked air or water elemental form for 1 hour per Druid level.",
}];

archetype.resourceAdjustments = [{
  resourceId: "tempestWildShape",
  label: "Tempest Wild Shape",
  unit: "use",
  operation: "add",
  minimumLevel: 4,
  base: 1,
  maximumByLevel: [4, 6, 8, 10, 12, 14, 16, 18].map((level, index) => ({ level, maximum: index + 1 })),
  maximum: 8,
  atWillAtLevel: 20,
  refreshCadence: "day",
  dedicatedAction: true,
}];

archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Aquan/Auran versus Sylvan language access, Whirlpool Walker's conditional +4 saves, all eight air/water elemental form tiers, daily uses, duration, and level-20 at-will access are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Tempest Tamer automation.");
