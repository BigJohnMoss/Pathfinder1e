import { readFile, writeFile } from "node:fs/promises";

const archetypeUrl = new URL("../../packages/data/src/archetypes/paladin-holy-guide.json", import.meta.url);
const optionUrl = new URL("../../packages/data/src/options/holy-guide-favored-terrain-mercies.json", import.meta.url);
const terrainUrl = new URL("../../packages/data/src/options/ranger-favored-terrains.json", import.meta.url);
const source = { title: "Archives of Nethys", page: null, url: "https://www.aonprd.com/ArchetypeDisplay.aspx?FixedName=Paladin%20Holy%20Guide" };

const [archetype, terrainGroup] = await Promise.all([
  readFile(archetypeUrl, "utf8").then(JSON.parse),
  readFile(terrainUrl, "utf8").then(JSON.parse),
]);
archetype.optionGroupAugmentations = [
  ...(archetype.optionGroupAugmentations ?? []).filter((entry) => entry.sourceGroupId !== "holy-guide-favored-terrain-mercies"),
  { targetGroupId: "paladin-mercies", sourceGroupId: "holy-guide-favored-terrain-mercies", minimumFeatureLevel: 9 },
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["The initial favored terrain, every later mercy-or-terrain choice, unique terrain selection, required +2 bonus increase, and resulting terrain bonuses are automated."];

const optionGroup = {
  id: "holy-guide-favored-terrain-mercies",
  name: "Holy Guide Favored Terrain Alternatives",
  classIds: ["paladin"],
  source,
  optionDefaults: {
    groupId: "holy-guide-favored-terrain-mercies",
    classIds: ["paladin"],
    minimumLevel: 9,
    prerequisites: [],
    source,
    favoredTerrainAdvancement: { newTerrainBonus: 2, increaseBonus: 2 },
    choice: { key: "favoredTerrainIncrease", label: "Increase favored terrain bonus", optionSource: "selected-favored-terrains" },
  },
  options: terrainGroup.options.map((terrain) => ({
    id: `holy-guide-favored-terrain-${terrain.id.replace(/^ranger-terrain-/, "")}`,
    name: `${terrain.name} favored terrain`,
    favoredTerrainId: terrain.id,
    benefit: `Choose ${terrain.name.toLowerCase()} as a new favored terrain with a +2 bonus, then increase one of your favored-terrain bonuses by +2. This replaces the mercy selected at this level.`,
  })),
};

await Promise.all([
  writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`),
  writeFile(optionUrl, `${JSON.stringify(optionGroup, null, 2)}\n`),
]);
console.log("Annotated Holy Guide favored-terrain mercy alternatives.");
