import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, namedPerformances } from "../packages/engine/src/index.js";

const record = (id) => archetypes.find((candidate) => candidate.id === id);
const feature = (id, pattern) => record(id).replacements.flatMap((replacement) => replacement.features).find((candidate) => pattern.test(candidate.name));

test("the three-family batch publishes every performance and closes every manual gap", () => {
  for (const id of ["bard-argent-voice", "bard-celebrity", "bard-demagogue"]) {
    const performance = feature(id, /^Bardic Performance/);
    assert.deepEqual(performance.performanceRules.map((rule) => rule.name), namedPerformances(performance), id);
    const actionIds = new Set(performance.resourceActions.map((action) => action.id));
    assert.ok(performance.performanceRules.every((rule) => rule.actionIds.every((actionId) => actionIds.has(actionId))), id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Argent Voice retains later Versatile Performance slots and forces Sing at level 2", () => {
  const source = record("bard-argent-voice");
  const applied = applyArchetype(data.classes.find((candidate) => candidate.id === "bard"), source, data.classes, data.spells);
  const versatile = applied.features.filter((candidate) => candidate.progressionKey === "bard-versatile-performance");
  assert.deepEqual(versatile.map((candidate) => candidate.level), [2, 6, 10, 14, 18]);
  assert.deepEqual(versatile[0].optionChoiceIds, ["bard-versatile-performance-sing"]);
  const calculation = versatile[0].numericCalculations[0];
  assert.deepEqual(calculation.inputMultiplierByLevel, [{ level: 2, multiplier: 0 }, { level: 6, multiplier: 1 }, { level: 10, multiplier: 2 }, { level: 14, multiplier: 3 }, { level: 18, multiplier: 4 }]);

  const performance = feature(source.id, /^Bardic Performance/);
  const actions = Object.fromEntries(performance.resourceActions.map((action) => [action.id, action]));
  assert.deepEqual(actions["argent-voice-limning-verse"].activeEffect.rangeByLevel.map(({ level, feet }) => [level, feet]), [[1, 10], [4, 20], [8, 30], [12, 40], [16, 50], [20, 60]]);
  assert.equal(actions["argent-voice-shattering-crescendo"].cost, 2);
  assert.equal(actions["argent-voice-shattering-crescendo"].actionTypeByLevel[0].actionType, "full-round");
  assert.match(actions["argent-voice-devilbane-refrain"].modes[1].summary, /\+2d6/);
});

test("Celebrity and Demagogue calculate exact fame, crowd, save, target, and duration progressions", () => {
  for (const [id, skills] of [["bard-celebrity", ["Diplomacy", "Intimidate"]], ["bard-demagogue", ["Bluff", "Intimidate"]]]) {
    const source = record(id);
    assert.deepEqual(source.skillBonusAdjustments.map((adjustment) => adjustment.skill), skills, id);
    assert.deepEqual(feature(id, /^Famous$/).progressionProfiles[0].steps.map((step) => [step.level, step.values.bonus]), [[1, "+1"], [5, "+2"], [9, "+3"], [13, "+4"], [17, "+5"]]);
    const calculation = feature(id, /^Bardic Performance/).numericCalculations[0];
    assert.equal(calculation.inputMultiplierByLevel.find((step) => step.level === 17).multiplier, 8);
  }
  const demagogue = feature("bard-demagogue", /^Bardic Performance/);
  const incite = demagogue.resourceActions.find((action) => action.id === "demagogue-incite-violence");
  assert.deepEqual(incite.targetCountByLevel.at(-1), { level: 20, count: 20 });
  assert.deepEqual(incite.targetEffectRoll.effectsByLevel[0].duration, { kind: "level-rounds" });
  assert.deepEqual(incite.savingThrow, { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" });
});
