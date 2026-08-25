import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, applyArchetypeResourceAdjustments, archetypeAutomationSummary } from "../packages/engine/src/index.js";

const ids = ["bard-arcane-healer", "bard-lotus-geisha", "bard-pitax-academy-of-grand-arts", "bard-sorrowsoul"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const feature = (id, pattern) => record(id).replacements.flatMap((replacement) => replacement.features).find((candidate) => pattern.test(candidate.name));

test("all four single-gap Bard archetypes are now fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Arcane Healer unlocks every exact two-round cure tier with a target limit", () => {
  const actions = feature("bard-arcane-healer", /^Inspiring Healing/).resourceActions;
  assert.deepEqual(actions.map((action) => [action.minimumLevel, action.cost, action.spellLikeAbility.spellId]), [[5, 2, "cure-light-wounds"], [11, 2, "cure-moderate-wounds"], [17, 2, "cure-serious-wounds"]]);
  assert.ok(actions.every((action) => action.confirmations[0].requiredForActivation && action.activeEffect.fixedRounds));
});

test("Lotus Geisha exposes all enhanced single-target performance modes", () => {
  const action = feature("bard-lotus-geisha", /^Enrapturing Performance/).resourceActions[0];
  assert.deepEqual(action.actionTypeByLevel, [{ level: 2, actionType: "standard" }, { level: 7, actionType: "move" }, { level: 13, actionType: "swift" }]);
  assert.deepEqual(action.modes.map((mode) => mode.id), ["will-save-performance", "inspire-competence", "inspire-courage", "inspire-greatness", "inspire-heroics"]);
  assert.equal(action.modes[0].activeEffects[0].bonus, 2);
});

test("Focused Performance requires a category and grants exactly 6, 12, 18, then 24 restricted rounds", () => {
  const source = record("bard-pitax-academy-of-grand-arts");
  const applied = applyArchetype(data.classes.find((candidate) => candidate.id === "bard"), source, data.classes, data.spells);
  const focused = applied.features.find((candidate) => candidate.id === "bard-pitax-academy-of-grand-arts-focused-performance-ex-2");
  assert.equal(focused.optionGroupId, "bard-focused-performance-categories");
  assert.equal(focused.choiceRequired, true);
  for (const [level, expected] of [[2, 6], [8, 12], [14, 18], [20, 24]]) {
    assert.equal(applyArchetypeResourceAdjustments({}, [source], level).focusedPerformanceRounds, expected);
  }
});

test("Sorrowsoul models every Lyric Sorrow tier and its fast-healing capstone mode", () => {
  const action = feature("bard-sorrowsoul", /^Lyric Sorrow/).resourceActions[0];
  assert.equal(action.cost, 2);
  assert.deepEqual(action.modes.filter((mode) => mode.id.startsWith("courage")).map((mode) => mode.activeEffects[0].bonus), [2, 4, 6, 8]);
  assert.equal(action.modes.find((mode) => mode.id === "greatness").activeEffects.find((effect) => effect.target === "attackRolls").bonus, 3);
  assert.equal(action.modes.find((mode) => mode.id === "heroics").activeEffects.find((effect) => effect.fastHealing).fastHealing, 5);
});
