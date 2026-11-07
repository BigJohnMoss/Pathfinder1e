import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetypeResourceAdjustments,
  archetypeAutomationSummary,
  archetypePerformanceRules,
  namedPerformances,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((candidate) => candidate.id === id);
const performanceFeature = (id) => archetype(id).replacements
  .flatMap((replacement) => replacement.features)
  .find((feature) => feature.performanceRules?.length);

test("Ocean's Echo and Wyrm Singer publish every named performance without manual gaps", () => {
  for (const id of ["oracle-ocean-s-echo", "skald-wyrm-singer"]) {
    const source = archetype(id);
    const feature = performanceFeature(id);
    assert.deepEqual(feature.performanceRules.map((rule) => rule.name), namedPerformances(feature), id);
    const actionIds = new Set(feature.resourceActions.map((action) => action.id));
    assert.ok(feature.performanceRules.every((rule) => rule.actionIds.every((actionId) => actionIds.has(actionId))), id);
    assert.deepEqual(archetypeAutomationSummary(source, data.feats, data.spells).manual, [], id);
  }
});

test("Ocean's Echo calculates rounds, unlocks, action speed, and exact scaling", () => {
  const source = archetype("oracle-ocean-s-echo");
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [source], 1, { charisma: 3 }), { inspiringSongRounds: 4 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [source], 20, { charisma: 5 }), { inspiringSongRounds: 25 });
  assert.deepEqual(archetypePerformanceRules([source], { oracle: 1 }).map((rule) => rule.name), ["Inspire Courage"]);
  assert.deepEqual(archetypePerformanceRules([source], { oracle: 15 }).map((rule) => rule.name), ["Inspire Courage", "Inspire Competence", "Inspire Heroics"]);

  const actions = Object.fromEntries(performanceFeature(source.id).resourceActions.map((action) => [action.id, action]));
  assert.deepEqual(actions["oceans-echo-inspire-courage"].actionTypeByLevel, [
    { level: 1, actionType: "standard" },
    { level: 7, actionType: "move" },
    { level: 13, actionType: "swift" },
  ]);
  assert.deepEqual(actions["oceans-echo-inspire-courage"].activeEffect.targets, ["attackRolls", "weaponDamageRolls", "savingThrowsAgainstCharmAndFear"]);
  assert.deepEqual(actions["oceans-echo-inspire-courage"].activeEffect.bonusByLevel.map(({ level, bonus }) => [level, bonus]), [[1, 1], [5, 2], [11, 3], [17, 4]]);
  assert.deepEqual(actions["oceans-echo-inspire-competence"].activeEffect.bonusByLevel.map(({ level, bonus }) => [level, bonus]), [[3, 2], [7, 3], [11, 4], [15, 5], [19, 6]]);
  assert.deepEqual(actions["oceans-echo-inspire-heroics"].activeEffect.targets, ["armorClass", "savingThrows"]);
});

test("Wyrm Singer calculates every Draconic Rage tier and Wyrm Saga", () => {
  const source = archetype("skald-wyrm-singer");
  assert.deepEqual(archetypePerformanceRules([source], { skald: 1 }).map((rule) => rule.name), ["Draconic Rage"]);
  assert.deepEqual(archetypePerformanceRules([source], { skald: 14 }).map((rule) => rule.name), ["Draconic Rage", "Wyrm Saga"]);

  const actions = Object.fromEntries(performanceFeature(source.id).resourceActions.map((action) => [action.id, action]));
  const rage = actions["wyrm-singer-draconic-rage"];
  assert.deepEqual(rage.modes.map((mode) => [mode.minimumLevel, mode.maximumLevel, mode.activeEffects.find((effect) => effect.target === "meleeAttackRolls").bonus, mode.activeEffects.find((effect) => effect.target === "savingThrowsAgainstParalysisAndSleep").bonus]), [
    [1, 3, 2, 2], [4, 7, 2, 3], [8, 11, 3, 4], [12, 15, 3, 5], [16, 19, 4, 6], [20, 20, 4, 7],
  ]);
  assert.ok(rage.modes.every((mode) => mode.activeEffects.find((effect) => effect.target === "armorClass")?.bonus === -1));

  const saga = actions["wyrm-singer-wyrm-saga"];
  assert.equal(saga.minimumLevel, 14);
  assert.equal(saga.resourceId, "ragingSongRounds");
  assert.equal(saga.cost, 1);
  assert.equal(saga.spellLikeAbility.spellId, "form-of-the-dragon-i");
  assert.match(saga.spellLikeAbility.spellName, /no breath weapon/i);
  assert.deepEqual(saga.recipients, [{ id: "single-ally", label: "One ally within 60 feet" }]);
});
