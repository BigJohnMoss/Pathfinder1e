import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { archetypeAutomationSummary, namedPerformances } from "../packages/engine/src/index.js";

const record = (id) => archetypes.find((candidate) => candidate.id === id);
const feature = (id, pattern) => record(id).replacements.flatMap((replacement) => replacement.features).find((candidate) => pattern.test(candidate.name));

test("Court Fool and Chelish Diva publish every performance and close every manual gap", () => {
  for (const id of ["bard-court-fool", "bard-chelish-diva"]) {
    const performance = feature(id, /^Bardic Performance/);
    assert.deepEqual(performance.performanceRules.map((rule) => rule.name), namedPerformances(performance), id);
    const actionIds = new Set(performance.resourceActions.map((action) => action.id));
    assert.ok(performance.performanceRules.every((rule) => rule.actionIds.every((actionId) => actionIds.has(actionId))), id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Court Fool models save substitution, Defuse target growth, and all Caper and Jeer uses", () => {
  const source = record("bard-court-fool");
  const performance = feature(source.id, /^Bardic Performance/);
  const distracting = performance.resourceActions.find((action) => action.id === "court-fool-distracting-motley");
  const defuse = performance.resourceActions.find((action) => action.id === "court-fool-defuse-tension");
  assert.equal(distracting.diceRoll.modifierInputLabel, "Acrobatics modifier");
  assert.deepEqual(defuse.targetCountByLevel, [{ level: 3, count: 1 }, { level: 7, count: 2 }, { level: 11, count: 3 }, { level: 15, count: 4 }, { level: 19, count: 5 }]);
  assert.deepEqual(source.resourceAdjustments[0].maximumByLevel, [{ level: 5, maximum: 1 }, { level: 11, maximum: 2 }, { level: 17, maximum: 3 }]);
  assert.deepEqual(source.skillCheckRules.map((rule) => [rule.result, rule.allowsStress]), [[10, true], [20, true]]);
  assert.equal(feature(source.id, /^Caper and Jeer/).resourceActions[0].fixedD20Result.result, 20);
});

test("Chelish Diva models the exact fame switch, Prima Donna, and performance damage", () => {
  const source = record("bard-chelish-diva");
  assert.deepEqual(source.skillBonusAdjustments.map((adjustment) => [adjustment.skill, adjustment.minimumLevel, adjustment.maximumLevel, adjustment.bonusByLevel?.at(-1)?.bonus ?? adjustment.base]), [["Bluff", undefined, 16, 4], ["Diplomacy", 17, undefined, 5], ["Intimidate", undefined, undefined, 5]]);
  const prima = feature(source.id, /^Prima Donna/).resourceActions[0];
  assert.equal(prima.cost, 1);
  assert.deepEqual(prima.activeEffect.targets, ["performanceChecks", "performanceSaveDc"]);
  const actions = Object.fromEntries(feature(source.id, /^Bardic Performance/).resourceActions.map((action) => [action.id, action]));
  assert.equal(actions["chelish-diva-devastating-aria"].diceRoll.flatModifierByLevel.at(-1).modifier, 20);
  assert.deepEqual(actions["chelish-diva-devastating-aria"].diceRoll.resultDivisorByMode, [{ modeId: "living-creature", divisor: 2 }]);
  assert.equal(actions["chelish-diva-scathing-tirade"].activeEffect.rangeByLevel[0].feet, 30);
});
