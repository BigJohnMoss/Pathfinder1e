import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const load = async (name) => {
  const url = new URL(`packages/data/src/archetypes/${name}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const feature = (record, id) => record.replacements.flatMap((replacement) => replacement.features ?? []).find((candidate) => candidate.id === id);
const bardSpeed = (minimumLevel = 1) => [
  { level: minimumLevel, actionType: minimumLevel >= 13 ? "swift" : minimumLevel >= 7 ? "move" : "standard" },
  ...(minimumLevel < 7 ? [{ level: 7, actionType: "move" }] : []),
  ...(minimumLevel < 13 ? [{ level: 13, actionType: "swift" }] : []),
];
const namedRule = (prefix, name, minimumLevel, summary, cost = 1) => ({ id: `${prefix}-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, name, minimumLevel, kind: "active", summary, resourceId: "bardicPerformance", cost, actionIds: [`${prefix}-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`] });
const famousProfile = (id, skills) => ({
  skillBonusAdjustments: skills.map((skill) => ({ sourceFeatureId: id, skill, minimumLevel: 1, base: 1, perInterval: 1, interval: 4, maximum: 5, condition: "within the chosen famous region or influencing people from that region" })),
  progressionProfiles: [{
    id: `${id}-progression`, label: "Famous region", classId: "bard",
    columns: [{ id: "population", label: "Population reached" }, { id: "bonus", label: "Skill bonus" }],
    steps: [
      { level: 1, values: { population: "Up to 1,000", bonus: "+1" } },
      { level: 5, values: { population: "Up to 5,000", bonus: "+2" } },
      { level: 9, values: { population: "Up to 25,000", bonus: "+3" } },
      { level: 13, values: { population: "Up to 100,000", bonus: "+4" } },
      { level: 17, values: { population: "Most civilized folk (GM discretion)", bonus: "+5" } },
    ],
    summary: `Applies to ${skills.join(" and ")} checks in the selected region and when influencing its people.`,
  }],
});
const gatherCalculation = (prefix) => ({
  id: `${prefix}-gather-crowd-size`, label: "Gather Crowd audience", inputLabel: "Perform check result", inputMinimum: 0, inputMaximum: 999, inputDefault: 20, outputLabel: "Typical crowd size", classId: "bard",
  baseByLevel: [{ level: 5, value: 0 }],
  inputMultiplierByLevel: Array.from({ length: 16 }, (_, index) => ({ level: index + 5, multiplier: Math.floor((index + 5) / 2) })),
  summary: "The local population can limit the result. The audience gathers over 1d10 rounds and disperses over 1d10 rounds if not engaged.",
});
const gatherAction = (prefix) => ({
  id: `${prefix}-gather-crowd`, label: "Gather Crowd", minimumLevel: 5, classId: "bard", resourceId: "bardicPerformance", cost: 1,
  actionTypeByLevel: bardSpeed(5), diceRoll: { label: "Rounds for crowd to gather", diceCountByLevel: [{ level: 5, count: 1 }], dieSidesByLevel: [{ level: 5, sides: 10 }] },
  summary: "Spend one performance round, enter the Perform result above, and roll the time needed for the crowd to gather.",
});

