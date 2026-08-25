import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const archetypeUrl = new URL("packages/data/src/archetypes/druid-death-druid.json", root);
const optionGroupUrl = new URL("packages/data/src/options/death-druid-phantom-focuses.json", root);
const source = {
  title: "Archives of Nethys",
  page: null,
  url: "https://www.aonprd.com/ArchetypeDisplay.aspx?FixedName=Druid%20Death%20Druid",
};

const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const replacement = archetype.replacements.find((item) => item.features?.some((feature) => feature.id === "druid-death-druid-phantom-1"));
if (!replacement) throw new Error("Death Druid Phantom feature was not found.");

const authoredFeatures = [
  {
    id: "druid-death-druid-phantom-1",
    name: "Phantom",
    level: 1,
    type: "selectable",
    summary: "Choose the phantom's emotional focus. The phantom advances using the death druid's Druid level as its Spiritualist level.",
    choiceRequired: true,
    optionGroupId: "death-druid-phantom-focuses",
    progressionKey: "death-druid-phantom-focus",
  },
  {
    id: "druid-death-druid-etheric-tether-1",
    name: "Etheric Tether",
    level: 1,
    type: "archetype",
    summary: "The manifested phantom must remain within 50 feet. Beyond that distance it takes damage, and at the end of the turn it is forced back into the death druid's consciousness if still outside the tether.",
  },
  {
    id: "druid-death-druid-bonded-manifestation-4",
    name: "Bonded Manifestation",
    level: 4,
    type: "archetype",
    summary: "Manifest the phantom partially through the death druid for 3 plus Druid level rounds per day. The rounds need not be consecutive.",
  },
  {
    id: "druid-death-druid-spiritual-bond-14",
    name: "Spiritual Bond",
    level: 14,
    type: "archetype",
    summary: "When damage would reduce the death druid below 0 hit points, the phantom can sacrifice hit points to prevent an equal amount of that damage while manifested in ectoplasmic form or within the death druid's consciousness.",
  },
];
const authoredIds = new Set(authoredFeatures.map((feature) => feature.id));
replacement.features = [...replacement.features.filter((feature) => !authoredIds.has(feature.id)), ...authoredFeatures]
  .sort((left, right) => left.level - right.level || left.id.localeCompare(right.id));

archetype.companionGrants = [{
  id: "phantom",
  kind: "phantom",
  label: "phantom",
  sourceFeatureId: "druid-death-druid-phantom-1",
  optionFeatureId: "druid-death-druid-phantom-1",
  minimumLevel: 1,
  rules: [
    "The phantom can manifest fully in ectoplasmic or incorporeal form after a 1-minute ritual.",
    "Etheric Tether limits the manifested phantom to 50 feet from the death druid.",
    "The phantom cannot manifest while an eidolon or shadow companion belonging to the death druid is manifested.",
    "When the phantom's unfinished business is resolved, a replacement phantom arrives during the next week.",
  ],
}];
archetype.resourceAdjustments = [{
  sourceFeatureId: "druid-death-druid-bonded-manifestation-4",
  resourceId: "bondedManifestation",
  label: "Bonded Manifestation",
  unit: "round",
  operation: "replace",
  minimumLevel: 4,
  base: 3,
  levelMultiplier: 1,
  minimum: 0,
}];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = [
  "Phantom emotional focus, full level-scaled companion statistics, Etheric Tether, Bonded Manifestation rounds, and Spiritual Bond rules are automated.",
];

const optionGroup = {
  id: "death-druid-phantom-focuses",
  name: "Death Druid Phantom Emotional Focuses",
  classIds: ["druid"],
  inheritsOptionsFrom: "spiritualist-emotional-focuses",
  optionDefaults: {
    groupId: "death-druid-phantom-focuses",
    classIds: ["druid"],
    minimumLevel: 1,
    prerequisites: [],
    source,
  },
  options: [],
};

await writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`);
await writeFile(optionGroupUrl, `${JSON.stringify(optionGroup, null, 2)}\n`);
console.log("Annotated Death Druid phantom automation.");
