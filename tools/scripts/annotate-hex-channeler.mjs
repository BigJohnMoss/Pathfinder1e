import { readFile, writeFile } from "node:fs/promises";

const archetypeUrl = new URL("../../packages/data/src/archetypes/witch-hex-channeler.json", import.meta.url);
const polarityUrl = new URL("../../packages/data/src/options/hex-channeler-polarities.json", import.meta.url);
const advancementUrl = new URL("../../packages/data/src/options/hex-channeler-channel-advancements.json", import.meta.url);
const source = { title: "Archives of Nethys", page: null, url: "https://www.aonprd.com/ArchetypeDisplay.aspx?FixedName=Witch%20Hex%20Channeler" };
const levels = [4, 6, 8, 10, 12, 14, 16, 18, 20];
const advancementIds = levels.map((level) => `hex-channeler-channel-die-${level}`);

const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const replacement = archetype.replacements.find((entry) => entry.features.some((feature) => feature.id === "witch-hex-channeler-channel-energy-su-2"));
const channel = replacement?.features.find((feature) => feature.id === "witch-hex-channeler-channel-energy-su-2");
if (!replacement || !channel) throw new Error("Hex Channeler channel feature is missing");

channel.channelEnergyDiceAdvancementOptionIds = advancementIds;
channel.channelEnergyPolarityOptionIds = { positive: "hex-channeler-positive", negative: "hex-channeler-negative" };
const polarityFeature = {
  id: "witch-hex-channeler-energy-polarity-2",
  name: "Channel Energy Polarity",
  level: 2,
  type: "archetype",
  summary: "Good witches channel positive energy and evil witches channel negative energy. A neutral witch makes one permanent polarity choice.",
  choiceRequired: true,
  optionGroupId: "hex-channeler-polarities",
  progressionKey: "hex-channeler-polarity",
};
replacement.features = [...replacement.features.filter((feature) => feature.id !== polarityFeature.id), polarityFeature];
archetype.optionGroupAugmentations = [
  ...(archetype.optionGroupAugmentations ?? []).filter((entry) => entry.sourceGroupId !== "hex-channeler-channel-advancements"),
  { targetGroupId: "witch-hexes", sourceGroupId: "hex-channeler-channel-advancements", minimumFeatureLevel: 4 },
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Channel polarity, daily uses, exact 1d6 base channel, every persistent hex-for-+1d6 advancement choice, mode targeting, saving throws, and resource spending are automated."];

const polarities = {
  id: "hex-channeler-polarities",
  name: "Hex Channeler Energy Polarity",
  classIds: ["witch"],
  source,
  optionDefaults: { groupId: "hex-channeler-polarities", classIds: ["witch"], minimumLevel: 2, prerequisites: [], source },
  options: [
    { id: "hex-channeler-positive", name: "Positive Energy", benefit: "Heal living creatures or harm undead with positive energy." },
    { id: "hex-channeler-negative", name: "Negative Energy", benefit: "Heal undead or harm living creatures with negative energy." },
  ],
};

const advancements = {
  id: "hex-channeler-channel-advancements",
  name: "Hex Channeler Channel Advancements",
  classIds: ["witch"],
  source,
  optionDefaults: { groupId: "hex-channeler-channel-advancements", classIds: ["witch"], prerequisites: [], source },
  options: levels.map((level) => ({
    id: `hex-channeler-channel-die-${level}`,
    name: `Increase Channel Energy (+1d6; level ${level} opportunity)`,
    minimumLevel: level,
    benefit: "Forgo this hex selection to increase Channel Energy by 1d6 permanently.",
  })),
};

await Promise.all([
  writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`),
  writeFile(polarityUrl, `${JSON.stringify(polarities, null, 2)}\n`),
  writeFile(advancementUrl, `${JSON.stringify(advancements, null, 2)}\n`),
]);
console.log("Annotated Hex Channeler polarity and hex-for-die progression.");
