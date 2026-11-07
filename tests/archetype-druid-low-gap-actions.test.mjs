import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetypeResourceAdjustments, archetypeAutomationSummary } from "../packages/engine/src/index.js";

const record = (id) => archetypes.find((item) => item.id === id);
const features = (id) => record(id).replacements.flatMap((replacement) => replacement.features ?? []);

test("three low-gap Druid archetypes now have complete action automation", () => {
  for (const id of ["druid-feral-shifter", "druid-season-sage", "druid-urushiol"]) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Feral Shifter tracks the exact daily duration and every animal aspect", () => {
  const feral = record("druid-feral-shifter");
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [feral], 1), { animalFocus: 1 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [feral], 20), { animalFocus: 20 });
  const primary = features(feral.id).find((feature) => /^Animal Focus/.test(feature.name)).resourceActions[0];
  const secondary = features(feral.id).find((feature) => /^Second Animal Focus/.test(feature.name)).resourceActions[0];
  assert.equal(primary.modes.length, 12);
  assert.equal(primary.actionTypeByLevel[0].actionType, "swift");
  assert.equal(secondary.minimumLevel, 9);
  assert.equal(secondary.cost, 0);
  assert.ok(secondary.confirmations.some((item) => item.requiredForActivation));
});

test("Season Sage pools and damage dice follow their published progressions", () => {
  const sage = record("druid-season-sage");
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [sage], 4, { wisdom: 3 }), { seasonsTouch: 4 });
  const level20 = applyArchetypeResourceAdjustments({}, [sage], 20, { wisdom: 5 });
  assert.deepEqual({ seasonsTouch: level20.seasonsTouch, seasonsVeil: level20.seasonsVeil }, { seasonsTouch: 6, seasonsVeil: 8 });
  assert.equal(level20["archetype-druid-season-sage-season-mastery-sp-12-spell-like-control-weather"], 1);
  const touch = features(sage.id).find((feature) => /^Season.s Touch/.test(feature.name));
  const rot = touch.resourceActions.find((action) => action.id === "season-sage-autumn-rot");
  assert.deepEqual(rot.combatRoll.damage.diceCountByLevel.at(-1), { level: 20, count: 10 });
  const veil = features(sage.id).find((feature) => /^Season.s Veil/.test(feature.name));
  assert.deepEqual(veil.resourceActions[0].modes.map((mode) => mode.id), ["spring", "summer", "autumn", "winter"]);
});

test("Urushiol exposes bounded doses, exact costs, save scaling, and poison immunity", () => {
  const poisoner = record("druid-urushiol");
  assert.deepEqual([1, 3, 19, 20].map((level) => applyArchetypeResourceAdjustments({}, [poisoner], level).urushiolVenom), [1, 2, 10, 10]);
  const actions = features(poisoner.id).find((feature) => /^Toxic Secretions/.test(feature.name)).resourceActions;
  assert.deepEqual(actions.slice(0, 4).map(({ minimumLevel, cost }) => [minimumLevel, cost]), [[1, 1], [4, 1], [7, 2], [11, 3]]);
  assert.ok(actions.every((action) => action.savingThrow.base === 10 && action.savingThrow.levelDivisor === 2 && action.savingThrow.ability === "wisdom"));
  assert.deepEqual(poisoner.defenseAdjustments.map(({ minimumLevel, qualifier }) => [minimumLevel, qualifier]), [[1, "his own poison"], [4, "poison"]]);
});
