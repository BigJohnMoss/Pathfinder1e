import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-devolutionist.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const companion = features.find((feature) => /^Devolved Companion/.test(feature.name));
const undomesticate = features.find((feature) => /^Undomesticate/.test(feature.name));
const devolution = features.find((feature) => /^Devolution \(Sp\)/.test(feature.name));

Object.assign(companion, {
  level: 1,
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "ranger-animal-companions",
  optionChoiceIds: ["ranger-animal-companion-ape"],
  progressionKey: "druid-nature-bond",
});

undomesticate.resourceActions = [
  {
    id: "devolutionist-undomesticate-ordinary",
    label: "Undomesticate ordinary animal",
    classId: "druid",
    minimumLevel: 4,
    actionTypeByLevel: [{ level: 4, actionType: "1-minute" }],
    confirmations: [
      { id: "domesticated-animal", label: "Target is a domesticated animal", requiredForActivation: true },
      { id: "willing-or-restrained", label: "Target is willing or restrained", requiredForActivation: true },
      { id: "not-special-companion", label: "Target is not an animal companion, special mount, or similar creature", requiredForActivation: true },
    ],
    targetEffectRoll: {
      modifier: "none",
      effectsByLevel: [{ level: 4, name: "Undomesticated", description: "The animal loses its tricks, no longer recognizes humanoids as allies, cannot be handled with Handle Animal, and can still be influenced with wild empathy. Break enchantment, limited wish, miracle, or wish reverses this instantaneous change.", duration: { kind: "until-ended" } }],
    },
    summary: "Apply the instantaneous undomestication rules to an eligible ordinary animal; no saving throw applies.",
  },
  {
    id: "devolutionist-undomesticate-exceptional",
    label: "Undomesticate exceptional animal",
    classId: "druid",
    minimumLevel: 4,
    actionTypeByLevel: [{ level: 4, actionType: "1-minute" }],
    confirmations: [
      { id: "domesticated-animal", label: "Target is a domesticated animal", requiredForActivation: true },
      { id: "willing-or-restrained", label: "Target is willing or restrained", requiredForActivation: true },
      { id: "not-special-companion", label: "Target is not an animal companion, special mount, or similar creature", requiredForActivation: true },
    ],
    savingThrow: { label: "Will", ability: "wisdom", base: 10, levelDivisor: 2, classId: "druid" },
    targetEffectRoll: {
      modifier: "will",
      effectsByLevel: [{ level: 4, name: "Undomesticated", description: "The exceptional animal loses its tricks and humanoid allegiances; Handle Animal no longer works, but wild empathy does. Break enchantment, limited wish, miracle, or wish reverses the change.", duration: { kind: "until-ended" } }],
      successEffect: { name: "Undomesticate immunity", description: "Immune to this devolutionist's Undomesticate for 24 hours.", rounds: 14400 },
    },
    summary: "Resolve an exceptional domesticated animal's Will save and track either the transformation or its 24-hour immunity.",
  },
];

devolution.resourceActions = [{
  id: "devolutionist-devolution-ritual",
  label: "Complete Devolution ritual",
  classId: "druid",
  minimumLevel: 9,
  actionTypeByLevel: [{ level: 9, actionType: "24-hour" }],
  modeLabel: "Target type",
  modes: [
    { id: "humanoid", label: "Humanoid", summary: "Intelligence becomes 2; type becomes animal; spellcasting, Intelligence-dependent abilities, manufactured weapons, and most skills are lost; gains two claws and a bite." },
    { id: "animal-advanced", label: "Animal — advanced", summary: "Undomesticate the animal if applicable, then apply the advanced template without increasing mental ability scores." },
    { id: "animal-dire", label: "Animal — dire", summary: "Undomesticate the animal if applicable, then use its dire version with GM approval." },
  ],
  confirmations: [
    { id: "eligible-target", label: "Target is a humanoid or animal", requiredForActivation: true },
    { id: "present-full-ritual", label: "Target remains present and relatively still for the full 24-hour ritual", requiredForActivation: true },
  ],
  targetEffectRoll: {
    modifier: "none",
    effectsByLevel: [{ level: 9, name: "Devolved", description: "Apply the selected permanent feral-state rules. The creature begins friendly to the devolutionist, loses any animal-companion bond, can be directed with wild empathy, counters and dispels awaken, and can be reversed only by awaken, miracle, or wish.", duration: { kind: "until-ended" } }],
  },
  summary: "Track the no-save 24-hour ritual and its permanent result until a listed reversal removes it.",
}];

archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal"];
archetype.druidAnimalCompanionIds = ["ranger-animal-companion-ape"];
archetype.companionGrants = [{
  id: "devolutionist-devolved-companion",
  kind: "animal",
  label: "Devolved humanoid companion",
  optionFeatureId: companion.id,
  sourceFeatureId: companion.id,
  minimumLevel: 1,
  effectiveLevelAdjustment: 0,
  rules: ["Uses ape animal-companion statistics", "Remains Medium at 4th level", "Gains all other 4th-level companion benefits"],
}];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["The mandatory Medium ape-stat companion, Undomesticate eligibility and exceptional-animal save/immunity, and the no-save 24-hour Devolution ritual with humanoid, advanced-animal, and dire-animal outcomes are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Devolutionist automation.");