const argent = await load("bard-argent-voice");
const argentPerformance = feature(argent.value, "bard-argent-voice-bardic-performance-1");
const dedicated = feature(argent.value, "bard-argent-voice-dedicated-performance-ex-2");
if (!argentPerformance || !dedicated) throw new Error("Argent Voice features were not found.");
argent.value.replacements[0].featureIds = ["bard-fascinate-1", "bard-suggestion-6", "bard-dirge-of-doom-8", "bard-frightening-tune-14", "bard-mass-suggestion-18", "bard-versatile-performance-2"];
argentPerformance.performanceRules = [
  namedRule("argent-voice", "Limning Verse", 1, "Outline detectable evil outsiders in the current radius as faerie fire."),
  namedRule("argent-voice", "Shattering Crescendo", 6, "Spend two rounds in a full-round action to dispel one evil spell or an enchantment cast by an evil creature; at 18th level this also reaches break-enchantment effects.", 2),
  namedRule("argent-voice", "Devilbane Refrain", 8, "Allies within 30 feet who can hear the song treat their weapons as silver; at 14th level those weapons also gain evil outsider bane."),
];
argentPerformance.resourceActions = [
  {
    id: "argent-voice-limning-verse", label: "Begin Limning Verse", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(1),
    spellLikeAbility: { spellId: "faerie-fire", spellName: "Faerie Fire (detectable evil outsiders only)", cadence: "at-will", kind: "spell-equivalent" },
    activeEffect: { name: "Limning Verse", targets: ["area"], bonus: 0, defaultRounds: 1, replaceExisting: true, rangeByLevel: [{ level: 1, feet: 10 }, { level: 4, feet: 20 }, { level: 8, feet: 30 }, { level: 12, feet: 40 }, { level: 16, feet: 50 }, { level: 20, feet: 60 }], description: "Detectable evil outsiders in range are outlined as faerie fire." },
    summary: "Maintain with one bardic performance round each round; alignment-concealment defenses prevent the outline.",
  },
  {
    id: "argent-voice-shattering-crescendo", label: "Use Shattering Crescendo", minimumLevel: 6, classId: "bard", resourceId: "bardicPerformance", cost: 2, actionTypeByLevel: [{ level: 6, actionType: "full-round" }],
    modeLabel: "Effect", modes: [
      { id: "dispel", label: "Dispel evil spell or enchantment", minimumLevel: 6, summary: "Attempt dispel magic using Bard level as caster level." },
      { id: "break-enchantment", label: "Break enchantment effect", minimumLevel: 18, summary: "At 18th level, also attempt to remove an effect eligible for break enchantment." },
    ],
    spellLikeAbility: { spellId: "dispel-magic", spellName: "Dispel Magic / Break Enchantment", cadence: "at-will", kind: "spell-equivalent" },
    summary: "Spend two performance rounds and use Bard level for the dispel check.",
  },
  {
    id: "argent-voice-devilbane-refrain", label: "Begin Devilbane Refrain", minimumLevel: 8, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(8),
    modeLabel: "Current benefit", modes: [
      { id: "silver", label: "Silver weapons", minimumLevel: 8, maximumLevel: 13, defaultRounds: 1, summary: "Natural and manufactured weapons of hearing allies within 30 feet count as silver for damage reduction." },
      { id: "silver-and-bane", label: "Silver + evil outsider bane", minimumLevel: 14, defaultRounds: 1, summary: "Those weapons count as silver and gain evil outsider bane (+2 enhancement and +2d6 damage against evil outsiders)." },
    ],
    activeEffect: { name: "Devilbane Refrain", targets: ["allies"], bonus: 0, defaultRounds: 1, rangeByLevel: [{ level: 8, feet: 30 }], replaceExisting: true, description: "Hearing allies gain the selected weapon benefits while the song is maintained." },
    summary: "Maintain with one bardic performance round per round.",
  },
];
Object.assign(dedicated, {
  type: "selectable", choiceRequired: true, optionGroupId: "bard-versatile-performances", optionChoiceIds: ["bard-versatile-performance-sing"], progressionKey: "bard-versatile-performance",
  numericCalculations: [{ id: "argent-dedicated-performance-bonus", label: "Dedicated Performance bonus", inputLabel: "Other fully ranked Perform skills", inputMinimum: 0, inputMaximum: 9, inputDefault: 0, outputLabel: "Perform (sing) bonus", classId: "bard", baseByLevel: [{ level: 2, value: 0 }], inputMultiplierByLevel: [{ level: 2, multiplier: 0 }, { level: 6, multiplier: 1 }, { level: 10, multiplier: 2 }, { level: 14, multiplier: 3 }, { level: 18, multiplier: 4 }], summary: "At 6th level, multiply the number of other fully ranked Perform skills by the current per-skill bonus." }],
});
argent.value.mechanicalCoverage = "full";
argent.value.mechanicalNotes = ["All three songs, exact ranges, costs, activation speeds, spell equivalents, silver/bane progression, forced Perform (sing), and the Dedicated Performance calculator are automated."];

