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
const rule = (prefix, name, minimumLevel, summary, cost = 1) => ({
  id: `${prefix}-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  name, minimumLevel, kind: "active", summary, resourceId: "bardicPerformance", cost,
  actionIds: [`${prefix}-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`],
});

const court = await load("bard-court-fool");
const courtPerformance = feature(court.value, "bard-court-fool-bardic-performance-1");
const caper = feature(court.value, "bard-court-fool-caper-and-jeer-ex-5");
if (!courtPerformance || !caper) throw new Error("Court Fool features were not found.");
courtPerformance.performanceRules = [
  rule("court-fool", "Distracting Motley", 1, "Roll Acrobatics each round; allies within 30 feet may substitute the result for saves against confusion and fascination, including a new save each round."),
  rule("court-fool", "Defuse Tension", 3, "Suppress fatigued and shaken for visible allies within 30 feet; one target at 3rd level and one more at 7th level and every 4 levels thereafter."),
];
courtPerformance.resourceActions = [
  {
    id: "court-fool-distracting-motley", label: "Distracting Motley", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(1),
    diceRoll: { label: "Acrobatics save substitute", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 20 }], modifierInputLabel: "Acrobatics modifier" },
    activeEffect: { name: "Distracting Motley", targets: ["allies"], bonus: 0, defaultRounds: 1, fixedRounds: true, rangeByLevel: [{ level: 1, feet: 30 }], replaceExisting: true, description: "Use the rolled Acrobatics total instead of a save against confusion or fascination; affected allies may attempt a new substituted save each round. Add the entertainer’s outfit +2 to the entered modifier when applicable." },
    summary: "Visual, mind-affecting performance; effects that do not allow saves are unaffected.",
  },
  {
    id: "court-fool-defuse-tension", label: "Defuse Tension", minimumLevel: 3, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(3),
    targetCountByLevel: [{ level: 3, count: 1 }, { level: 7, count: 2 }, { level: 11, count: 3 }, { level: 15, count: 4 }, { level: 19, count: 5 }],
    activeEffect: { name: "Defuse Tension", targets: ["allies"], bonus: 0, defaultRounds: 1, fixedRounds: true, rangeByLevel: [{ level: 3, feet: 30 }], replaceExisting: true, description: "The selected visible allies ignore fatigued and shaken while they continue to see the performance; this does not suppress exhausted or frightened and cannot target the court fool." },
    summary: "Visual performance; maintain it with one bardic performance round each round.",
  },
];
court.value.skillCheckRules = [
  { sourceFeatureId: caper.id, label: "Caper and Jeer — take 10", minimumLevel: 5, skills: ["Acrobatics", "Bluff"], result: 10, allowsStress: true },
  { sourceFeatureId: caper.id, label: "Caper and Jeer — take 20", minimumLevel: 5, skills: ["Acrobatics", "Bluff"], result: 20, allowsStress: true, condition: "Spend one Caper and Jeer daily use." },
];
court.value.resourceAdjustments = [{ resourceId: "caperAndJeer", label: "Caper and Jeer", unit: "use", minimumLevel: 5, base: 1, maximumByLevel: [{ level: 5, maximum: 1 }, { level: 11, maximum: 2 }, { level: 17, maximum: 3 }] }];
caper.resourceActions = [
  { id: "court-fool-take-20", label: "Take 20", minimumLevel: 5, classId: "bard", resourceId: "caperAndJeer", cost: 1, modes: [{ id: "acrobatics", label: "Acrobatics", summary: "Treat the Acrobatics check’s d20 result as 20." }, { id: "bluff", label: "Bluff", summary: "Treat the Bluff check’s d20 result as 20." }], fixedD20Result: { label: "Chosen skill d20 result", result: 20 }, summary: "May be used even in danger or while distracted." },
  { id: "court-fool-swift-diversion", label: "Create diversion to hide", minimumLevel: 5, classId: "bard", actionTypeByLevel: [{ level: 5, actionType: "swift" }], diceRoll: { label: "Bluff check", diceCountByLevel: [{ level: 5, count: 1 }], dieSidesByLevel: [{ level: 5, sides: 20 }], modifierInputLabel: "Bluff modifier" }, summary: "Use the Bluff result to create a diversion to hide as a swift action." },
];
court.value.mechanicalCoverage = "full";
court.value.mechanicalNotes = ["Buffoonery scaling, both performances, exact target growth, save substitution, condition suppression, take-10/take-20 rules and daily uses, and the swift diversion are automated."];

const diva = await load("bard-chelish-diva");
const famous = feature(diva.value, "bard-chelish-diva-famous-1");
const prima = feature(diva.value, "bard-chelish-diva-prima-donna-ex-2");
const divaPerformance = feature(diva.value, "bard-chelish-diva-bardic-performance-3");
if (!famous || !prima || !divaPerformance) throw new Error("Chelish Diva features were not found.");
// Famous already has an exact level table in the shared skill-bonus overlay.
// Keep one source of truth so the build merger cannot stack duplicate bonuses.
delete diva.value.skillBonusAdjustments;
famous.progressionProfiles = [{
  id: "chelish-diva-famous-progression", label: "Famous region", classId: "bard",
  columns: [{ id: "population", label: "Population reached" }, { id: "bonus", label: "Skill bonus" }],
  steps: [
    { level: 1, values: { population: "Up to 1,000", bonus: "+1 Bluff and Intimidate" } },
    { level: 5, values: { population: "Up to 5,000", bonus: "+2 Bluff and Intimidate" } },
    { level: 9, values: { population: "Up to 25,000", bonus: "+3 Bluff and Intimidate" } },
    { level: 13, values: { population: "Up to 100,000", bonus: "+4 Bluff and Intimidate" } },
    { level: 17, values: { population: "Most civilized folk (GM discretion)", bonus: "+5 Diplomacy and Intimidate" } },
  ],
  summary: "Applies in the selected region and when influencing people from it.",
}];
prima.resourceActions = [{
  id: "chelish-diva-prima-donna", label: "Use Prima Donna", minimumLevel: 2, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 2, actionType: "free" }],
  modes: [
    { id: "perform-check", label: "+2 Perform check", summary: "Augment countersong with +2 on its Perform check." },
    { id: "performance-dc", label: "+2 performance save DC", summary: "Augment deadly performance, fascinate, frightening tune, or scathing tirade with +2 to its save DC." },
  ],
  activeEffect: { name: "Prima Donna", targets: ["performanceChecks", "performanceSaveDc"], bonus: 2, defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "Apply +2 to the selected eligible performance check or saving throw DC for this round." },
  summary: "Costs one additional bardic performance round for every augmented round.",
}];
divaPerformance.performanceRules = [
  rule("chelish-diva", "Devastating Aria", 3, "As a standard action, deal 1d4 + Chelish diva level sonic damage to an object, or half that amount to a living creature."),
  rule("chelish-diva", "Scathing Tirade", 8, "Frighten one visible and hearing enemy within 30 feet while maintained, with the effect lingering 1d4 rounds when attention moves away."),
];
divaPerformance.resourceActions = [
  {
    id: "chelish-diva-devastating-aria", label: "Devastating Aria", minimumLevel: 3, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 3, actionType: "standard" }], modeLabel: "Target",
    modes: [{ id: "object", label: "Object", summary: "Deal the full rolled sonic damage." }, { id: "living-creature", label: "Living creature", summary: "Deal half the rolled sonic damage, rounded down." }],
    diceRoll: { label: "Sonic damage", diceCountByLevel: [{ level: 3, count: 1 }], dieSidesByLevel: [{ level: 3, sides: 4 }], flatModifierByLevel: Array.from({ length: 18 }, (_, index) => ({ level: index + 3, modifier: index + 3 })), resultDivisorByMode: [{ modeId: "living-creature", divisor: 2 }], modeEffects: [{ modeId: "object", kind: "damage" }, { modeId: "living-creature", kind: "damage" }] },
    summary: "This performance can never activate faster than a standard action.",
  },
  {
    id: "chelish-diva-scathing-tirade", label: "Scathing Tirade", minimumLevel: 8, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 8, actionType: "standard" }],
    diceRoll: { label: "Lingering duration after changing targets", diceCountByLevel: [{ level: 8, count: 1 }], dieSidesByLevel: [{ level: 8, sides: 4 }] },
    activeEffect: { name: "Scathing Tirade — frightened", targets: ["enemy"], bonus: 0, defaultRounds: 1, rangeByLevel: [{ level: 8, feet: 30 }], replaceExisting: false, description: "The visible and hearing target is frightened while within 30 feet and the tirade remains directed at it. When attention changes, set the tracker to the rolled 1d4 lingering rounds. This cannot escalate frightened to panicked." },
    summary: "Audible, visual, mind-affecting fear performance; only one current target, though earlier targets can still be lingering.",
  },
];
diva.value.mechanicalCoverage = "full";
diva.value.mechanicalNotes = ["Famous region and skill progression, Prima Donna resource/DC tracking, armor progression, and both performances with exact damage, action, range, target and lingering rules are automated."];

for (const record of [court, diva]) await writeFile(record.url, `${JSON.stringify(record.value, null, 2)}\n`);
console.log("Annotated Court Fool and Chelish Diva stage performances.");
