import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-road-keeper.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const roadMagic = features.find((feature) => /^One with the Road/.test(feature.name));
const bond = features.find((feature) => /^Road Bond/.test(feature.name));
const highRoad = features.find((feature) => /^Take the High Road/.test(feature.name));
const trodden = features.find((feature) => /^Trodden Path/.test(feature.name));
const curse = features.find((feature) => /^Road Less Traveled/.test(feature.name));

// The source grants the initial caster-level benefit when spontaneous casting
// would normally arrive; 9th level is only the improvement point.
roadMagic.level = 1;

Object.assign(bond, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-nature-bonds",
  optionChoiceIds: ["druid-nature-bond-animal", "druid-nature-bond-domain"],
  progressionKey: "druid-nature-bond",
});
bond.progressionProfiles = [{
  id: "road-keeper-bond-restriction",
  label: "Road Bond",
  classId: "druid",
  columns: [{ id: "rule", label: "Legal bond" }],
  steps: [{ level: 1, values: { rule: "Animal companion, or Community, Liberation, Protection, Travel, or Weather domain and associated subdomains" } }],
}];

roadMagic.progressionProfiles = [{
  id: "road-keeper-road-spells",
  label: "One with the Road caster-level bonus",
  classId: "druid",
  columns: [{ id: "bonus", label: "Caster level" }, { id: "spells", label: "Affected spells" }],
  steps: [
    { level: 1, values: { bonus: "+1", spells: "Longstrider; scent trail; nature's exile; freedom of movement; tree stride; find the path; wind walk; word of recall; world wave" } },
    { level: 9, values: { bonus: "+2", spells: "All listed road spells" } },
  ],
}];

highRoad.progressionProfiles = [{
  id: "road-keeper-high-road",
  label: "Take the High Road",
  classId: "druid",
  columns: [{ id: "hustle", label: "Safe hustle" }, { id: "travel", label: "Road travel" }],
  steps: [{ level: 2, values: { hustle: "2 hours before nonlethal damage", travel: "Roads and paths count as highways for the Road Keeper and allies within 30 feet" } }],
}];

curse.numericCalculations = [{
  id: "road-keeper-curse-dc",
  label: "Road Less Traveled",
  inputLabel: "Wisdom modifier",
  inputMinimum: -5,
  inputMaximum: 20,
  inputDefault: 3,
  outputLabel: "Will save DC",
  baseByLevel: Array.from({ length: 17 }, (_, index) => ({ level: index + 4, value: 10 + Math.floor((index + 4) / 2) })),
  inputMultiplierByLevel: [{ level: 4, multiplier: 1 }],
  classId: "druid",
  summary: "DC equals 10 + half Druid level + Wisdom modifier.",
}];
curse.resourceActions = [{
  id: "road-keeper-road-less-traveled",
  label: "Curse Travelers",
  classId: "druid",
  minimumLevel: 4,
  resourceId: "roadLessTraveledTargets",
  variableCost: {
    label: "Targets",
    minimum: 1,
    maximumByLevel: Array.from({ length: 9 }, (_, index) => ({ level: 4 + index * 2, maximum: index + 1 })),
  },
  actionTypeByLevel: [{ level: 4, actionType: "standard" }],
  savingThrow: { label: "Will", ability: "wisdom", base: 10, levelDivisor: 2, classId: "druid" },
  modeLabel: "Punished transition",
  modes: [
    { id: "entering-wild", label: "Entering the wild", summary: "Wilderness squares outside roads and buildings are difficult terrain." },
    { id: "leaving-wild", label: "Leaving the wild", summary: "Road and building squares are difficult terrain." },
  ],
  confirmations: [{ id: "valid-movement", label: "Targets are not burrowing, climbing, earth gliding, flying, or swimming", requiredForActivation: true }],
  activeEffect: {
    name: "Road Less Traveled",
    targets: ["enemy"],
    bonus: 0,
    description: "The selected ground category is difficult terrain for affected targets. Each target attempts a Will save at the start of every turn to end this mind-affecting curse.",
    defaultRounds: 40,
    defaultRoundsByLevel: Array.from({ length: 17 }, (_, index) => ({ level: index + 4, rounds: (index + 4) * 10 })),
    fixedRounds: true,
  },
  summary: "Spend one daily target per creature, choose the punished direction, and track the minute-per-level curse until a target saves.",
}];

archetype.spellModifierAdjustments = [{
  sourceFeatureId: roadMagic.id,
  label: "One with the Road",
  target: "casterLevel",
  minimumLevel: 1,
  base: 1,
  bonusByLevel: [{ level: 1, bonus: 1 }, { level: 9, bonus: 2 }],
  spellIds: ["longstrider", "later-spell-scent-trail", "later-spell-nature-s-exile", "freedom-of-movement", "tree-stride", "find-the-path", "wind-walk", "word-of-recall", "world-wave"],
}];
archetype.conditionalModifiers = [
  { sourceFeatureId: trodden.id, label: "Trodden Path — tracking", condition: "Survival checks to follow or identify tracks", minimumLevel: 4, base: 4 },
  { sourceFeatureId: trodden.id, label: "Trodden Path — severe weather", condition: "Saving throws against severe weather effects", minimumLevel: 4, base: 4 },
];
archetype.resourceAdjustments = [{
  sourceFeatureId: curse.id,
  resourceId: "roadLessTraveledTargets",
  label: "Road Less Traveled targets",
  unit: "target",
  operation: "replace",
  minimumLevel: 4,
  base: 1,
  perInterval: 1,
  interval: 2,
  maximum: 9,
  refreshCadence: "day",
  dedicatedAction: true,
}];
archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal", "druid-nature-bond-domain"];
archetype.druidDomainIds = ["domain-community", "domain-liberation", "domain-protection", "domain-travel", "domain-weather"];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["All nine road-spell caster-level bonuses, Road Bond choices, highway travel benefits, both Trodden Path bonuses, the exact daily target progression, curse direction, save DC, exclusions, duration, and per-round saves are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Road Keeper automation.");
