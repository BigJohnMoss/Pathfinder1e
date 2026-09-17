import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetypeResourceAdjustments,
  archetypeAutomationSummary,
  archetypeConditionalModifiers,
  archetypeLandSpeedAdjustments,
  archetypeSkillBonuses,
} from "../packages/engine/src/index.js";

const ids = ["bard-dawnflower-dervish", "bard-dervish-dancer", "bard-masked-performer", "bard-busker"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const features = (id) => record(id).replacements.flatMap((replacement) => replacement.features ?? []);
const named = (id, pattern) => features(id).find((candidate) => pattern.test(candidate.name));
const group = (id) => data.optionGroups.find((candidate) => candidate.id === id);

test("all four dance and stage Bards are fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Dawnflower Dervish enforces faith and automates doubled dances and Whirl", () => {
  const source = record("bard-dawnflower-dervish");
  assert.deepEqual(named(source.id, /^Deity$/).optionChoiceIds, ["bard-dawnflower-deity-sarenrae"]);
  assert.equal(named(source.id, /^Dervish Dance/).grantedFeatId, "dervish-dance");
  assert.equal(archetypeConditionalModifiers([source], { bard: 5 })[0].bonus, 4);
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [source], 20), { meditativeWhirl: 7 });
  const courage = named(source.id, /^Battle Dance$/).resourceActions[0];
  assert.deepEqual(courage.activeEffect.bonusByLevel.map(({ bonus }) => bonus), [2, 4, 6, 8]);
  assert.equal(courage.actionTypeByLevel.at(-1).actionType, "swift");
});

test("Dervish Dancer automates all dances, movement, and skill substitution", () => {
  const source = record("bard-dervish-dancer");
  assert.equal(named(source.id, /^Battle Dance$/).level, 1);
  assert.deepEqual(named(source.id, /^Battle Dance$/).resourceActions.map(({ id }) => id), ["dancer-rain-of-blows", "dancer-razors-kiss", "dancer-leaf-on-wind"]);
  assert.equal(archetypeLandSpeedAdjustments(source).at(-1).bonusByLevel.at(-1).bonus, 30);
  assert.equal(archetypeSkillBonuses([source], { bard: 10 }).skillBonuses["Perform (dance)"], 5);
  assert.ok(named(source.id, /^Dance of Fury/).resourceActions[0]);
  assert.equal(named(source.id, /^Battle Fury/).resourceActions[0].variableCost.maximum, 20);
});

test("Masked Performer supplies exact Social Grace and talent selections", () => {
  const source = record("bard-masked-performer");
  assert.equal(group("bard-masked-social-grace").options.length, 24);
  assert.equal(group("bard-masked-social-grace").uniqueAcrossSelections, true);
  assert.deepEqual(features(source.id).filter((candidate) => candidate.optionGroupId === "bard-masked-social-grace").map(({ level }) => level), [2, 6, 10, 14, 18]);
  assert.equal(group("bard-masked-talents").options.length, 11);
  const talentChoices = features(source.id).filter((candidate) => candidate.optionGroupId === "bard-masked-talents");
  assert.deepEqual(talentChoices.map(({ level }) => level), [5, 17]);
  assert.equal(talentChoices[0].optionChoiceIds.length, 7);
  assert.equal(talentChoices[1].optionChoiceIds.length, 11);
  assert.equal(named(source.id, /^Bardic Performance$/).resourceActions.find(({ id }) => id === "masked-stage-combat").featSelection.source, "catalogue");
});

test("Busker replaces Bardic Performance with complete stunt automation", () => {
  const source = record("bard-busker");
  assert.equal(source.removesBardicPerformance, true);
  assert.deepEqual(applyArchetypeResourceAdjustments({ bardicPerformance: 30 }, [source], 10, { charisma: 4 }), { bardicPerformance: 30, buskerStunts: 8 });
  assert.equal(named(source.id, /^Busker Stunts/).performanceRules.length, 7);
  assert.deepEqual(named(source.id, /^Busker Stunts/).resourceActions.filter(({ resourceId }) => resourceId === "buskerStunts").map(({ id }) => id), ["busker-quick-hands", "busker-patter", "busker-living-statue", "busker-fascinate", "busker-suggestion", "busker-inventive-juggler", "busker-impossible-sleight"]);
  assert.equal(named(source.id, /^Busker Stunts/).resourceActions.find(({ id }) => id === "busker-impossible-sleight").variableCost.maximum, 9);
  assert.deepEqual(named(source.id, /^Flexible Performer/).resourceActions.map(({ id }) => id), ["busker-earn-money", "busker-bluff-diplomacy"]);
});
