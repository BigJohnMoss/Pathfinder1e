import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetypeResourceAdjustments,
  archetypeAutomationSummary,
  archetypeConditionalModifiers,
} from "../packages/engine/src/index.js";

const ids = ["bard-chronicler-of-worlds", "bard-dwarven-scholar", "bard-speaker-of-the-palatine-eye", "bard-studious-librarian"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const features = (id) => record(id).replacements.flatMap((replacement) => replacement.features ?? []);
const named = (id, pattern) => features(id).find((candidate) => pattern.test(candidate.name));
const group = (id) => data.optionGroups.find((candidate) => candidate.id === id);

test("all four scholarly Bards are fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Chronicler uses Intelligence and automates Planar Lore and five unique substitutions", () => {
  const source = record("bard-chronicler-of-worlds");
  assert.equal(source.spellcastingAbility, "intelligence");
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 5, { intelligence: 4 }).planarLoreTake20, 4);
  assert.deepEqual(named(source.id, /^Bardic Performance$/).resourceActions.map(({ id }) => id), ["chronicler-quintessence-infusion", "chronicler-mantra-of-tabris"]);
  assert.equal(group("bard-chronicler-scrivener-skills").options.length, 8);
  assert.equal(features(source.id).filter(({ optionGroupId }) => optionGroupId === "bard-chronicler-scrivener-skills").length, 5);
  assert.equal(archetypeConditionalModifiers([source], { bard: 2 })[0].bonus, 4);
});

test("Dwarven Scholar exposes custom proficiency, five combat feats, and two-feat War Chant", () => {
  const source = record("bard-dwarven-scholar");
  assert.equal(source.spellcastingAbility, "wisdom");
  assert.equal(group("bard-dwarven-scholar-weapons").options[0].choice.allowCustom, true);
  const training = features(source.id).filter(({ id }) => id.startsWith("bard-dwarven-scholar-training-"));
  assert.deepEqual(training.map(({ level }) => level), [2, 6, 10, 14, 18]);
  assert.ok(training.every(({ featChoiceBabUsesClassLevel }) => featChoiceBabUsesClassLevel));
  assert.deepEqual(named(source.id, /^Bardic Performance$/).resourceActions[0].featSelection.countByLevel, [{ level: 1, count: 1 }, { level: 6, count: 2 }]);
});

test("Speaker automates skill removal, corpse save, and ritual milestones", () => {
  const source = record("bard-speaker-of-the-palatine-eye");
  assert.deepEqual(source.classSkillRemovals, ["Acrobatics", "Escape Artist"]);
  assert.equal(named(source.id, /^Corpse Speaker/).resourceActions[0].savingThrow.ability, "charisma");
  assert.deepEqual(named(source.id, /^Keen Ritualist/).numericCalculations[0].baseByLevel, [{ level: 10, value: -2 }, { level: 19, value: 0 }]);
  assert.equal(archetypeConditionalModifiers([source], { bard: 19 })[0].bonus, 4);
});

test("Studious Librarian tracks all borrowed-casting and library uses", () => {
  const source = record("bard-studious-librarian");
  assert.equal(named(source.id, /^Scribe Scroll$/).grantedFeatId, "scribe-scroll");
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 6).comparativeArcaneStudies, 1);
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 18).comparativeArcaneStudies, 4);
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 20).oneWithLibrary, 1);
  assert.equal(named(source.id, /^Perfect Recollection/).resourceActions[0].fixedD20Result.result, 20);
});
