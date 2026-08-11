import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, applyArchetypeResourceAdjustments, apgClassResourceMaximums, inferArchetypeTimedEffectActions } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);

test("timed archetype effects spend shared resources and preserve exact scaling", () => {
  const sorrow = inferArchetypeTimedEffectActions(archetype("bard-sorrowsoul"))[0].action;
  assert.equal(sorrow.resourceId, "bardicPerformance");
  assert.equal(sorrow.cost, 3);
  assert.deepEqual(sorrow.activeEffect.targets, ["fortitude", "reflex", "will"]);
  assert.equal(sorrow.activeEffect.defaultRounds, 1);

  const sohei = inferArchetypeTimedEffectActions(archetype("monk-sohei"))[0].action;
  assert.equal(sohei.resourceId, "kiPool");
  assert.deepEqual(sohei.activeEffect.targets, ["attackRolls", "damageRolls"]);
  assert.deepEqual(sohei.activeEffect.bonusByLevel, [
    { level: 4, bonus: 1 }, { level: 8, bonus: 2 }, { level: 12, bonus: 3 }, { level: 16, bonus: 4 }, { level: 20, bonus: 5 },
  ]);

  const sacredFist = inferArchetypeTimedEffectActions(archetype("warpriest-sacred-fist"))[0].action;
  assert.deepEqual(sacredFist.activeEffect.bonusByLevel, [
    { level: 7, bonus: 1 }, { level: 10, bonus: 2 }, { level: 13, bonus: 3 }, { level: 16, bonus: 4 }, { level: 19, bonus: 5 },
  ]);
  assert.equal(sacredFist.activeEffect.defaultRounds, 10);
});

test("timed effect inference rejects conditional and skill-choice approximations", () => {
  assert.deepEqual(inferArchetypeTimedEffectActions(archetype("magus-spell-dancer")), []);
  assert.deepEqual(inferArchetypeTimedEffectActions(archetype("magus-spire-defender")), []);
});

test("applied archetypes expose timed effects without duplicate generic actions", () => {
  const monk = data.classes.find((item) => item.id === "monk");
  const applied = applyArchetype(monk, archetype("monk-sohei"));
  assert.deepEqual(applied.features.find((feature) => feature.id === "monk-sohei-ki-weapon-su-4").resourceActions.map((action) => action.label), ["Activate Ki Weapon"]);
});

test("monk and Sacred Fist ki pools use bounded class-level formulas", () => {
  assert.deepEqual(apgClassResourceMaximums("monk", 3, { wisdom: 4 }), {});
  assert.deepEqual(apgClassResourceMaximums("monk", 4, { wisdom: 4 }), { kiPool: 6 });
  assert.deepEqual(apgClassResourceMaximums("monk", 20, { wisdom: 6 }), { kiPool: 16 });
  assert.equal(applyArchetypeResourceAdjustments(apgClassResourceMaximums("warpriest", 19, { wisdom: 4 }), [archetype("warpriest-sacred-fist")], 19, { wisdom: 4 }).kiPool, 12);
});

test("timed effect parser remains narrowly bounded across the catalogue", () => {
  const actions = archetypes.flatMap((item) => inferArchetypeTimedEffectActions(item));
  assert.equal(actions.length, 4);
  assert.equal(new Set(actions.map(({ action }) => action.id)).size, actions.length);
  for (const { action } of actions) {
    assert.ok(action.cost >= 1);
    assert.ok(action.activeEffect.fixedRounds);
    assert.ok(action.activeEffect.targets.length >= 1);
    assert.ok(action.activeEffect.defaultRounds >= 1);
  }
});
