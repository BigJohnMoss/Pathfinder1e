import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetypeResourceAdjustments, archetypeAutomationSummary } from "../packages/engine/src/index.js";

const ids = ["bard-animal-speaker", "bard-first-world-minstrel", "bard-voice-of-the-wild", "bard-cultivator", "bard-stonesinger"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const features = (id) => record(id).replacements.flatMap((replacement) => replacement.features ?? []);
const named = (id, pattern) => features(id).find((candidate) => pattern.test(candidate.name));

test("all five nature-themed Bards are fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Animal Speaker configures four unique kinds and both performance paths", () => {
  const source = record("bard-animal-speaker");
  const choices = features(source.id).filter((candidate) => candidate.optionGroupId === "bard-animal-friend-kinds");
  assert.deepEqual(choices.map((choice) => choice.level), [1, 5, 11, 17]);
  const option = data.optionGroups.find((group) => group.id === "bard-animal-friend-kinds").options[0];
  assert.equal(option.choice.allowCustom, true);
  assert.equal(option.choice.uniqueAcrossSelections, true);
  const actions = named(source.id, /^Bardic Performance$/).resourceActions;
  assert.deepEqual(actions.find((action) => action.id === "animal-speaker-attract-rats").diceRoll.diceCountByLevel, [{ level: 6, count: 1 }, { level: 11, count: 2 }, { level: 17, count: 3 }]);
  assert.equal(actions.find((action) => action.id === "animal-speaker-soothing-performance").diceRoll.modifierInputLabel, "Perform modifier + other Wild Empathy class levels");
});

test("First World Minstrel substitutes every Bard summon tier and exposes every legal fey ability", () => {
  const source = record("bard-first-world-minstrel");
  assert.deepEqual(source.spellListExclusions, ["summon-monster-1", "summon-monster-2", "summon-monster-3", "summon-monster-4", "summon-monster-5", "summon-monster-6"]);
  assert.deepEqual(Object.values(source.spellListAdditions), [1, 2, 3, 4, 5, 6]);
  const actions = named(source.id, /^Bardic Performance$/).resourceActions;
  const echoes = actions.find((action) => action.id === "first-world-echoes");
  assert.equal(echoes.modes.some((mode) => mode.id === "change-shape"), false);
  for (const id of ["camouflage", "resist-fire", "evasion", "long-step", "spell-resistance", "trackless-step", "vanish", "woodland-stride"]) assert.ok(echoes.modes.some((mode) => mode.id === id), id);
  assert.deepEqual(echoes.targetCountByLevel.map((step) => step.count), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(actions.find((action) => action.id === "first-world-gremlins-luck").targetEffectRoll.successEffect.rounds, 999);
});

test("Voice of the Wild offers exact spell tiers and level-aware animal focuses", () => {
  const choices = features("bard-voice-of-the-wild").filter((candidate) => candidate.choiceRequired);
  assert.deepEqual(choices.map((choice) => [choice.level, choice.optionGroupId]), [[1, "bard-voice-nature-magic-first"], [4, "bard-voice-nature-magic"], [7, "bard-voice-nature-magic"], [10, "bard-voice-nature-magic"], [13, "bard-voice-nature-magic"], [16, "bard-voice-nature-magic"]]);
  const firstOptions = data.optionGroups.find((group) => group.id === "bard-voice-nature-magic-first").options;
  assert.ok(firstOptions.length > 0);
  assert.ok(firstOptions.every((option) => option.spellLevel === 1));
  const song = named("bard-voice-of-the-wild", /^Bardic Performance$/).resourceActions[0];
  assert.equal(song.modes.length, 12);
  assert.deepEqual(song.modes.find((mode) => mode.id === "stag").activeEffects[0].bonusByLevel.map((step) => step.bonus), [5, 10, 20]);
  assert.deepEqual(song.targetCountByLevel, [{ level: 3, count: 1 }, { level: 10, count: 2 }, { level: 17, count: 3 }]);
});

test("Cultivator enforces barrier and Nature Lore limits", () => {
  const source = record("bard-cultivator");
  const barrier = named(source.id, /^Song of Growth/).resourceActions[0];
  assert.deepEqual(barrier.maximumActiveEffects, { name: "Song of Growth Barrier", levelDivisor: 2, abilityModifier: "charisma", minimum: 0 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [source], 5, { charisma: 4 }), { natureLoreTake20: 1 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [source], 11, { charisma: 4 }), { natureLoreTake20: 2 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [source], 17, { charisma: 4 }), { natureLoreTake20: 3 });
  assert.equal(source.skillCheckRules.length, 2);
});

test("Stonesinger corrects Tremor to level 1 and tracks every performance rule", () => {
  const tremor = named("bard-stonesinger", /^Tremor/);
  assert.equal(tremor.level, 1);
  assert.deepEqual(tremor.resourceActions[0].activeEffect.bonusByLevel, [{ level: 1, bonus: -1 }, { level: 5, bonus: -2 }, { level: 11, bonus: -3 }, { level: 17, bonus: -4 }]);
  assert.equal(tremor.resourceActions[0].cost, 0);
  const quake = named("bard-stonesinger", /^Quake/).resourceActions[0];
  assert.deepEqual(quake.savingThrow, { label: "Reflex", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" });
  assert.equal(named("bard-stonesinger", /^Stone Song/).resourceActions[0].modes.filter((mode) => mode.id.startsWith("tremorsense-")).length, 20);
});
