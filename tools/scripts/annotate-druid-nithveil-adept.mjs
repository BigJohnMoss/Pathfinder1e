import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-nithveil-adept.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const bond = features.find((feature) => /^Nature Bond/.test(feature.name));
const speech = features.find((feature) => /^Animal Speech/.test(feature.name));
const resist = features.find((feature) => /^Resist Fey Influence/.test(feature.name));
const locate = features.find((feature) => /^Locate Nithveil/.test(feature.name));

Object.assign(bond, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-nature-bonds",
  optionChoiceIds: ["druid-nature-bond-domain"],
  progressionKey: "druid-nature-bond",
});
bond.progressionProfiles = [{
  id: "nithveil-eldest-domains",
  label: "Nithveil domain permission",
  classId: "druid",
  columns: [{ id: "domains", label: "Legal domains" }],
  steps: [{ level: 1, values: { domains: "Normal Druid domains; if worshiping an Eldest, also every domain or subdomain granted by that Eldest" } }],
  summary: "Animal Companion is unavailable and the Nature Bond selector is restricted to Domain.",
}];

speech.resourceActions = [{
  id: "nithveil-animal-speech",
  label: "Grant Animal Speech",
  classId: "druid",
  minimumLevel: 4,
  resourceId: "nithveilAnimalSpeech",
  cost: 1,
  actionTypeByLevel: [{ level: 4, actionType: "standard" }],
  confirmations: [{ id: "normal-animal", label: "Touched target is a normal animal", requiredForActivation: true }],
  activeEffect: {
    name: "Nithveil Animal Speech",
    targets: ["allies"],
    bonus: 0,
    description: "The touched animal can speak one language the Druid knows with anyone who understands it. Intelligence and attitude are unchanged.",
    defaultRounds: 400,
    defaultRoundsByLevel: Array.from({ length: 17 }, (_, index) => ({ level: index + 4, rounds: (index + 4) * 10 })),
    fixedRounds: true,
    replaceExisting: true,
  },
  summary: "Spend one scaling daily use and track the exact 1-minute-per-level speech duration.",
}];

resist.resourceActions = [{
  id: "nithveil-resist-fey-reroll",
  label: "Reroll fey-influence save",
  classId: "druid",
  minimumLevel: 4,
  resourceId: "nithveilFeyReroll",
  cost: 1,
  actionTypeByLevel: [{ level: 4, actionType: "free" }],
  confirmations: [{ id: "before-roll", label: "Declared before attempting a save against a fey spell-like or supernatural ability", requiredForActivation: true }],
  rerollAction: { kind: "higher-d20", label: "Fey-influence saving throw" },
  summary: "Spend the once-daily use, roll twice, and keep the higher result; enter the save modifier including the automatic +4 bonus.",
}];

locate.resourceActions = [{
  id: "nithveil-locate-city",
  label: "Locate Nithveil",
  classId: "druid",
  minimumLevel: 9,
  resourceId: "nithveilLocate",
  cost: 1,
  confirmations: [{ id: "new-moon", label: "It is the new moon and Nithveil is present on the Material Plane", requiredForActivation: true }],
  spellLikeAbility: { spellId: "find-the-path", spellName: "Find the Path (Nithveil only)", cadence: "month", kind: "spell-like" },
  activeEffect: { name: "Path to Nithveil", targets: ["self"], bonus: 0, description: "Find the path leads only to Nithveil and persists until arrival or until Nithveil recedes from the Material Plane at the end of the new moon.", defaultRounds: 99999, fixedRounds: true, replaceExisting: true },
  summary: "Spend the monthly new-moon use and track the source-defined extended duration.",
}];

archetype.conditionalModifiers = [{ sourceFeatureId: resist.id, label: "Resist Fey Influence", condition: "Saving throws against fey spell-like and supernatural abilities", minimumLevel: 4, base: 4 }];
archetype.resourceAdjustments = [
  { sourceFeatureId: speech.id, resourceId: "nithveilAnimalSpeech", label: "Animal Speech", unit: "use", operation: "replace", minimumLevel: 4, base: 2, perInterval: 1, interval: 4, maximum: 6, refreshCadence: "day", dedicatedAction: true },
  { sourceFeatureId: resist.id, resourceId: "nithveilFeyReroll", label: "Resist Fey Influence reroll", unit: "use", operation: "replace", minimumLevel: 4, base: 1, maximum: 1, refreshCadence: "day", dedicatedAction: true },
  { sourceFeatureId: locate.id, resourceId: "nithveilLocate", label: "Locate Nithveil", unit: "use", operation: "replace", minimumLevel: 9, base: 1, maximum: 1, refreshCadence: "month", dedicatedAction: true },
];
archetype.druidNatureBondOptionIds = ["druid-nature-bond-domain"];
archetype.prohibitedCompanionKinds = ["animal"];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Class skills, domain-only Nature Bond, Eldest domain permission, scaling Animal Speech uses and duration, +4 fey saves, predeclared daily reroll, and true monthly new-moon Locate Nithveil tracking are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Nithveil Adept automation.");
