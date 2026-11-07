import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-world-walker.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const favoredTerrain = features.find((feature) => /^Favored Terrain/.test(feature.name));
const pathOfTrees = features.find((feature) => /^Path of Trees/.test(feature.name));

Object.assign(favoredTerrain, {
  effectiveLevelClassIds: ["druid", "ranger"],
  favoredTerrainAdvancementOptionGroupId: "world-walker-favored-terrain-advancements",
});

pathOfTrees.resourceActions = [{
  id: "world-walker-path-of-trees",
  label: "Use Path of Trees",
  classId: "druid",
  minimumLevel: 9,
  resourceId: "pathOfTreesUses",
  cost: 1,
  actionTypeByLevel: [{ level: 9, actionType: "standard" }],
  modeLabel: "Travel mode",
  modes: [
    { id: "tree-stride", label: "Tree stride", minimumLevel: 9, summary: "Travel between trees using the distance limits for tree stride." },
    { id: "same-type-teleport", label: "Same-type tree teleport", minimumLevel: 13, summary: "Teleport to another tree of the same type up to 100 miles away." },
  ],
  confirmations: [{ id: "destination-tree", label: "A legal destination tree is available", requiredForActivation: true }],
  spellLikeAbility: { spellId: "tree-stride", spellName: "Tree Stride", cadence: "day", kind: "spell-equivalent" },
  summary: "Spend one daily use to travel by tree using the selected legal mode.",
}];

archetype.resourceAdjustments = [{
  resourceId: "pathOfTreesUses",
  label: "Path of Trees",
  unit: "use",
  operation: "add",
  minimumLevel: 9,
  base: 1,
  maximumByLevel: [{ level: 9, maximum: 1 }, { level: 12, maximum: 2 }, { level: 15, maximum: 3 }],
  maximum: 3,
  refreshCadence: "day",
  dedicatedAction: true,
}];

archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Favored Terrain selections, +2 bonus advancement, Druid-plus-Ranger effective-level stacking, daily Path of Trees uses, and both tree-travel modes are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated World Walker automation.");
