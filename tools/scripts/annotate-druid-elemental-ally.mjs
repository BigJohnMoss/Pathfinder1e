import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-elemental-ally.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const eidolons = features.find((feature) => /^Elemental Eidolons/.test(feature.name));
const empathy = features.find((feature) => /^Elemental Empathy/.test(feature.name));
const magic = features.find((feature) => /^Elemental Magic/.test(feature.name));
const resistance = features.find((feature) => /^Elemental Resistance/.test(feature.name));

eidolons.progressionProfiles = [{
  id: "elemental-ally-eidolon-progression",
  label: "Elemental eidolon progression",
  classId: "druid",
  columns: [
    { id: "effectiveLevel", label: "Summoner-equivalent level" },
    { id: "evolutionPool", label: "Evolution pool" },
    { id: "unlocks", label: "Eidolon abilities" },
  ],
  steps: [
    { level: 1, values: { effectiveLevel: 1, evolutionPool: 0, unlocks: "Darkvision, link, share spells" } },
    { level: 2, values: { effectiveLevel: 2, evolutionPool: 0, unlocks: "Evasion" } },
    { level: 5, values: { effectiveLevel: 5, evolutionPool: 0, unlocks: "Ability score increase" } },
    { level: 6, values: { effectiveLevel: 6, evolutionPool: 0, unlocks: "Devotion" } },
    { level: 7, values: { effectiveLevel: 7, evolutionPool: 0, unlocks: "Multiattack" } },
    { level: 9, values: { effectiveLevel: 9, evolutionPool: 0, unlocks: "Second ability score increase" } },
    { level: 12, values: { effectiveLevel: 12, evolutionPool: 0, unlocks: "Improved evasion" } },
    { level: 13, values: { effectiveLevel: 13, evolutionPool: 0, unlocks: "Third ability score increase" } },
    { level: 17, values: { effectiveLevel: 17, evolutionPool: 0, unlocks: "Fourth ability score increase" } },
    { level: 20, values: { effectiveLevel: 20, evolutionPool: 0, unlocks: "Full level-20 base statistics" } },
  ],
  summary: "Each of the four fixed elemental eidolons advances at full Druid level, receives the listed eidolon abilities, and never receives an evolution pool.",
}];
eidolons.resourceActions = [
  {
    id: "elemental-ally-summon-eidolon",
    label: "Summon elemental eidolon",
    classId: "druid",
    minimumLevel: 1,
    blockedByActiveEffectName: "Elemental Eidolon death cooldown",
    actionTypeByLevel: [{ level: 1, actionType: "1-minute" }],
    modeLabel: "Eidolon",
    modes: [
      { id: "air", label: "Air elemental eidolon", summary: "Summon the configured air elemental eidolon." },
      { id: "earth", label: "Earth elemental eidolon", summary: "Summon the configured earth elemental eidolon." },
      { id: "fire", label: "Fire elemental eidolon", summary: "Summon the configured fire elemental eidolon." },
      { id: "water", label: "Water elemental eidolon", summary: "Summon the configured water elemental eidolon." },
    ],
    confirmations: [
      { id: "no-eidolon", label: "No elemental eidolon is currently summoned", requiredForActivation: true },
      { id: "no-other-summon", label: "No creature is currently summoned by another means", requiredForActivation: true },
    ],
    activeEffect: {
      name: "Elemental Eidolon Summoned",
      targets: ["self"],
      bonus: 0,
      description: "The selected elemental eidolon is present. Summon nature's ally and other eidolon summoning are unavailable until it is dismissed or killed.",
      defaultRounds: 99999,
      fixedRounds: true,
      replaceExisting: true,
    },
    summary: "Complete the 1-minute ritual and track the single active elemental eidolon.",
  },
  {
    id: "elemental-ally-dismiss-eidolon",
    label: "Dismiss elemental eidolon",
    classId: "druid",
    minimumLevel: 1,
    requiredActiveEffectName: "Elemental Eidolon Summoned",
    removeActiveEffectName: "Elemental Eidolon Summoned",
    actionTypeByLevel: [{ level: 1, actionType: "standard" }],
    summary: "Dismiss the currently summoned elemental eidolon as a standard action.",
  },
  {
    id: "elemental-ally-record-eidolon-death",
    label: "Record elemental eidolon death",
    classId: "druid",
    minimumLevel: 1,
    requiredActiveEffectName: "Elemental Eidolon Summoned",
    removeActiveEffectName: "Elemental Eidolon Summoned",
    activeEffect: {
      name: "Elemental Eidolon death cooldown",
      targets: ["self"],
      bonus: 0,
      description: "No elemental eidolon can be summoned for 24 hours after one is killed.",
      defaultRounds: 14400,
      fixedRounds: true,
      replaceExisting: true,
    },
    summary: "Remove the active eidolon and start the exact 24-hour lockout.",
  },
];

const empathyRoll = (id, label, penalty, summary) => ({
  id,
  label,
  classId: "druid",
  minimumLevel: 1,
  actionTypeByLevel: [{ level: 1, actionType: "1-minute" }],
  confirmations: [{ id: "study", label: "Both creatures can study each other within 30 feet", requiredForActivation: true }],
  diceRoll: {
    label: "Elemental Empathy check",
    diceCountByLevel: [{ level: 1, count: 1 }],
    dieSidesByLevel: [{ level: 1, sides: 20 }],
    abilityModifier: "charisma",
    flatModifierByLevel: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, modifier: index + 1 + penalty })),
  },
  summary,
});
empathy.resourceActions = [
  empathyRoll("elemental-ally-empathy-elemental", "Influence elemental", 0, "Roll 1d20 + Druid level + Charisma modifier against an elemental subtype creature."),
  empathyRoll("elemental-ally-empathy-outsider", "Influence elemental outsider", -4, "Roll with the exact -4 penalty against a non-elemental outsider with the air, earth, fire, or water subtype."),
];

magic.progressionProfiles = [{
  id: "elemental-ally-animal-spell-targeting",
  label: "Elemental Magic targeting",
  classId: "druid",
  columns: [{ id: "targets", label: "Additional legal targets" }],
  steps: [{ level: 1, values: { targets: "Elementals, including all four elemental eidolons, for every spell that targets animals" } }],
  summary: "The expanded targeting permission applies automatically to the character's spell rules.",
}];

archetype.defenseAdjustments = ["acid", "cold", "electricity", "fire"].map((energy) => ({
  sourceFeatureId: resistance.id,
  kind: "energyResistance",
  label: `Elemental Resistance — ${energy}`,
  minimumLevel: 4,
  base: 5,
  qualifier: energy,
}));
archetype.companionGrants = archetype.companionGrants.map((grant) => ({
  ...grant,
  sourceFeatureId: eidolons.id,
  effectiveLevelAdjustment: 0,
  rules: [
    "Uses full Druid level as Summoner level.",
    "Receives no evolution pool and cannot gain evolution points from eidolon-specific effects.",
    "Only one of the four elemental eidolons can be summoned at a time.",
  ],
}));
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["All four full-level elemental eidolons, their zero evolution pool, summon/dismiss/death lifecycle, exact 24-hour death lockout, both Elemental Empathy formulas, animal-spell targeting permission, four energy resistances, and complete Wild Shape resource replacement are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Elemental Ally automation.");
