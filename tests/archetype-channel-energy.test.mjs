import assert from "node:assert/strict";
import test from "node:test";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  archetypeAutomationSummary,
  inferArchetypeChannelEnergyActions,
  resolvedArchetypeResourceAdjustments,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const characterClass = (id) => data.classes.find((item) => item.id === id);

test("channel-energy inference calculates effective-class-level dice", () => {
  const actions = inferArchetypeChannelEnergyActions(archetype("shaman-witch-doctor"));
  assert.equal(actions.length, 1);
  assert.deepEqual(actions[0].action.diceRoll.diceCountByLevel.slice(0, 4), [
    { level: 4, count: 1 },
    { level: 6, count: 2 },
    { level: 8, count: 3 },
    { level: 10, count: 4 },
  ]);
  assert.equal(actions[0].action.savingThrow.levelAdjustment, -3);
  assert.equal(actions[0].action.resourceId, "archetype-shaman-witch-doctor-channel-energy-su-4");
  assert.ok(!archetypeAutomationSummary(archetype("shaman-witch-doctor"), data.feats, data.spells).manual.includes("Channel Energy (Su) (level 4)"));
});

test("published nonstandard channel dice and modes remain intact", () => {
  const fiendish = inferArchetypeChannelEnergyActions(archetype("cleric-fiendish-vessel"))[0].action;
  assert.equal(fiendish.diceRoll.dieSidesByLevel[0].sides, 4);
  assert.deepEqual(fiendish.diceRoll.diceCountByLevel.slice(0, 3), [
    { level: 1, count: 1 },
    { level: 3, count: 2 },
    { level: 5, count: 3 },
  ]);
  assert.deepEqual(fiendish.modes.map(({ id }) => id), ["heal-evil", "harm-good"]);

  const fallen = inferArchetypeChannelEnergyActions(archetype("spiritualist-priest-of-the-fallen"))[0].action;
  assert.deepEqual(fallen.diceRoll.diceCountByLevel.slice(0, 3), [
    { level: 3, count: 1 },
    { level: 5, count: 2 },
    { level: 7, count: 3 },
  ]);
  assert.equal(fallen.modes.length, 4);
});

test("curated uses metadata supplies the Hospitaler's independent pool", () => {
  const hospitaler = archetype("paladin-hospitaler");
  const resource = resolvedArchetypeResourceAdjustments(hospitaler).find(({ resourceId }) => resourceId === "archetype-hospitaler-channel-positive-energy-4");
  assert.equal(resource.base, 3);
  assert.equal(resource.abilityModifier, "charisma");
  const action = inferArchetypeChannelEnergyActions(hospitaler)[0].action;
  assert.equal(action.diceRoll.diceCountByLevel[0].count, 1);
  assert.equal(action.savingThrow.levelAdjustment, -3);
});

test("applied archetypes expose calculated channel actions instead of generic buttons", () => {
  const applied = applyArchetype(characterClass("shaman"), archetype("shaman-witch-doctor"), data.classes, data.spells);
  const feature = applied.features.find((entry) => entry.id === "shaman-witch-doctor-channel-energy-su-4");
  assert.deepEqual(feature.resourceActions.map(({ label }) => label), ["Use Channel Energy"]);
  assert.ok(feature.resourceActions[0].diceRoll);
});

test("catalogue channel inference remains exact and excludes incidental channel references", () => {
  const actions = archetypes.flatMap((entry) => inferArchetypeChannelEnergyActions(entry));
  assert.equal(actions.length, 9);
  assert.ok(actions.every(({ action }) => action.resourceId && action.diceRoll && action.modes.length >= 2));
  assert.equal(actions.some(({ sourceFeatureId }) => /(?:cleansing-flames|maddening-gaze|luck-hexes)/i.test(sourceFeatureId)), false);
});
