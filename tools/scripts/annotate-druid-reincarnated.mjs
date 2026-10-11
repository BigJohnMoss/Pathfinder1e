import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-reincarnated-druid.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const stranger = features.find((feature) => /^Mysterious Stranger/.test(feature.name));
const resist = features.find((feature) => /^Resist Death/.test(feature.name));
const lives = features.find((feature) => /^Many Lives/.test(feature.name));
const wildShape = features.find((feature) => /^Wild Shape/.test(feature.name));
const cheat = features.find((feature) => /^Cheat Death/.test(feature.name));
const tongue = features.find((feature) => /^Tongue of the Sun and Moon/.test(feature.name));

archetype.conditionalModifiers = [
  { sourceFeatureId: stranger.id, label: "Mysterious Stranger information DC", condition: "DC of Sense Motive, Diplomacy, and Knowledge checks made to learn about this character", minimumLevel: 2, base: 0, levelDivisor: 2, levelMultiplier: 1 },
  { sourceFeatureId: resist.id, label: "Resist Death's Touch — saves", condition: "Saving throws against death effects, energy drain, and necromancy effects", minimumLevel: 4, base: 4 },
  { sourceFeatureId: resist.id, label: "Resist Death's Touch — stabilization", condition: "Stabilization checks while dying", minimumLevel: 4, base: 4 },
];

lives.resourceActions = [
  {
    id: "reincarnated-druid-record-death",
    label: "Record qualifying death",
    classId: "druid",
    minimumLevel: 5,
    blockedByActiveEffectNames: ["Many Lives — awaiting reincarnation", "Many Lives — seven-day vulnerability"],
    confirmations: [
      { id: "killed", label: "The character was killed", requiredForActivation: true },
      { id: "not-death-effect", label: "The killing effect was not a death effect", requiredForActivation: true },
    ],
    activeEffect: {
      name: "Many Lives — awaiting reincarnation",
      targets: ["self"],
      bonus: 0,
      description: "The character returns automatically via reincarnate after 1 day in a safe location within 1 mile of the previous body. Raise dead and resurrection are unavailable.",
      defaultRounds: 14400,
      fixedRounds: true,
      replaceExisting: true,
    },
    summary: "Start the exact one-day delay before automatic reincarnation.",
  },
  {
    id: "reincarnated-druid-complete-return",
    label: "Complete automatic reincarnation",
    classId: "druid",
    minimumLevel: 5,
    requiredActiveEffectName: "Many Lives — awaiting reincarnation",
    removeActiveEffectName: "Many Lives — awaiting reincarnation",
    activeEffect: {
      name: "Many Lives — seven-day vulnerability",
      targets: ["self"],
      bonus: 0,
      description: "For 7 days, sense the previous remains at will as locate object. If killed during this window, remain dead and do not reincarnate.",
      defaultRounds: 100800,
      fixedRounds: true,
      replaceExisting: true,
    },
    summary: "Finish the return and begin the exact seven-day remains-sensing and no-second-reincarnation window.",
  },
];
lives.progressionProfiles = [{
  id: "reincarnated-druid-death-restrictions",
  label: "Many Lives restrictions",
  classId: "druid",
  columns: [{ id: "rule", label: "Death and return rule" }],
  steps: [{ level: 5, values: { rule: "Cannot be raised or resurrected; may still be reincarnated. Death effects prevent Many Lives." } }],
}];

wildShape.progressionKey = "druid-wild-shape";
wildShape.resourceActions = [{
  id: "reincarnated-druid-wild-shape",
  label: "Assume Reincarnated Druid Wild Shape",
  classId: "druid",
  minimumLevel: 6,
  resourceId: "wildShape",
  cost: 1,
  actionTypeByLevel: [{ level: 6, actionType: "standard" }],
  modeLabel: "Form tier",
  modes: [
    { id: "animal-small-medium", label: "Small or Medium animal", minimumLevel: 6, summary: "Use beast shape I." },
    { id: "animal-large", label: "Large animal", minimumLevel: 8, summary: "Use beast shape II." },
    { id: "elemental-small", label: "Small elemental", minimumLevel: 8, summary: "Use elemental body I." },
    { id: "animal-tiny-huge", label: "Tiny or Huge animal", minimumLevel: 10, summary: "Use beast shape III." },
    { id: "elemental-medium", label: "Medium elemental", minimumLevel: 10, summary: "Use elemental body II." },
    { id: "plant", label: "Plant creature", minimumLevel: 10, summary: "Use plant shape at the tier allowed by effective level." },
    { id: "elemental-large", label: "Large elemental", minimumLevel: 12, summary: "Use elemental body III." },
    { id: "elemental-huge", label: "Huge elemental", minimumLevel: 14, summary: "Use elemental body IV." },
  ],
  activeEffect: {
    name: "Reincarnated Druid Wild Shape",
    targets: ["self"],
    bonus: 0,
    description: "Assume the selected form using an effective Druid level 2 lower than actual level.",
    defaultRounds: 2400,
    defaultRoundsByLevel: Array.from({ length: 15 }, (_, index) => ({ level: index + 6, rounds: (index + 4) * 600 })),
    fixedRounds: true,
    replaceExisting: true,
  },
  summary: "Spend one use; form access, daily uses, and duration all use Druid level − 2.",
}];

cheat.resourceActions = [{
  id: "reincarnated-druid-cheat-death",
  label: "Cheat Death reroll",
  classId: "druid",
  minimumLevel: 9,
  resourceId: "reincarnatedCheatDeath",
  cost: 1,
  actionTypeByLevel: [{ level: 9, actionType: "free" }],
  confirmations: [{ id: "qualifying", label: "Save is against death, energy drain, or necromancy before result is revealed, or is a failed stabilization check", requiredForActivation: true }],
  rerollAction: { kind: "d20", label: "Required second result" },
  summary: "Spend the daily use and take the second roll even if it is worse.",
}];

tongue.progressionProfiles = [{
  id: "reincarnated-druid-universal-speech",
  label: "Tongue of the Sun and Moon",
  classId: "druid",
  columns: [{ id: "benefit", label: "Communication" }],
  steps: [{ level: 15, values: { benefit: "Speak with every living creature" } }],
}];

archetype.resourceAdjustments = [{ sourceFeatureId: cheat.id, resourceId: "reincarnatedCheatDeath", label: "Cheat Death", unit: "use", operation: "replace", minimumLevel: 9, base: 1, maximum: 1, refreshCadence: "day", dedicatedAction: true }];
archetype.wildShapeLevelAdjustment = -2;
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Information DC scaling, every death/necromancy defense, the one-day reincarnation and separate seven-day vulnerability lifecycle, level − 2 Wild Shape, mandatory Cheat Death reroll, and universal speech are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Reincarnated Druid automation.");
