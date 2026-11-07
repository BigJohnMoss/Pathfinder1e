import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { archetypeAutomationSummary } from "../packages/engine/src/index.js";

const ids = ["bard-disciple-of-the-forked-tongue", "bard-geisha", "bard-juggler", "bard-phrenologist", "bard-prankster"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const feature = (id, pattern) => record(id).replacements.flatMap((replacement) => replacement.features).find((candidate) => pattern.test(candidate.name));

test("all five trickster Bards are fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Disciple exposes all five Serpent choices and only level-legal curse spells", () => {
  const source = record("bard-disciple-of-the-forked-tongue");
  const choices = source.replacements.flatMap((replacement) => replacement.features).filter((candidate) => candidate.progressionKey === "bard-serpent-mind");
  assert.deepEqual(choices.map((choice) => choice.level), [2, 6, 10, 14, 18]);
  assert.ok(choices.every((choice) => choice.optionGroupId === "bard-serpent-mind-curse-spells"));
  const group = data.optionGroups.find((candidate) => candidate.id === "bard-serpent-mind-curse-spells");
  assert.equal(group.options.length, 70);
  assert.ok(group.options.every((option) => option.spellLevel <= 6 && option.classIds.includes("bard")));
  assert.ok(group.options.every((option) => data.spells.find((spell) => spell.id === option.spellId)?.descriptors?.includes("curse")));
});

test("Geisha uses four performance rounds per ally and records all required choices", () => {
  const source = record("bard-geisha");
  const tea = feature(source.id, /^Tea Ceremony/).resourceActions[0];
  assert.equal(tea.variableCost.multiplier, 4);
  assert.deepEqual(tea.modes.map((mode) => mode.minimumLevel ?? 1), [1, 3, 9, 15]);
  assert.equal(feature(source.id, /^Geisha Knowledge$/).optionGroupId, "bard-geisha-performance-categories");
  assert.equal(source.proficiencyChoices[0].choiceKey, "weapon");
  assert.match(feature(source.id, /^Scribe Scroll$/).summary, /gains Scribe Scroll/i);
});

test("Juggler automates capacity, reaction penalties, and both evasion tiers", () => {
  const source = record("bard-juggler");
  const capacity = feature(source.id, /^Combat Juggling/).resourceActions[0].variableCost.maximumByLevel;
  assert.deepEqual(capacity, [{ level: 2, maximum: 3 }, { level: 6, maximum: 4 }, { level: 10, maximum: 5 }, { level: 14, maximum: 6 }, { level: 18, maximum: 7 }]);
  assert.deepEqual(feature(source.id, /^Fast Reactions/).resourceActions.map((action) => action.diceRoll.flatModifierByLevel[0].modifier), [-5, -10]);
  assert.deepEqual(source.defenseAdjustments.map((adjustment) => adjustment.kind), ["evasion", "improvedEvasion"]);
});

test("Phrenologist and Prankster expose exact save and numeric effect models", () => {
  const phrenologist = feature("bard-phrenologist", /^Bardic Performance$/).resourceActions;
  assert.deepEqual(phrenologist.find((action) => action.id === "phrenologist-in-your-head").targetEffectRoll.effectsByLevel.map((step) => step.duration.kind), ["level-minutes", "level-minutes", "level-hours"]);
  const mock = feature("bard-prankster", /^Bardic Performance$/).resourceActions.find((action) => action.id === "prankster-resolve-mock");
  assert.deepEqual(mock.targetCountByLevel.map((step) => step.count), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(mock.targetEffectRoll.effectsByLevel[0].activeEffects.map((effect) => [effect.target, effect.bonus]), [["attackRolls", -2], ["skillChecks", -2]]);
  const swap = feature("bard-prankster", /^Swap/).resourceActions[0].diceRoll;
  assert.deepEqual(swap.outcomesByMargin.map((outcome) => outcome.minimumMargin), [10, 0]);
});
