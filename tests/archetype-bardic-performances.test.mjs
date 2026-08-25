import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  archetypeAutomationSummary,
  archetypeLandSpeedAdjustments,
  archetypePerformanceRules,
  archetypeSkillBonuses,
  namedPerformances,
} from "../packages/engine/src/index.js";

const ids = ["bard-averaka-arbiter", "bard-flame-dancer", "bard-impervious-messenger", "bard-thundercaller"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const performanceFeature = (id) => record(id).replacements.flatMap((replacement) => replacement.features).find((feature) => /^Bardic Performance(?:\s*\([^)]+\))?$/i.test(feature.name));

test("the Bardic Performance batch models every published performance and closes four archetypes", () => {
  for (const id of ids) {
    const feature = performanceFeature(id);
    assert.deepEqual(
      feature.performanceRules.map((rule) => rule.name),
      namedPerformances(feature),
      `${id} published headings`,
    );
    const actionIds = new Set(feature.resourceActions.map((action) => action.id));
    assert.ok(feature.performanceRules.every((rule) => rule.kind !== "active" || rule.actionIds?.every((actionId) => actionIds.has(actionId))), `${id} linked actions`);
    assert.equal(archetypeAutomationSummary(record(id), data.feats, data.spells).manual.length, 0, id);
  }
});

test("performance rules unlock at their exact bard levels", () => {
  const sources = ids.map(record);
  assert.deepEqual(archetypePerformanceRules(sources, { bard: 1 }).map((rule) => rule.name), ["Fire Dance", "Chant of Perfect Recall"]);
  const levelEight = archetypePerformanceRules(sources, { bard: 8 }).map((rule) => rule.name);
  for (const name of ["Ritual of Reconciliation", "Fire Break", "Unbroken Stride", "Call Lightning"]) assert.ok(levelEight.includes(name), name);
  assert.equal(levelEight.includes("Call Lightning Storm"), false);
});

test("Thundercaller exposes scaled combat, save, and spell-equivalent actions", () => {
  const actions = performanceFeature("bard-thundercaller").resourceActions;
  const thunder = actions.find((action) => action.id === "thundercaller-thunder-call");
  assert.deepEqual(thunder.combatRoll.damage.diceCountByLevel.map(({ level, count }) => [level, count]), [[3, 1], [7, 3], [11, 5], [15, 7], [19, 9]]);
  assert.equal(thunder.combatRoll.targetSave.outcome, "negates-riders");
  assert.equal(actions.find((action) => action.id === "thundercaller-incite-rage").targetEffectRoll.successEffect.rounds, 999);
  assert.deepEqual(actions.filter((action) => action.spellLikeAbility).map((action) => action.spellLikeAbility.spellId), ["call-lightning", "call-lightning-storm"]);
});

test("Impervious Messenger calculates its maintained skill and speed progression", () => {
  const source = record("bard-impervious-messenger");
  const skillModifiers = archetypeSkillBonuses([source], { bard: 8 }).conditionalModifiers;
  assert.equal(skillModifiers.filter((modifier) => modifier.bonus === 4 && /Unbroken Stride/.test(modifier.condition)).length, 4);
  const speed = archetypeLandSpeedAdjustments(source).find((adjustment) => adjustment.label === "Unbroken Stride");
  assert.deepEqual(speed.bonusByLevel, [{ level: 8, bonus: 10 }, { level: 12, bonus: 30 }]);
  const recall = performanceFeature("bard-impervious-messenger").resourceActions.find((action) => action.id === "impervious-chant-perfect-recall");
  assert.equal(recall.variableCost.maximumLevelDivisor, 2);
});
