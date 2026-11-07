import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  archetypeAutomationSummary,
  archetypePerformanceRules,
  namedPerformances,
} from "../packages/engine/src/index.js";

const urbanSkald = archetypes.find((candidate) => candidate.id === "skald-urban-skald");
const ragingSong = urbanSkald.replacements
  .flatMap((replacement) => replacement.features)
  .find((feature) => /^Raging Song/.test(feature.name));

test("Urban Skald models every published Raging Song and closes its manual gap", () => {
  assert.equal(ragingSong.level, 1);
  assert.deepEqual(ragingSong.performanceRules.map((rule) => rule.name), namedPerformances(ragingSong));
  assert.deepEqual(archetypeAutomationSummary(urbanSkald, data.feats, data.spells).manual, []);
  assert.ok(ragingSong.performanceRules.every((rule) => rule.resourceId === "ragingSongRounds"));
  const actionIds = new Set(ragingSong.resourceActions.map((action) => action.id));
  assert.ok(ragingSong.performanceRules.every((rule) => rule.actionIds.every((id) => actionIds.has(id))));
});

test("Raging Song rules unlock at their exact skald levels", () => {
  assert.deepEqual(archetypePerformanceRules([urbanSkald], { skald: 1 }).map((rule) => rule.name), ["Controlled Inspired Rage"]);
  assert.deepEqual(archetypePerformanceRules([urbanSkald], { skald: 3 }).map((rule) => rule.name), ["Controlled Inspired Rage", "Infuriating Mockery"]);
  assert.deepEqual(archetypePerformanceRules([urbanSkald], { skald: 10 }).map((rule) => rule.name), ["Controlled Inspired Rage", "Infuriating Mockery", "Humiliating Defamation"]);
});

test("Controlled Inspired Rage exposes only complete legal +2 allocations at each tier", () => {
  const action = ragingSong.resourceActions.find((candidate) => candidate.id === "urban-skald-controlled-rage");
  assert.deepEqual(
    [1, 8, 16].map((level) => action.modes.filter((mode) => mode.minimumLevel <= level).length),
    [3, 9, 19],
  );
  for (const mode of action.modes) {
    const total = mode.activeEffects.reduce((sum, effect) => sum + effect.bonus, 0);
    assert.equal(total, mode.minimumLevel >= 16 ? 6 : mode.minimumLevel >= 8 ? 4 : 2, mode.label);
    assert.ok(mode.activeEffects.every((effect) => effect.bonus > 0 && effect.bonus % 2 === 0));
  }
});

test("Mockery and Defamation use the skald save formula and charge one maintained-song round", () => {
  const actions = Object.fromEntries(ragingSong.resourceActions.map((action) => [action.id, action]));
  for (const id of ["urban-skald-infuriating-mockery", "urban-skald-humiliating-primary"]) {
    assert.deepEqual(actions[id].savingThrow, { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "skald" });
    assert.equal(actions[id].resourceId, "ragingSongRounds");
    assert.equal(actions[id].cost, 1);
  }
  assert.equal(actions["urban-skald-infuriating-mockery-extra"].minimumLevel, 7);
  assert.equal(actions["urban-skald-infuriating-mockery-extra"].cost, 0);
  assert.equal(actions["urban-skald-humiliating-secondary"].minimumLevel, 10);
  assert.equal(actions["urban-skald-humiliating-secondary"].cost, 0);
});
