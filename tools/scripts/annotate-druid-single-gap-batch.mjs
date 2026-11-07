import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const load = async (id) => {
  const url = new URL(`packages/data/src/archetypes/${id}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const write = ({ url, value }) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const features = (record) => record.replacements.flatMap((replacement) => replacement.features ?? []);
const named = (record, pattern) => features(record).find((feature) => pattern.test(feature.name));
const tracker = (name, description, bonus = 0, targets = ["self"]) => ({
  name,
  targets,
  bonus,
  description,
  defaultRounds: 600,
  fixedRounds: true,
});

const mooncaller = await load("druid-mooncaller");
const resistWild = named(mooncaller.value, /^Resist Call of the Wild/);
if (!resistWild) throw new Error("Mooncaller save feature was not found");
mooncaller.value.conditionalModifiers = [
  {
    sourceFeatureId: resistWild.id,
    label: "Resist Call of the Wild — mental effects",
    condition: "Saving throws to avoid confusion, daze, feeblemind, and insanity effects",
    minimumLevel: 4,
    base: 4,
  },
  {
    sourceFeatureId: resistWild.id,
    label: "Resist Call of the Wild — shapechangers",
    condition: "Saving throws against exceptional, spell-like, and supernatural abilities of creatures with the shapechanger subtype",
    minimumLevel: 4,
    base: 4,
  },
];
mooncaller.value.mechanicalCoverage = "full";
mooncaller.value.mechanicalNotes = [
  "Night Sight, both conditional +4 save bonuses, disease immunity, and scaling silver damage reduction are automated.",
];

const draconic = await load("druid-draconic-druid");
const dragonShape = named(draconic.value, /^Dragon Shape$/);
if (!dragonShape) throw new Error("Draconic Druid Dragon Shape was not found");
dragonShape.resourceActions = [
  {
    id: "draconic-druid-scaled-shape",
    label: "Assume dragon-scaled shape",
    minimumLevel: 4,
    classId: "druid",
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 4, actionType: "standard" }],
    activeEffect: tracker(
      "Dragon-scaled shape",
      "Gain +1 natural armor and a size-appropriate bite (1d6 for Medium). This activation separately refreshes the form's breath-weapon uses.",
      1,
      ["armorClass"],
    ),
    summary: "Spend 1 wild shape use and track the basic dragon-scaled form.",
  },
  {
    id: "draconic-druid-medium-dragon-shape",
    label: "Assume Medium dragon shape",
    minimumLevel: 10,
    classId: "druid",
    resourceId: "wildShape",
    cost: 2,
    actionTypeByLevel: [{ level: 10, actionType: "standard" }],
    activeEffect: tracker(
      "Medium dragon shape",
      "Apply form of the dragon I as a Medium dragon. This activation separately refreshes the form's breath-weapon uses.",
    ),
    summary: "Spend exactly 2 wild shape uses and track form of the dragon I.",
  },
  {
    id: "draconic-druid-large-dragon-shape",
    label: "Assume Large dragon shape",
    minimumLevel: 12,
    classId: "druid",
    resourceId: "wildShape",
    cost: 2,
    actionTypeByLevel: [{ level: 12, actionType: "standard" }],
    activeEffect: tracker(
      "Large dragon shape",
      "Apply form of the dragon II as a Large dragon. This activation separately refreshes the form's breath-weapon uses.",
    ),
    summary: "Spend exactly 2 wild shape uses and track form of the dragon II.",
  },
];
draconic.value.mechanicalCoverage = "full";
draconic.value.mechanicalNotes = [
  "Drake companion progression, Dragon Sense, dragon-specific saves, and all three wild-shape forms with exact costs are automated.",
];

await Promise.all([write(mooncaller), write(draconic)]);
console.log("Annotated Druid single-gap batch: druid-mooncaller, druid-draconic-druid");
