import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-kraken-caller.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const deity = find("Call of the Waves");
const languages = find("Bonus Languages");
const swimmer = find("Dauntless Swimmer");
const breath = find("Hold Breath");
const resistance = find("Resist the Waves");
const wildShape = find("Wild Shape");
const depths = find("Beast of the Depths");
const tentacleBonuses = [{ level: 4, bonus: 2 }, { level: 6, bonus: 3 }, { level: 8, bonus: 4 }, { level: 10, bonus: 5 }, { level: 12, bonus: 6 }];

Object.assign(deity, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "kraken-caller-deity",
  optionChoiceIds: ["kraken-caller-deity-besmara"],
  progressionKey: "kraken-caller-deity"
});
languages.progressionProfiles = [{
  id: "kraken-caller-languages",
  label: "Kraken Caller Languages",
  classId: "druid",
  columns: [{ id: "added", label: "Added" }, { id: "removed", label: "Removed" }],
  steps: [{ level: 1, values: { added: "Aquan", removed: "Sylvan" } }]
}];
swimmer.resourceActions = [{
  id: "kraken-caller-take-ten-swim",
  label: "Take 10 on Swim",
  classId: "druid",
  minimumLevel: 2,
  fixedD20Result: { label: "Swim d20 result before modifiers", result: 10 },
  summary: "Use a natural result of 10 on a Swim check even while rushed or threatened."
}];
breath.numericCalculations = [{
  id: "kraken-caller-hold-breath",
  label: "Hold Breath",
  inputLabel: "Constitution score",
  inputMinimum: 1,
  inputMaximum: 99,
  inputDefault: 10,
  outputLabel: "Minutes before drowning checks",
  baseByLevel: [{ level: 3, value: 0 }],
  classId: "druid",
  summary: "The Kraken Caller can hold her breath for this many minutes."
}];
resistance.progressionProfiles = [{
  id: "kraken-caller-aquatic-resistance",
  label: "Resist the Waves' Lure",
  classId: "druid",
  columns: [{ id: "save", label: "Save bonus" }, { id: "source", label: "Against" }],
  steps: [{ level: 4, values: { save: "+4", source: "Spell-like and supernatural abilities of aquatic-subtype creatures" } }]
}];

