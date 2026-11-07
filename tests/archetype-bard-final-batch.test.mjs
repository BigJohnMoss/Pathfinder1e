import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  applyArchetypeResourceAdjustments,
  archetypeAutomationSummary,
  archetypeEligibilityIssues,
} from "../packages/engine/src/index.js";
import { spontaneousSpellcastingProgression } from "../packages/engine/src/spontaneous-spellcasting.js";

const ids = ["bard-arrowsong-minstrel", "bard-dragon-herald", "bard-duettist", "bard-fey-courtier", "bard-filidh"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const features = (id) => record(id).replacements.flatMap((replacement) => replacement.features ?? []);
const named = (id, pattern) => features(id).find((candidate) => pattern.test(candidate.name));
const group = (id) => data.optionGroups.find((candidate) => candidate.id === id);

test("the final five Bard archetypes are fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Arrowsong Minstrel exposes legal unique spell-list choices without granting spells known", () => {
  const source = record("bard-arrowsong-minstrel");
  const options = group("bard-arrowsong-spells").options;
  assert.ok(options.length > 100);
  assert.ok(options.every((option) => option.spellAccessOnly && option.spellLevel <= 6));
  assert.equal(options.find((option) => option.spellId === "acid-arrow").spellLevel, 2);
  assert.equal(options.some((option) => option.spellId === "cure-light-wounds"), false);
  assert.deepEqual(named(source.id, /^Arcane Archery$/).choiceCount, { base: 0, abilityModifier: "charisma", minimum: 1, maximum: 20 });
  assert.deepEqual(features(source.id).filter((feature) => feature.id.startsWith("bard-arrowsong-minstrel-arcane-archery-spell-")).map(({ level }) => level), [4, 8, 12, 16, 20]);
  assert.equal(source.featPrerequisiteBabUsesClassLevel, true);
  assert.equal(named(source.id, /^Precise Minstrel/).grantedFeatId, "precise-shot");
  const bard = data.classes.find((candidate) => candidate.id === "bard");
  const applied = applyArchetype(bard, source, data.classes, data.spells);
  assert.deepEqual(applied.spellcasting.spellLevelUnlocks, [1, 4, 7, 10, 13, 16]);
  assert.equal(spontaneousSpellcastingProgression(applied, 4, { abilityScore: 18 }).maximumSpellLevel, 2);
});

test("Dragon Herald and Fey Courtier enforce their now-supported ancestries", () => {
  const dragon = record("bard-dragon-herald");
  const fey = record("bard-fey-courtier");
  assert.deepEqual(archetypeEligibilityIssues(dragon, { ancestryId: "kobold" }), []);
  assert.match(archetypeEligibilityIssues(dragon, { ancestryId: "human" })[0], /kobold/i);
  assert.deepEqual(archetypeEligibilityIssues(fey, { ancestryId: "gathlain" }), []);
  assert.match(archetypeEligibilityIssues(fey, { ancestryId: "human" })[0], /gathlain/i);
  assert.ok(data.races.some((race) => race.id === "kobold"));
  assert.ok(data.races.some((race) => race.id === "gathlain"));
  assert.equal(group("bard-dragon-herald-patrons").options.length, 10);
  assert.equal(applyArchetypeResourceAdjustments({}, [dragon], 17).masterOfPersuasion, 3);
  assert.equal(named(fey.id, /^Summon Fey Allies/).grantedFeatId, "augment-summoning");
});

test("Duettist and Filidh expose every active performance tier and capped resources", () => {
  assert.deepEqual(features("bard-duettist").flatMap((feature) => feature.resourceActions ?? []).map(({ id }) => id), [
    "duettist-versatile-familiar",
    "duettist-performing-familiar",
    "duettist-harmonizing-familiar",
    "duettist-symphonic-familiar",
  ]);
  const filidh = record("bard-filidh");
  assert.equal(applyArchetypeResourceAdjustments({}, [filidh], 1).natureSongConversions, 1);
  assert.equal(applyArchetypeResourceAdjustments({}, [filidh], 20).natureSongConversions, 20);
  assert.deepEqual(named(filidh.id, /^Nature’s Song$/).performanceRules.map(({ minimumLevel }) => minimumLevel), [1, 6, 8, 15, 20]);
  assert.equal(filidh.arcaneSpellFailure.applies, false);
});
