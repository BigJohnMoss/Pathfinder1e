import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-dinosaur-druid.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const replacement = archetype.replacements[0];
const features = replacement.features;
const summon = features.find((feature) => /^Summon Dinosaur/.test(feature.name));
const bond = features.find((feature) => /^Dinosaur Bond/.test(feature.name));
const shape = features.find((feature) => /^Dinosaur Shape/.test(feature.name));
const voice = features.find((feature) => /^Primeval Voice/.test(feature.name));

for (const featureId of ["druid-nature-bond-1", "druid-animal-companion-1"]) {
  if (!replacement.featureIds.includes(featureId)) replacement.featureIds.push(featureId);
}

summon.spellAutomation = {
  preparedKeywordConversion: {
    label: "Spontaneous Dinosaur Summoning",
    keyword: "summon nature's ally",
  },
};
summon.progressionProfiles = [{
  id: "dinosaur-druid-summon-options",
  label: "Added dinosaur summons",
  classId: "druid",
  columns: [{ id: "creatures", label: "Added summon options" }],
  steps: [
    [1, "SNA I: Compsognathus"],
    [3, "SNA II: Dimorphodon; troodon"],
    [5, "SNA III: Plesiosaurus; velociraptor"],
    [7, "SNA IV: Dimetrodon; pachycephalosaurus; parasaurolophus"],
    [9, "SNA V: Amargasaurus; ceratosaurus; iguanodon; kentrosaurus; styracosaurus"],
    [11, "SNA VI: Allosaurus; quetzalcoatlus; tylosaurus"],
    [13, "SNA VII: Therizinosaurus"],
    [15, "SNA VIII: Diplodocus; spinosaurus"],
    [17, "SNA IX: Giganotosaurus"],
  ].map(([level, creatures]) => ({ level, values: { creatures } })),
  summary: "Every published prehistoric creature is shown at the matching summon nature's ally spell level and each spell has a spontaneous-cast control.",
}];

Object.assign(bond, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "ranger-animal-companions",
  optionChoiceIds: ["ranger-animal-companion-dinosaur"],
  progressionKey: "druid-nature-bond",
});

const durationSteps = (multiplier) => Array.from({ length: 17 }, (_, index) => ({ level: index + 4, rounds: (index + 4) * multiplier }));
const animalModes = [
  { id: "small-medium-animal", label: "Small or Medium animal", minimumLevel: 4, summary: "Use beast shape I." },
  { id: "large-animal", label: "Large animal", minimumLevel: 6, summary: "Use beast shape II." },
  { id: "tiny-huge-animal", label: "Tiny or Huge animal", minimumLevel: 8, summary: "Use beast shape III." },
];
shape.resourceActions = [
  {
    id: "dinosaur-druid-dinosaur-shape",
    label: "Wild Shape into dinosaur",
    classId: "druid",
    minimumLevel: 4,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 4, actionType: "standard" }],
    modeLabel: "Dinosaur size tier",
    modes: animalModes.map((mode) => ({ ...mode, id: `dinosaur-${mode.id}`, label: mode.label.replace("animal", "dinosaur") })),
    activeEffect: {
      name: "Dinosaur Shape",
      targets: ["constitution"],
      bonus: 2,
      description: "+2 size bonus to Constitution in addition to the selected beast shape modifiers; duration is 1 hour per Druid level.",
      defaultRounds: 2400,
      defaultRoundsByLevel: durationSteps(600),
      fixedRounds: true,
      replaceExisting: true,
    },
    summary: "Spend one Wild Shape use, select the legal dinosaur tier, apply +2 Constitution, and track the exact hour-per-level duration.",
  },
  {
    id: "dinosaur-druid-other-shape",
    label: "Wild Shape into another creature",
    classId: "druid",
    minimumLevel: 4,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 4, actionType: "standard" }],
    modeLabel: "Other form tier",
    modes: [
      ...animalModes,
      { id: "small-elemental", label: "Small elemental", minimumLevel: 6, summary: "Use elemental body I." },
      { id: "medium-elemental", label: "Medium elemental", minimumLevel: 8, summary: "Use elemental body II." },
      { id: "plant", label: "Plant creature", minimumLevel: 8, summary: "Use plant shape at the tier allowed by Druid level." },
      { id: "large-elemental", label: "Large elemental", minimumLevel: 10, summary: "Use elemental body III." },
      { id: "huge-elemental", label: "Huge elemental", minimumLevel: 12, summary: "Use elemental body IV." },
    ],
    activeEffect: {
      name: "Dinosaur Druid Other Shape",
      targets: ["self"],
      bonus: 0,
      description: "Assume the selected non-dinosaur form for the shortened duration of 1 minute per Druid level.",
      defaultRounds: 40,
      defaultRoundsByLevel: durationSteps(10),
      fixedRounds: true,
      replaceExisting: true,
    },
    summary: "Spend one Wild Shape use and automatically apply the archetype's minute-per-level duration to every non-dinosaur form.",
  },
];

voice.resourceActions = [{
  id: "dinosaur-druid-primeval-voice",
  label: "Speak with dinosaur",
  classId: "druid",
  minimumLevel: 4,
  spellLikeAbility: { spellId: "speak-with-animals", spellName: "Speak with Animals (dinosaurs only)", cadence: "at-will", kind: "spell-equivalent" },
  summary: "Use the constant speak-with-animals permission for dinosaurs without spending a resource.",
}];
voice.progressionProfiles = [{
  id: "dinosaur-druid-primeval-language",
  label: "Primeval Voice",
  classId: "druid",
  columns: [{ id: "benefit", label: "Constant benefit" }],
  steps: [{ level: 4, values: { benefit: "Speak with dinosaurs at all times as speak with animals" } }],
}];

archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal"];
archetype.druidAnimalCompanionIds = ["ranger-animal-companion-dinosaur"];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Every dinosaur summon addition, spontaneous summon conversion, dinosaur-only full-level companion selection, all Wild Shape form tiers, +2 Constitution, form-dependent duration, and constant dinosaur speech are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Dinosaur Druid automation.");
