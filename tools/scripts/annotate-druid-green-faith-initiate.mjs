import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-green-faith-initiate.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const mediator = features.find((feature) => /^Mediator/.test(feature.name));
const zephyr = features.find((feature) => /^Zephyr Message/.test(feature.name));
const refuge = features.find((feature) => /^Path to Refuge/.test(feature.name));
const secrets = features.find((feature) => /^Secrets across Lifetimes/.test(feature.name));
const voices = features.find((feature) => /^A Thousand Voices/.test(feature.name));

mediator.level = 3;
archetype.conditionalModifiers = ["Diplomacy", "Sense Motive"].map((skill) => ({
  sourceFeatureId: mediator.id,
  label: `Mediator's Ear — ${skill}`,
  condition: `${skill} checks`,
  minimumLevel: 3,
  base: 0,
  levelDivisor: 2,
  levelMultiplier: 1,
}));

zephyr.resourceActions = [{
  id: "green-faith-zephyr-message",
  label: "Send Zephyr Message",
  classId: "druid",
  minimumLevel: 6,
  resourceId: "greenFaithZephyr",
  cost: 1,
  spellLikeAbility: { spellId: "whispering-wind", spellName: "Whispering Wind", cadence: "day", kind: "spell-like" },
  summary: "Spend the once-daily use and cast whispering wind at Druid caster level.",
}];

refuge.resourceActions = [{
  id: "green-faith-path-to-refuge",
  label: "Travel Path to Refuge",
  classId: "druid",
  minimumLevel: 9,
  resourceId: "greenFaithRefuge",
  cost: 1,
  confirmations: [{ id: "green-faith-site", label: "Destination is a major Green Faith circle or holy site marked by its standing stones", requiredForActivation: true }],
  spellLikeAbility: { spellId: "transport-via-plants", spellName: "Transport via Plants (Green Faith refuge)", cadence: "day", kind: "spell-like" },
  summary: "Spend one scaling daily use and travel only to a legal Green Faith refuge.",
}];

secrets.resourceActions = [{
  id: "green-faith-secrets-lifetimes",
  label: "Consult Secrets across Lifetimes",
  classId: "druid",
  minimumLevel: 10,
  resourceId: "greenFaithSecrets",
  cost: 1,
  spellLikeAbility: { spellId: "legend-lore", spellName: "Legend Lore without material components", cadence: "week", kind: "spell-like" },
  summary: "Spend the weekly use and cast legend lore without material components.",
}];

voices.resourceActions = [{
  id: "green-faith-thousand-voices",
  label: "Use A Thousand Voices",
  classId: "druid",
  minimumLevel: 13,
  resourceId: "greenFaithVoicesMinutes",
  variableCost: { label: "Minutes", minimum: 1, maximumLevelDivisor: 1 },
  modeLabel: "Communication target",
  modes: [
    { id: "language", label: "Creature with a language", summary: "Communicate as tongues." },
    { id: "stone", label: "Stone", summary: "Communicate as stone tell." },
  ],
  activeEffect: {
    name: "A Thousand Voices",
    targets: ["self"],
    bonus: 0,
    description: "Communicate using the selected tongues or stone tell mode for the selected number of minutes.",
    defaultRounds: 10,
    durationFromVariableCost: true,
    durationFromVariableCostMultiplier: 10,
    replaceExisting: true,
  },
  summary: "Choose a mode and spend the same number of minutes from the Druid-level daily pool as the tracked duration.",
}];

archetype.resourceAdjustments = [
  { sourceFeatureId: zephyr.id, resourceId: "greenFaithZephyr", label: "Zephyr Message", unit: "use", operation: "replace", minimumLevel: 6, base: 1, maximum: 1, refreshCadence: "day", dedicatedAction: true },
  { sourceFeatureId: refuge.id, resourceId: "greenFaithRefuge", label: "Path to Refuge", unit: "use", operation: "replace", minimumLevel: 9, base: 1, maximumByLevel: [{ level: 9, maximum: 1 }, { level: 14, maximum: 2 }, { level: 19, maximum: 3 }], refreshCadence: "day", dedicatedAction: true },
  { sourceFeatureId: secrets.id, resourceId: "greenFaithSecrets", label: "Secrets across Lifetimes", unit: "use", operation: "replace", minimumLevel: 10, base: 1, maximum: 1, refreshCadence: "week", dedicatedAction: true },
  { sourceFeatureId: voices.id, resourceId: "greenFaithVoicesMinutes", label: "A Thousand Voices", unit: "minute", operation: "replace", minimumLevel: 13, base: 0, levelMultiplier: 1, maximum: 20, refreshCadence: "day", dedicatedAction: true },
];
archetype.wildShapeUseAdjustments = [{ level: 6, delta: -1 }, { level: 10, delta: -1 }];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Mediator's Ear scaling, both removed Wild Shape uses, Zephyr Message, scaling Path to Refuge uses and site restriction, weekly component-free Legend Lore, and minute-for-minute A Thousand Voices modes are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Green Faith Initiate automation.");
