import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-swarm-monger.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const fecund = find("Fecund Familiar");
const lowFriends = find("Low Friends");
const shadowy = find("Shadowy Opportunist");
const pollution = find("Child of Pollution");
const swarmShape = find("Swarm Shape");
const levelSteps = (minimum, mapper) => Array.from({ length: 21 - minimum }, (_, index) => mapper(index + minimum));

Object.assign(fecund, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "swarm-monger-familiars",
  progressionKey: "swarm-monger-fecund-familiar",
  resourceActions: [
    {
      id: "swarm-monger-enter-familiar-swarm",
      label: "Transform Familiar into Swarm",
      classId: "druid",
      minimumLevel: 1,
      resourceId: "fecundFamiliarSwarmUses",
      cost: 1,
      actionTypeByLevel: [{ level: 1, actionType: "standard" }],
      activeEffect: {
        name: "Fecund Familiar Swarm Form",
        targets: ["allies"],
        bonus: 0,
        description: "The selected familiar fills four contiguous 5-foot squares, gains the swarm subtype and swarm attack, retains its normal AC, saves, and skills, cannot become Diminutive or smaller, and temporarily loses improved evasion, share spells, deliver touch attack, and scry on familiar. The master is immune to this swarm attack.",
        defaultRoundsByLevel: levelSteps(1, (level) => ({ level, rounds: level * 10 })),
        replaceExisting: true
      },
      summary: "Spend one Wisdom-based daily use. The duration is 1 minute per Druid level; use the displayed calculation to grant half the master's maximum hit points as temporary hit points."
    },
    {
      id: "swarm-monger-end-familiar-swarm",
      label: "Revert Familiar from Swarm",
      classId: "druid",
      minimumLevel: 1,
      actionTypeByLevel: [{ level: 1, actionType: "standard" }],
      requiredActiveEffectName: "Fecund Familiar Swarm Form",
      removeActiveEffectName: "Fecund Familiar Swarm Form",
      summary: "End the familiar's swarm form before its duration expires."
    },
    {
      id: "swarm-monger-familiar-swarm-attack-basic",
      label: "Roll Familiar Swarm Attack",
      classId: "druid",
      minimumLevel: 1,
      maximumLevel: 4,
      requiredActiveEffectName: "Fecund Familiar Swarm Form",
      combatRoll: {
        damage: { type: "swarm", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 6 }] },
        rangeByLevel: [{ level: 1, range: "creatures in the familiar's four swarm squares" }]
      },
      summary: "Roll 1d6 swarm damage; the Fortitude condition rider has not unlocked yet."
    },
    {
      id: "swarm-monger-familiar-swarm-attack-sickened",
      label: "Roll Familiar Swarm Attack",
      classId: "druid",
      minimumLevel: 5,
      maximumLevel: 11,
      requiredActiveEffectName: "Fecund Familiar Swarm Form",
      savingThrow: { label: "Fortitude", ability: "wisdom", base: 10, levelDivisor: 2, classId: "druid" },
      combatRoll: {
        damage: { type: "swarm", diceCountByLevel: [{ level: 5, count: 1 }, { level: 6, count: 2 }, { level: 11, count: 3 }], dieSidesByLevel: [{ level: 5, sides: 6 }] },
        rangeByLevel: [{ level: 5, range: "creatures in the familiar's four swarm squares" }],
        targetSave: { modifier: "fortitude", outcome: "negates-riders" },
        riders: [{ name: "Sickened", description: "A failed Fortitude save sickens the target for 1d6 rounds.", duration: { kind: "dice-rounds", count: 1, sides: 6 } }]
      },
      summary: "Roll level-scaled swarm damage and resolve the sickened rider against the calculated Fortitude DC."
    },
    {
      id: "swarm-monger-familiar-swarm-attack-nauseated",
      label: "Roll Familiar Swarm Attack",
      classId: "druid",
      minimumLevel: 12,
      requiredActiveEffectName: "Fecund Familiar Swarm Form",
      savingThrow: { label: "Fortitude", ability: "wisdom", base: 10, levelDivisor: 2, classId: "druid" },
      combatRoll: {
        damage: { type: "swarm", diceCountByLevel: [{ level: 12, count: 3 }, { level: 16, count: 4 }], dieSidesByLevel: [{ level: 12, sides: 6 }] },
        rangeByLevel: [{ level: 12, range: "creatures in the familiar's four swarm squares" }],
        targetSave: { modifier: "fortitude", outcome: "negates-riders" },
        riders: [{ name: "Nauseated", description: "A failed Fortitude save nauseates the target for 1d6 rounds.", duration: { kind: "dice-rounds", count: 1, sides: 6 } }]
      },
      summary: "Roll level-scaled swarm damage and resolve the upgraded nauseated rider against the calculated Fortitude DC."
    }
  ],
  numericCalculations: [{
    id: "fecund-familiar-temporary-hit-points",
    label: "Fecund Familiar temporary hit points",
    inputLabel: "Half the master's maximum hit points (round down)",
    inputMinimum: 0,
    inputMaximum: 9999,
    inputDefault: 0,
    outputLabel: "Temporary hit points to grant",
    baseByLevel: [{ level: 1, value: 0 }],
    classId: "druid",
    summary: "Enter half the master's maximum hit points, rounded down; grant this amount when swarm form begins."
  }],
  progressionProfiles: [{
    id: "swarm-monger-fecund-familiar",
    label: "Fecund Familiar Swarm",
    classId: "druid",
    columns: [{ id: "damage", label: "Swarm damage" }, { id: "rider", label: "Failed Fortitude save" }],
    steps: [
      { level: 1, values: { damage: "1d6", rider: "—" } },
      { level: 5, values: { damage: "1d6", rider: "Sickened 1d6 rounds" } },
      { level: 6, values: { damage: "2d6", rider: "Sickened 1d6 rounds" } },
      { level: 11, values: { damage: "3d6", rider: "Sickened 1d6 rounds" } },
      { level: 12, values: { damage: "3d6", rider: "Nauseated 1d6 rounds" } },
      { level: 16, values: { damage: "4d6", rider: "Nauseated 1d6 rounds" } }
    ],
    summary: "Save DC is 10 + half Druid level + Wisdom modifier."
  }]
});

