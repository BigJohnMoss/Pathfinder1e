import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetypeResourceAdjustments,
  archetypeAutomationSummary,
  archetypeConditionalModifiers,
  archetypeSkillBonuses,
} from "../packages/engine/src/index.js";

const ids = ["bard-archaeologist", "bard-negotiator", "bard-daredevil"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const features = (id) => record(id).replacements.flatMap((replacement) => replacement.features ?? []);
const named = (id, pattern) => features(id).find((candidate) => pattern.test(candidate.name));

test("all three scholar-adventurer Bards are fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Archaeologist removes performance and automates luck, exploration, defenses, and talents", () => {
  const source = record("bard-archaeologist");
  assert.equal(source.removesBardicPerformance, true);
  assert.equal(named(source.id, /^Archaeologist’s Luck/).level, 1);
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [source], 1, { charisma: 3 }), { archaeologistsLuck: 7 });
  assert.equal(archetypeSkillBonuses([source], { bard: 10 }).skillBonuses.Perception, 5);
  assert.deepEqual(source.defenseAdjustments.map(({ kind, minimumLevel }) => [kind, minimumLevel]), [["uncannyDodge", 2], ["evasion", 6]]);
  assert.equal(archetypeConditionalModifiers([source], { bard: 18 })[0].bonus, 6);
  const choices = features(source.id).filter((candidate) => candidate.optionGroupId === "bard-rogue-talents");
  assert.deepEqual(choices.map((choice) => choice.level), [4, 8, 12, 16, 20]);
  assert.ok(choices[2].optionChoiceIds.length > choices[1].optionChoiceIds.length);
});

test("Negotiator automates performances, filtered talents, and rhetoric limits", () => {
  const source = record("bard-negotiator");
  assert.equal(archetypeSkillBonuses([source], { bard: 11 }).skillBonuses.Diplomacy, 5);
  const performance = named(source.id, /^Bardic Performance$/);
  assert.equal(performance.resourceActions.find((action) => action.id === "negotiator-binding-contract").maximumLevel, 17);
  assert.equal(performance.resourceActions.find((action) => action.id === "negotiator-binding-contract-greater").minimumLevel, 18);
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [source], 17), { masterOfRhetoricTake20: 3 });
  const choices = features(source.id).filter((candidate) => candidate.optionGroupId === "bard-rogue-talents");
  assert.deepEqual(choices.map((choice) => choice.level), [2, 6, 10, 14, 18]);
  const forbidden = new Set(data.optionGroups.find((group) => group.id === "bard-rogue-talents").options.filter((option) => /sneak attack/i.test(`${option.name} ${option.benefit}`)).map((option) => option.id));
  assert.equal(choices.every((choice) => choice.optionChoiceIds.every((id) => !forbidden.has(id))), true);
});

test("Daredevil automates scaling bonuses, unique maneuvers, and fortune rerolls", () => {
  const source = record("bard-daredevil");
  assert.equal(archetypeSkillBonuses([source], { bard: 9 }).skillBonuses.Acrobatics, 4);
  assert.equal(archetypeConditionalModifiers([source], { bard: 18 })[0].bonus, 5);
  assert.deepEqual(features(source.id).filter((candidate) => candidate.optionGroupId === "bard-canny-foe-maneuvers").map((choice) => choice.level), [2, 6, 10, 14, 18]);
  assert.equal(data.optionGroups.find((group) => group.id === "bard-canny-foe-maneuvers").uniqueAcrossSelections, true);
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 20).scoundrelsFortune, 6);
  assert.equal(named(source.id, /^Scoundrel’s Fortune/).resourceActions[0].rerollAction.kind, "higher-d20");
});
