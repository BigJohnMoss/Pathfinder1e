import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetypeResourceAdjustments, archetypeAutomationSummary } from "../packages/engine/src/index.js";

const ids = ["bard-flamesinger", "bard-songhealer", "bard-sound-striker", "bard-voice-of-brigh", "bard-silver-balladeer"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const feature = (id, pattern) => record(id).replacements.flatMap((replacement) => replacement.features).find((candidate) => pattern.test(candidate.name));

test("all five sound, healing, and faith-themed Bards are fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Flamesinger grants Fire Music and models the official Blazing Blades progression", () => {
  assert.equal(feature("bard-flamesinger", /^Fire Music$/).grantedFeatId, "fire-music");
  const blazing = feature("bard-flamesinger", /^Bardic Performance$/);
  assert.equal(blazing.level, 1);
  assert.deepEqual(blazing.resourceActions[0].diceRoll.diceCountByLevel, [
    { level: 1, count: 1 }, { level: 5, count: 2 }, { level: 11, count: 3 }, { level: 17, count: 4 },
  ]);
});

test("Songhealer limits Enhance Healing by Charisma and charges exact performance rounds", () => {
  const source = record("bard-songhealer");
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 14, { charisma: 4 }).songhealerEnhanceHealing, 4);
  const actions = feature("bard-songhealer", /^Bardic Performance$/).resourceActions;
  assert.deepEqual(actions.map((action) => [action.minimumLevel, action.cost]), [[14, 5], [14, 5], [20, 20]]);
  assert.ok(actions.every((action) => action.confirmations[0].requiredForActivation));
});

test("Sound Striker rolls every purchased Weird Word as a separate ranged touch attack", () => {
  const actions = feature("bard-sound-striker", /^Bardic Performance$/).resourceActions;
  const weird = actions.find((action) => action.id === "sound-striker-weird-words");
  assert.deepEqual(weird.variableCost, { label: "Words", minimum: 1, maximumLevelDivisor: 4 });
  assert.equal(weird.combatRoll.attackCountFromVariableCost, true);
  assert.deepEqual(weird.combatRoll.abilityModifierOnceModeIds, ["same-target"]);
  assert.equal(weird.combatRoll.damage.abilityModifier, "charisma");
});

test("Voice of Brigh applies all knowledge bonuses and per-construct Spark cost", () => {
  const source = record("bard-voice-of-brigh");
  assert.equal(source.skillBonusAdjustments.length, 4);
  assert.ok(source.skillBonusAdjustments.every((adjustment) => adjustment.levelDivisor === 2 && adjustment.minimum === 1));
  const spark = feature("bard-voice-of-brigh", /^Bardic Performance$/).resourceActions.find((action) => action.id === "brigh-spark");
  assert.equal(spark.variableCost.label, "Constructs maintained");
  assert.match(spark.activeEffect.description, /Bard level/);
});

test("Silver Balladeer exposes every performance and all Silver Mastery rules", () => {
  const actions = feature("bard-silver-balladeer", /^Bardic Performance$/).resourceActions;
  assert.deepEqual(actions.map((action) => action.id), ["silver-balladeer-break-curse", "silver-balladeer-holy-vibration", "silver-balladeer-mass-break-curse"]);
  assert.equal(actions[1].activeEffect.defaultRoundsByLevel.at(-1).rounds, 200);
  assert.match(feature("bard-silver-balladeer", /^Silver Mastery/).resourceActions[0].activeEffect.description, /cold iron.*damage penalty.*mithral/is);
});
