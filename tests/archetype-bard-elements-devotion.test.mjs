import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { archetypeAutomationSummary } from "../packages/engine/src/index.js";

const ids = ["bard-shadow-puppeteer", "bard-watersinger", "bard-dragon-yapper", "bard-faith-singer", "bard-plant-speaker"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const feature = (id, pattern) => record(id).replacements.flatMap((replacement) => replacement.features).find((candidate) => pattern.test(candidate.name));

test("all five elemental and devotional Bards are fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Shadow Puppeteer exposes every legal summon tier and calculated disbelief DC", () => {
  const actions = feature("bard-shadow-puppeteer", /^Bardic Performance$/).resourceActions;
  const puppets = actions.find((action) => action.id === "shadow-puppeteer-shadow-puppets");
  assert.deepEqual(puppets.modes.map((mode) => [mode.minimumLevel, mode.maximumLevel]), [[1, 3], [4, 6], [7, 9], [10, 12], [13, 15], [16, 18], [19, 20]]);
  assert.deepEqual(puppets.savingThrow, { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" });
  assert.equal(actions.find((action) => action.id === "shadow-puppeteer-shadow-servant").spellLikeAbility.spellId, "unseen-servant");
});

test("Watersinger models capacity, iterative slams, random sickness, and reposition", () => {
  const actions = feature("bard-watersinger", /^Bardic Performance$/).resourceActions;
  const song = actions.find((action) => action.id === "watersinger-watersong");
  assert.deepEqual(song.modes.map((mode) => mode.minimumLevel), [1, 3, 5, 6, 9, 10, 12, 15, 18, 20]);
  const strike = actions.find((action) => action.id === "watersinger-waterstrike").combatRoll;
  assert.equal(strike.attack.kind, "melee");
  assert.equal(strike.attack.abilityModifier, "charisma");
  assert.deepEqual(strike.attackCountByLevel, [{ level: 3, count: 1 }, { level: 8, count: 2 }, { level: 15, count: 3 }]);
  assert.equal(strike.iterativeAttackPenalty, 5);
  assert.deepEqual(actions.find((action) => action.id === "watersinger-lifewater-sicken").activeEffect.durationDice, { count: 1, sides: 4 });
  assert.equal(actions.find((action) => action.id === "watersinger-lifewater-reposition").diceRoll.targetDcInputLabel, "Target CMD");
});

test("Dragon Yapper fixes Perform sing and tracks both performance effects", () => {
  const source = record("bard-dragon-yapper");
  const versatile = feature(source.id, /^Versatile Performance/);
  assert.deepEqual(versatile.optionChoiceIds, ["bard-versatile-performance-sing"]);
  const actions = feature(source.id, /^Bardic Performance$/).resourceActions;
  assert.deepEqual(actions[0].activeEffect.bonusByLevel, [{ level: 1, bonus: -1 }, { level: 5, bonus: -2 }, { level: 11, bonus: -3 }, { level: 17, bonus: -4 }]);
  assert.equal(actions[1].targetEffectRoll.successEffect.rounds, 999);
});

test("Faith Singer reuses the complete deity, alignment, domain, and spell catalogues", () => {
  const source = record("bard-faith-singer");
  const choices = source.replacements.flatMap((replacement) => replacement.features).filter((candidate) => candidate.choiceRequired);
  assert.deepEqual(choices.map((choice) => choice.level), [1, 1, 2, 2, 6, 10, 14, 18]);
  assert.deepEqual(choices.slice(0, 3).map((choice) => choice.optionGroupId), ["cleric-deities", "cleric-alignments", "cleric-domains"]);
  const sarenrae = data.optionGroups.find((group) => group.id === "cleric-deities").options.find((option) => option.name === "Sarenrae");
  assert.ok(sarenrae.domains.includes("domain-fire"));
  const fire = data.optionGroups.find((group) => group.id === "cleric-domains").options.find((option) => option.id === "domain-fire");
  assert.equal(fire.domainSpells[0].name, "burning hands");
});

test("Plant Speaker tracks every performance cost and always-on plant rule", () => {
  const source = record("bard-plant-speaker");
  assert.equal(feature(source.id, /^Bardic Performance$/).resourceActions[0].cost, 7);
  assert.equal(feature(source.id, /^Plant Speech$/).progressionProfiles[0].steps[0].values.communication, "Racial plantspeech communicates with all plants");
  const actions = feature(source.id, /^Mystical Allegory/).resourceActions;
  assert.deepEqual(actions.map((action) => [action.minimumLevel, action.cost, action.actionTypeByLevel[0].actionType]), [[5, 4, "1-minute"], [11, 7, "10-minute"], [17, 10, "1-hour"]]);
});
