import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import feats from "../generated/pf1e-feats.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, inferArchetypeFavoredTerrainChoices } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const levels = (id) => inferArchetypeFavoredTerrainChoices(archetype(id)).map(({ feature }) => feature.level);
const options = (id) => inferArchetypeFavoredTerrainChoices(archetype(id))[0]?.feature.optionChoiceIds ?? [];

test("favored-terrain archetypes expose their exact selection schedules", () => {
  assert.deepEqual(levels("bard-wasteland-chronicler"), [3, 8, 13, 18]);
  assert.deepEqual(levels("gunslinger-commando"), [2, 6, 10, 14, 18]);
  assert.deepEqual(levels("hunter-forester"), [5, 9, 13, 17]);
  assert.deepEqual(levels("paladin-holy-guide"), [3, 6, 9, 12, 15, 18]);
  assert.deepEqual(levels("paladin-wilderness-warden"), [3, 9, 15]);
  assert.deepEqual(levels("rogue-chameleon"), [3, 6, 9, 12, 15, 18]);
  assert.deepEqual(levels("ranger-dusk-stalker"), [3, 8, 13, 18]);
  assert.deepEqual(levels("barbarian-true-primitive"), [1]);
});

test("favored-terrain restrictions are applied to every generated selector", () => {
  assert.deepEqual(options("ranger-wave-warden"), ["ranger-terrain-water"]);
  assert.deepEqual(options("ranger-dandy"), ["ranger-terrain-urban"]);
  assert.deepEqual(options("ranger-planar-scout"), ["ranger-terrain-planes"]);
  assert.deepEqual(options("paladin-forest-preserver"), ["ranger-terrain-forest", "ranger-terrain-jungle"]);
  assert.deepEqual(options("ranger-jungle-lord"), ["ranger-terrain-jungle"]);
  assert.ok(!options("druid-feral-child").includes("ranger-terrain-urban"));
  assert.ok(!options("ranger-wild-shadow").includes("ranger-terrain-urban"));
  assert.deepEqual(options("bard-wasteland-chronicler"), [
    "ranger-terrain-cold",
    "ranger-terrain-desert",
    "ranger-terrain-mountain",
    "ranger-terrain-swamp",
  ]);
  assert.deepEqual(options("slayer-bloody-jake"), [
    "ranger-terrain-cold", "ranger-terrain-desert", "ranger-terrain-forest", "ranger-terrain-jungle",
    "ranger-terrain-mountain", "ranger-terrain-plains", "ranger-terrain-swamp",
  ]);
});

test("applied archetypes include stable selectable terrain features", () => {
  const gunslinger = data.classes.find((item) => item.id === "gunslinger");
  const applied = applyArchetype(gunslinger, archetype("gunslinger-commando"));
  const choices = applied.features.filter((feature) => feature.optionGroupId === "ranger-favored-terrains");
  assert.deepEqual(choices.map((feature) => feature.level), [2, 6, 10, 14, 18]);
  assert.ok(choices.every((feature) => feature.choiceRequired && feature.optionChoiceIds.length === 11));
  assert.equal(new Set(choices.map((feature) => feature.id)).size, choices.length);
});

test("complete favored-terrain choice rules leave the manual queue", () => {
  for (const id of ["druid-feral-child", "gunslinger-commando", "paladin-forest-preserver", "ranger-wave-warden", "ranger-wild-shadow"])
    assert.ok(!archetypeAutomationSummary(archetype(id), feats).manual.some((entry) => /^Favored Terrain/.test(entry)), id);
  assert.ok(archetypeAutomationSummary(archetype("hunter-forester"), feats).manual.includes("Favored Terrain (Ex) (level 5)"), "its extra damage rule remains visible");
});

test("all inferred terrain choices use bounded, unique levels and known option ids", () => {
  const known = new Set([
    "ranger-terrain-cold", "ranger-terrain-desert", "ranger-terrain-forest", "ranger-terrain-jungle",
    "ranger-terrain-mountain", "ranger-terrain-plains", "ranger-terrain-planes", "ranger-terrain-swamp",
    "ranger-terrain-underground", "ranger-terrain-urban", "ranger-terrain-water",
  ]);
  for (const item of archetypes) {
    const choices = inferArchetypeFavoredTerrainChoices(item);
    assert.equal(new Set(choices.map(({ feature }) => feature.id)).size, choices.length, item.id);
    assert.ok(choices.every(({ feature }) => feature.level >= 1 && feature.level <= 20), item.id);
    assert.ok(choices.every(({ feature }) => feature.optionChoiceIds.length && feature.optionChoiceIds.every((id) => known.has(id))), item.id);
  }
});
