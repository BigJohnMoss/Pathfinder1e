import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const archetypeUrl = new URL("packages/data/src/archetypes/cavalier-oceanrider.json", root);
const optionGroupUrl = new URL("packages/data/src/options/oceanrider-aquatic-mounts.json", root);
const source = {
  title: "Archives of Nethys",
  page: 53,
  url: "https://www.aonprd.com/ArchetypeDisplay.aspx?FixedName=Cavalier%20Oceanrider",
};

const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const replacement = archetype.replacements.find((item) =>
  item.features?.some((feature) => feature.id === "cavalier-oceanrider-aquatic-mount-1"),
);
if (!replacement) throw new Error("Oceanrider Aquatic Mount feature was not found.");

const aquaticMount = replacement.features.find(
  (feature) => feature.id === "cavalier-oceanrider-aquatic-mount-1",
);
Object.assign(aquaticMount, {
  type: "selectable",
  summary: "Choose an aquatic mount allowed by the oceanrider's size. It advances as a full-level Cavalier mount.",
  choiceRequired: true,
  optionGroupId: "oceanrider-aquatic-mounts",
  progressionKey: "oceanrider-aquatic-mount",
});

archetype.companionGrants = [{
  id: "aquatic-mount",
  kind: "mount",
  label: "aquatic mount",
  sourceFeatureId: aquaticMount.id,
  optionFeatureId: aquaticMount.id,
  minimumLevel: 1,
  rules: [
    "The aquatic mount advances using the oceanrider's full Cavalier level as its animal companion level.",
    "Aquatic Mount replaces Expert Trainer and alters the normal Cavalier mount choices.",
  ],
}];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = [
  "Size-legal seahorse, orca, and dolphin selection, full-level mount progression, and the orca's early-Large exception are automated.",
];

const optionGroup = {
  id: "oceanrider-aquatic-mounts",
  name: "Oceanrider Aquatic Mounts",
  classIds: ["cavalier"],
  optionDefaults: {
    groupId: "oceanrider-aquatic-mounts",
    classIds: ["cavalier"],
    minimumLevel: 1,
    source,
  },
  options: [
    {
      id: "oceanrider-mount-seahorse",
      name: "Seahorse",
      prerequisites: [{ type: "size", minimum: "medium", maximum: "medium" }],
      benefit: "A Medium oceanrider gains a seahorse mount advancing as a full-level animal companion.",
      companionRules: ["This aquatic seahorse is available to a Medium oceanrider."],
    },
    {
      id: "oceanrider-mount-orca",
      name: "Orca",
      prerequisites: [{ type: "size", minimum: "medium", maximum: "medium" }],
      benefit: "A Medium oceanrider gains an orca mount. It starts Large but gains none of the other level-7 animal companion abilities until level 7.",
      companionRules: ["This orca starts at size Large, but gains none of its other level-7 animal companion abilities before level 7."],
    },
    {
      id: "oceanrider-mount-dolphin",
      name: "Dolphin",
      prerequisites: [{ type: "size", minimum: "small", maximum: "small" }],
      benefit: "A Small oceanrider gains a dolphin mount advancing as a full-level animal companion.",
      companionRules: ["This aquatic dolphin is available to a Small oceanrider."],
    },
  ],
};

await writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`);
await writeFile(optionGroupUrl, `${JSON.stringify(optionGroup, null, 2)}\n`);
console.log("Annotated Oceanrider aquatic mount automation.");