const celebrity = await load("bard-celebrity");
const celebrityFamous = feature(celebrity.value, "bard-celebrity-famous-1");
const celebrityPerformance = feature(celebrity.value, "bard-celebrity-bardic-performance-5");
if (!celebrityFamous || !celebrityPerformance) throw new Error("Celebrity features were not found.");
const celebrityFamousRules = famousProfile(celebrityFamous.id, ["Diplomacy", "Intimidate"]);
celebrity.value.skillBonusAdjustments = celebrityFamousRules.skillBonusAdjustments;
celebrityFamous.progressionProfiles = celebrityFamousRules.progressionProfiles;
celebrityPerformance.numericCalculations = [gatherCalculation("celebrity")];
celebrityPerformance.performanceRules = [
  namedRule("celebrity", "Gather Crowd", 5, "Calculate the typical audience from Bard level and the Perform result, then roll its gathering time."),
  namedRule("celebrity", "Shining Star", 8, "Fascinated creatures take –4 on saves prompted by potential threats, obvious threats allow a save, and affected creatures ignore shaken."),
];
celebrityPerformance.resourceActions = [gatherAction("celebrity"), {
  id: "celebrity-shining-star", label: "Begin Shining Star", minimumLevel: 8, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(8),
  activeEffect: { name: "Shining Star", targets: ["enemy"], bonus: -4, defaultRounds: 1, replaceExisting: true, description: "A fascinated target takes –4 on saves to break fascination because of potential threats; obvious threats permit a save instead of ending it. Affected creatures ignore shaken.", additionalEffectsByLevel: [{ minimumLevel: 8, name: "Shining Star — shaken suppression", target: "allies", bonus: 0, description: "Creatures affected by this Fascinate ignore the shaken condition." }] },
  summary: "Maintain Fascinate and spend one performance round each round.",
}];
celebrity.value.mechanicalCoverage = "full";
celebrity.value.mechanicalNotes = ["Famous region scaling and conditional skills, Gather Crowd size/time, and Shining Star's fascination rules are automated."];

const demagogue = await load("bard-demagogue");
const demagogueFamous = feature(demagogue.value, "bard-demagogue-famous-1");
const demagoguePerformance = feature(demagogue.value, "bard-demagogue-bardic-performance-5");
if (!demagogueFamous || !demagoguePerformance) throw new Error("Demagogue features were not found.");
const demagogueFamousRules = famousProfile(demagogueFamous.id, ["Bluff", "Intimidate"]);
demagogue.value.skillBonusAdjustments = demagogueFamousRules.skillBonusAdjustments;
demagogueFamous.progressionProfiles = demagogueFamousRules.progressionProfiles;
demagoguePerformance.numericCalculations = [gatherCalculation("demagogue")];
demagoguePerformance.performanceRules = [
  namedRule("demagogue", "Gather Crowd", 5, "Calculate the typical audience from Bard level and the Perform result, then roll its gathering time."),
  namedRule("demagogue", "Incite Violence", 6, "While Fascinate continues, up to Bard level fascinated targets save or rage for Bard level rounds and attack the named target."),
  namedRule("demagogue", "Righteous Cause", 18, "After Fascinate and Incite Violence without a target, failed saves apply a plausible mass suggestion for one day."),
];
demagoguePerformance.resourceActions = [gatherAction("demagogue"), {
  id: "demagogue-incite-violence", label: "Incite Violence", minimumLevel: 6, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 6, actionType: "standard" }],
  confirmations: [{ id: "fascinated-crowd", label: "The selected crowd members are currently fascinated", requiredForActivation: true }], targetCountByLevel: Array.from({ length: 15 }, (_, index) => ({ level: index + 6, count: index + 6 })),
  savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" },
  targetEffectRoll: { modifier: "will", effectsByLevel: [{ level: 6, name: "Incited Violence", description: "Affected by rage and compelled to attack the named person or object; sound-based and subject to countersong.", duration: { kind: "level-rounds" } }] },
  summary: "Resolve each selected crowd member (up to Bard level) against the displayed Will DC while Fascinate continues.",
}, {
  id: "demagogue-righteous-cause", label: "Righteous Cause", minimumLevel: 18, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(18),
  confirmations: [{ id: "fascinate-incite-sequence", label: "The crowd is fascinated and Incite Violence was used without naming a target", requiredForActivation: true }],
  savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" },
  targetEffectRoll: { modifier: "will", effectsByLevel: [{ level: 18, name: "Righteous Cause", description: "Affected by a plausible mass suggestion chosen for the common cause for one day.", duration: { kind: "fixed-rounds", rounds: 999 } }] },
  summary: "Resolve fascinated creatures against the displayed Will DC and track the one-day plausible suggestion.",
}];
demagogue.value.mechanicalCoverage = "full";
demagogue.value.mechanicalNotes = ["Famous region scaling and conditional skills, Gather Crowd, Incite Violence target cap/save/rage duration, and Righteous Cause prerequisites/save/duration are automated."];

for (const record of [argent, celebrity, demagogue]) await writeFile(record.url, `${JSON.stringify(record.value, null, 2)}\n`);
console.log("Annotated Argent Voice, Celebrity, and Demagogue performance families.");
