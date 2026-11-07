import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-defender-of-the-true-world.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const languages = features.find((feature) => /^Bonus Languages/.test(feature.name));
const enemy = features.find((feature) => /^Enemy of the First World/.test(feature.name));
const empathy = features.find((feature) => /^Fey Empathy/.test(feature.name));
const stalker = features.find((feature) => /^Fey Stalker/.test(feature.name));
const feybane = features.find((feature) => /^Feybane/.test(feature.name));
const immunity = features.find((feature) => /^Beguiling Immunity/.test(feature.name));
const deceiver = features.find((feature) => /^First World Deceiver/.test(feature.name));

// The imported source level captured the final scaling point rather than the
// level at which Fey Empathy replaces Wild Empathy.
empathy.level = 1;

languages.progressionProfiles = [{
  id: "defender-true-world-languages",
  label: "Bonus language additions",
  classId: "druid",
  columns: [{ id: "languages", label: "Additional choices" }],
  steps: [{ level: 1, values: { languages: "Aklo, Sylvan, Undercommon" } }],
}];

enemy.resourceActions = [{
  id: "defender-true-world-legal-summon",
  label: "Confirm Legal Nature Summon",
  classId: "druid",
  minimumLevel: 1,
  confirmations: [{ id: "non-fey", label: "No selected summon nature's ally creature has the fey type", requiredForActivation: true }],
  summary: "Apply the archetype's permanent prohibition on summoning fey with summon nature's ally.",
}];
enemy.progressionProfiles = [{
  id: "defender-true-world-summon-restriction",
  label: "Enemy of the First World",
  classId: "druid",
  columns: [{ id: "restriction", label: "Summon restriction" }],
  steps: [{ level: 1, values: { restriction: "Summon nature's ally cannot select fey creatures" } }],
}];

empathy.progressionProfiles = [{
  id: "defender-true-world-fey-empathy",
  label: "Fey Empathy",
  classId: "druid",
  columns: [{ id: "bonus", label: "Bluff, Diplomacy, Intimidate vs. fey" }],
  steps: [1, 4, 8, 12, 16, 20].map((level, index) => ({ level, values: { bonus: `+${index + 2} competence` } })),
}];

stalker.progressionProfiles = [{
  id: "defender-true-world-fey-stalker",
  label: "Fey Stalker",
  classId: "druid",
  columns: [{ id: "bonus", label: "Companion and summoned creature attacks/damage vs. fey" }],
  steps: [3, 8, 13, 18].map((level, index) => ({ level, values: { bonus: `+${index + 1} morale` } })),
}];

feybane.progressionProfiles = [{
  id: "defender-true-world-feybane",
  label: "Feybane",
  classId: "druid",
  columns: [{ id: "natural", label: "Natural attacks" }, { id: "spellResistance", label: "Fey spell resistance" }],
  steps: [{ level: 4, values: { natural: "Count as cold iron for damage reduction", spellResistance: "+2 caster-level checks" } }],
}];

deceiver.resourceActions = [{
  id: "defender-true-world-deceiver",
  label: "Assume First World Guise",
  classId: "druid",
  minimumLevel: 13,
  actionTypeByLevel: [{ level: 13, actionType: "standard" }],
  modeLabel: "Alter self form",
  modes: [
    { id: "humanoid", label: "Humanoid form", summary: "Assume a legal humanoid form as alter self." },
    { id: "fey", label: "Fey form", summary: "Assume a legal fey form as alter self." },
  ],
  confirmations: [{ id: "speed-cap", label: "The selected form's base land speed is no higher than 60 feet", requiredForActivation: true }],
  activeEffect: {
    name: "First World Deceiver",
    targets: ["self"],
    bonus: 0,
    description: "Assume the selected humanoid or fey form under alter self, with base land speed capped at 60 feet.",
    defaultRounds: 130,
    defaultRoundsByLevel: Array.from({ length: 8 }, (_, index) => ({ level: index + 13, rounds: (index + 13) * 10 })),
    fixedRounds: true,
    replaceExisting: true,
  },
  summary: "Select a legal form and track the exact minute-per-level alter self duration.",
}];

const empathySteps = [
  { level: 1, bonus: 2 },
  { level: 4, bonus: 3 },
  { level: 8, bonus: 4 },
  { level: 12, bonus: 5 },
  { level: 16, bonus: 6 },
  { level: 20, bonus: 7 },
];
const stalkerSteps = [
  { level: 3, bonus: 1 },
  { level: 8, bonus: 2 },
  { level: 13, bonus: 3 },
  { level: 18, bonus: 4 },
];
archetype.conditionalModifiers = [
  ...["Bluff", "Diplomacy", "Intimidate"].map((skill) => ({ sourceFeatureId: empathy.id, label: `Fey Empathy — ${skill}`, condition: `${skill} checks when interacting with fey`, minimumLevel: 1, base: 2, bonusByLevel: empathySteps })),
  { sourceFeatureId: stalker.id, label: "Fey Stalker — attacks", condition: "Animal companion and summon nature's ally creature attack rolls against fey", minimumLevel: 3, base: 1, bonusByLevel: stalkerSteps },
  { sourceFeatureId: stalker.id, label: "Fey Stalker — damage", condition: "Animal companion and summon nature's ally creature damage rolls against fey", minimumLevel: 3, base: 1, bonusByLevel: stalkerSteps },
  { sourceFeatureId: feybane.id, label: "Feybane", condition: "Caster-level checks to overcome the spell resistance of fey", minimumLevel: 4, base: 2 },
];
archetype.defenseAdjustments = [{ sourceFeatureId: immunity.id, kind: "immunity", label: "Beguiling Immunity", minimumLevel: 9, base: 0, qualifier: "mind-affecting effects created by fey" }];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Diplomacy proficiency, added languages, the fey summon guard, all Fey Empathy and Fey Stalker scaling bonuses, cold-iron natural attacks, the fey spell-resistance bonus, Beguiling Immunity, and both First World Deceiver forms and duration are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Defender of the True World automation.");