wildShape.progressionProfiles = [{
  id: "kraken-caller-tentacles",
  label: "Tentacle Form",
  classId: "druid",
  columns: [{ id: "tentacles", label: "Tentacles" }, { id: "bonus", label: "Climb, Swim, dirty trick" }, { id: "reach", label: "Base reach" }],
  steps: tentacleBonuses.map(({ level, bonus }) => ({ level, values: { tentacles: bonus, bonus: `+${bonus}`, reach: "5 feet" } })),
  summary: "Each tentacle is a secondary natural attack dealing 1d4 damage for Medium or 1d3 for Small creatures."
}];
wildShape.resourceActions = [
  {
    id: "kraken-caller-aquatic-wild-shape",
    label: "Use Aquatic Wild Shape",
    classId: "druid",
    minimumLevel: 4,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 4, actionType: "standard" }],
    confirmations: [{ id: "legal-form", label: "The animal has the aquatic or water subtype or amphibious special quality", requiredForActivation: true }],
    activeEffect: { name: "Kraken Caller Aquatic Wild Shape", targets: ["self"], bonus: 0, description: "Assume the selected legal aquatic, water, or amphibious animal form.", defaultRoundsByLevel: Array.from({ length: 17 }, (_, index) => ({ level: index + 4, rounds: (index + 4) * 600 })), replaceExisting: true },
    summary: "Spend one Wild Shape use; nonaquatic forms are prohibited."
  },
  {
    id: "kraken-caller-tentacle-form",
    label: "Assume Tentacle Form",
    classId: "druid",
    minimumLevel: 4,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 4, actionType: "standard" }],
    modeLabel: "Mass distribution",
    modes: [
      { id: "all-tentacles", label: "All tentacles", minimumLevel: 4, summary: "Keep every available tentacle at 5-foot reach and base damage." },
      { id: "reach-5", label: "+5-foot reach", minimumLevel: 6, summary: "Retract two tentacles; remaining tentacles have 10-foot reach." },
      { id: "damage-1", label: "+1 damage size", minimumLevel: 6, summary: "Retract two tentacles; remaining tentacles deal damage as one size larger." },
      { id: "reach-10", label: "+10-foot reach", minimumLevel: 10, summary: "Retract four tentacles; remaining tentacles have the maximum 15-foot reach." },
      { id: "damage-2", label: "+2 damage sizes", minimumLevel: 10, summary: "Retract four tentacles; remaining tentacles deal damage as two sizes larger." },
      { id: "mixed", label: "+5-foot reach and +1 damage size", minimumLevel: 10, summary: "Retract four tentacles and split the two redistribution increments between reach and damage." }
    ],
    activeEffect: { name: "Kraken Caller Tentacle Form", targets: ["self"], bonus: 0, description: "Grow the level-scaled number of tentacles and apply the selected legal redistribution. The tentacle count is also the racial bonus on Climb, Swim, and dirty trick checks.", defaultRoundsByLevel: Array.from({ length: 17 }, (_, index) => ({ level: index + 4, rounds: (index + 4) * 100 })), replaceExisting: true },
    summary: "Spend one Wild Shape use. Duration is 10 minutes per Druid level."
  },
  {
    id: "kraken-caller-ink-cloud",
    label: "Expel Ink Cloud",
    classId: "druid",
    minimumLevel: 4,
    requiredActiveEffectName: "Kraken Caller Tentacle Form",
    blockedByActiveEffectName: "Ink Cloud Recharge",
    actionTypeByLevel: [{ level: 4, actionType: "standard" }],
    confirmations: [{ id: "underwater", label: "The Kraken Caller is underwater", requiredForActivation: true }],
    activeEffect: { name: "Ink Cloud Recharge", targets: ["self"], bonus: 0, description: "A 10-foot-radius underwater ink cloud grants total concealment and persists for 1 round per Druid level. Ink Cloud cannot be used again until this 1-minute recharge ends.", defaultRounds: 10, fixedRounds: true, replaceExisting: true },
    summary: "Create the cloud and begin the exact once-per-minute cooldown."
  }
];

depths.resourceActions = [{
  id: "kraken-caller-beast-of-depths",
  label: "Track Beast of the Depths",
  classId: "druid",
  minimumLevel: 13,
  spellLikeAbility: { spellId: "water-breathing", spellName: "Water Breathing", cadence: "at-will", kind: "spell-equivalent" },
  activeEffect: { name: "Beast of the Depths", targets: ["self"], bonus: 0, description: "Gain a swim speed equal to base land speed and breathe water continuously.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true },
  summary: "Records the permanent level-13 swim speed and water-breathing benefits."
}];

archetype.skillBonusAdjustments = ["Climb", "Swim"].map((skill) => ({ sourceFeatureId: wildShape.id, skill, minimumLevel: 4, base: 0, bonusByLevel: tentacleBonuses, condition: "while Kraken Caller Tentacle Form is active" }));
archetype.conditionalModifiers = [
  { sourceFeatureId: resistance.id, label: "Resist the Waves' Lure", condition: "Saving throws against spell-like and supernatural abilities of aquatic-subtype creatures", minimumLevel: 4, base: 4 },
  { sourceFeatureId: wildShape.id, label: "Tentacle Form — dirty trick", condition: "Dirty trick combat maneuver checks while Kraken Caller Tentacle Form is active", minimumLevel: 4, base: 0, bonusByLevel: tentacleBonuses }
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Besmara requirement, language swap, take 10 while swimming, Constitution-based breath duration, aquatic save bonus, legal Wild Shape forms, exact tentacle count/bonuses/duration, redistribution presets, underwater ink and cooldown, and permanent Beast of the Depths benefits are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Kraken Caller automation.");
