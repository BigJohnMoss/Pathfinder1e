import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetypeResourceAdjustments,
  archetypeAutomationSummary,
  archetypeConditionalModifiers,
  archetypeSkillBonuses,
  inferArchetypeFeatChoices,
} from "../packages/engine/src/index.js";

const ids = ["bard-fortune-teller", "bard-hoaxer", "bard-dirge-bard", "bard-luring-piper", "bard-mute-musician"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const features = (id) => record(id).replacements.flatMap((replacement) => replacement.features ?? []);
const named = (id, pattern) => features(id).find((candidate) => pattern.test(candidate.name));
const group = (id) => data.optionGroups.find((candidate) => candidate.id === id);

test("all five occult-performer Bards are fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Fortune-Teller automates the exact hourly table and both later features", () => {
  const source = record("bard-fortune-teller");
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [source], 1), { oracularReading: 1 });
  const action = named(source.id, /^Oracular Performance$/).resourceActions[0];
  assert.deepEqual(action.diceRoll.outcomesByTotal.map(({ minimumTotal, maximumTotal }) => [minimumTotal, maximumTotal]), [[1, 35], [36, 65], [66, undefined]]);
  assert.equal(action.diceRoll.flatModifierByLevel.at(-1).modifier, 20);
  assert.deepEqual(action.diceRoll.outcomesByTotal.at(-1).effectsByMode.map(({ modeId, bonus }) => [modeId, bonus]), [["ally", 0], ["enemy", 2]]);
  assert.equal(named(source.id, /Acumen/).numericCalculations[0].baseByLevel.at(-1).value, 2000);
  assert.deepEqual(named(source.id, /^Bardic Performance$/).resourceActions[0].targetEffectRoll.effectsByLevel[0].activeEffects.map(({ bonus }) => bonus), [2, 2]);
});

test("Hoaxer automates skill bonuses, hexes, performances, misery, and crafting feats", () => {
  const source = record("bard-hoaxer");
  assert.equal(archetypeSkillBonuses([source], { bard: 11 }).skillBonuses.Bluff, 5);
  assert.equal(group("bard-hoaxer-hexes").options.length, 15);
  assert.equal(group("bard-hoaxer-hexes").uniqueAcrossSelections, true);
  const hexChoices = features(source.id).filter((candidate) => candidate.optionGroupId === "bard-hoaxer-hexes");
  assert.deepEqual(hexChoices.map(({ level }) => level), [1, 3, 6, 9, 12, 15, 18]);
  assert.equal(hexChoices[3].optionChoiceIds.length, 8);
  assert.equal(hexChoices[4].optionChoiceIds.length, 15);
  assert.deepEqual(hexChoices[0].resourceActions.map(({ id }) => id), ["hoaxer-bad-deal", "hoaxer-buyer-beware", "hoaxer-personal-guarantee", "hoaxer-curse-breaker"]);
  assert.equal(archetypeConditionalModifiers([source], { bard: 17 }).find(({ label }) => label === "Misery — attacks").bonus, 4);
  assert.deepEqual(inferArchetypeFeatChoices(source, data.feats).filter((choice) => choice.sourceFeatureId === "bard-hoaxer-curse-crafter-ex-5").map(({ level }) => level), [5, 11, 17]);
});

test("Dirge Bard automates undead, necromancy, defense, and fear rules", () => {
  const source = record("bard-dirge-bard");
  assert.equal(group("bard-dirge-necromancy-spells").options.length, 211);
  assert.deepEqual(features(source.id).filter((candidate) => candidate.optionGroupId === "bard-dirge-necromancy-spells").map(({ level }) => level), [2, 6, 10, 14, 18]);
  assert.equal(archetypeSkillBonuses([source], { bard: 12 }).conditionalModifiers.find(({ label }) => label === "Knowledge (religion) checks").bonus, 6);
  assert.equal(archetypeConditionalModifiers([source], { bard: 2 }).filter(({ label }) => label.startsWith("Haunted Eyes")).length, 4);
  assert.equal(named(source.id, /^Bardic Performance$/).progressionProfiles[0].steps.at(-1).values.benefit, "80 HD controlled (animate dead limit)");
  assert.equal(named(source.id, /^Haunting Refrain/).resourceActions[1].activeEffect.bonusByLevel.at(-1).bonus, -5);
});

test("Luring Piper automates creature targeting, performances, and attention", () => {
  const source = record("bard-luring-piper");
  assert.equal(named(source.id, /^Luring Presentation/).resourceActions[0].modes[0].activeEffects[0].bonus, 2);
  const actions = named(source.id, /^Bardic Performance$/).resourceActions;
  assert.deepEqual(actions.map(({ id, cost }) => [id, cost]), [["piper-deadly-lure", 1], ["piper-fey-wounding-song", 3]]);
  assert.equal(actions[1].diceRoll.flatModifierByLevel.at(-1).modifier, 15);
  assert.equal(named(source.id, /^Piper’s Attention/).resourceActions[1].rerollAction.kind, "higher-d20");
});

test("Mute Musician automates state, spells, performances, saves, and transmission", () => {
  const source = record("bard-mute-musician");
  assert.equal(named(source.id, /^Eschew Materials/).grantedFeatId, "eschew-materials");
  assert.equal(group("bard-mute-insight-spells").options.length, 229);
  assert.equal(group("bard-mute-insight-spells").uniqueAcrossSelections, true);
  assert.deepEqual(features(source.id).filter((candidate) => candidate.optionGroupId === "bard-mute-insight-spells").map(({ level }) => level), [2, 2, 6, 6, 10, 10, 14, 14, 18, 18]);
  assert.deepEqual(named(source.id, /^Bardic Performance$/).resourceActions.map(({ id }) => id), ["mute-symphony-silence", "mute-maddening-harmonics", "mute-song-conjunction"]);
  assert.equal(archetypeConditionalModifiers([source], { bard: 2 }).filter(({ label }) => label.startsWith("Dulled Horror")).length, 4);
  assert.equal(named(source.id, /^Eldritch Caesura/).resourceActions[0].cost, 1);
  assert.ok(named(source.id, /^Ex-Mute Musicians/).resourceActions[0].activeEffect);
});