lowFriends.grantedFeatId = "vermin-heart";
shadowy.progressionProfiles = [{
  id: "swarm-monger-shadowy-opportunist",
  label: "Shadowy Opportunist",
  classId: "druid",
  columns: [{ id: "local", label: "Knowledge (local)" }, { id: "stealth", label: "Stealth" }],
  steps: [{ level: 1, values: { local: "+2", stealth: "+2" } }]
}];

pollution.resourceActions = [{
  id: "swarm-monger-devour-rot",
  label: "Devour Rotting Food",
  classId: "druid",
  minimumLevel: 4,
  resourceId: "childOfPollutionUses",
  cost: 1,
  actionTypeByLevel: [{ level: 4, actionType: "standard" }],
  diceRoll: {
    label: "Temporary hit points",
    diceCountByLevel: [{ level: 4, count: 1 }],
    dieSidesByLevel: [{ level: 4, sides: 8 }],
    flatModifierByLevel: levelSteps(4, (level) => ({ level, modifier: level }))
  },
  activeEffect: {
    name: "Child of Pollution temporary hit points",
    targets: ["self"],
    bonus: 0,
    description: "The rolled 1d8 + Druid level temporary hit points last for 1 hour.",
    defaultRounds: 600,
    fixedRounds: true,
    replaceExisting: true
  },
  summary: "Spend one level-scaled daily use and roll 1d8 + Druid level temporary hit points lasting 1 hour."
}];

swarmShape.resourceActions = [{
  id: "swarm-monger-swarm-shape",
  label: "Use Swarm Shape",
  classId: "druid",
  minimumLevel: 12,
  resourceId: "wildShape",
  cost: 1,
  actionTypeByLevel: [{ level: 12, actionType: "standard" }],
  spellLikeAbility: { spellId: "swarm-skin", spellName: "Swarm Skin", cadence: "day", kind: "spell-equivalent" },
  confirmations: [{ id: "contiguous", label: "The form remains one contiguous vermin swarm", requiredForActivation: true }],
  activeEffect: {
    name: "Swarm Shape",
    targets: ["self"],
    bonus: 0,
    description: "Transform into one contiguous vermin swarm as swarm skin, retaining gear and the ability to revert normally.",
    defaultRoundsByLevel: levelSteps(12, (level) => ({ level, rounds: level * 10 })),
    replaceExisting: true
  },
  summary: "Spend one Wild Shape use to assume a single contiguous swarm form."
}];

archetype.companionGrants = [{
  id: "fecund-familiar",
  kind: "familiar",
  label: "Fecund familiar",
  optionFeatureId: fecund.id,
  sourceFeatureId: fecund.id,
  minimumLevel: 1,
  stacksWithExisting: true,
  rules: ["Uses Druid level as effective Wizard level", "Shares Child of Pollution, Shadowy Opportunist, and Venom Immunity benefits"]
}];
archetype.resourceAdjustments = [
  { sourceFeatureId: fecund.id, resourceId: "fecundFamiliarSwarmUses", label: "Fecund Familiar swarm transformations", unit: "use", operation: "replace", minimumLevel: 1, base: 0, abilityModifier: "wisdom", minimum: 1, refreshCadence: "day", dedicatedAction: true },
  { sourceFeatureId: pollution.id, resourceId: "childOfPollutionUses", label: "Child of Pollution", unit: "use", operation: "replace", minimumLevel: 4, base: 0, levelDivisor: 4, levelMultiplier: 1, minimum: 1, maximum: 5, refreshCadence: "day", dedicatedAction: true }
];
archetype.skillBonusAdjustments = [
  { sourceFeatureId: shadowy.id, skill: "Knowledge (local)", minimumLevel: 1, base: 2 },
  { sourceFeatureId: shadowy.id, skill: "Stealth", minimumLevel: 1, base: 2 }
];
archetype.conditionalModifiers = [
  { sourceFeatureId: pollution.id, label: "Child of Pollution", condition: "Saving throws against disease and poison", minimumLevel: 4, base: 4 }
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["All five legal Fecund Familiar choices, familiar progression and shared benefits, Wisdom-based transformation uses, swarm duration and damage tiers, save DC and condition upgrade, Vermin Heart, skill bonuses, Child of Pollution saves/uses/roll/duration, and Swarm Shape Wild Shape consumption are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Swarm Monger automation.");
