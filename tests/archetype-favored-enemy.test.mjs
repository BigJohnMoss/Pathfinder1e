import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import feats from "../generated/pf1e-feats.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, inferArchetypeFavoredEnemyChoices } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const choices = (id) => inferArchetypeFavoredEnemyChoices(archetype(id));

test("favored-enemy archetypes expose exact selection schedules", () => {
  assert.deepEqual(choices("barbarian-hateful-rager").map(({ feature }) => feature.level), [2, 8, 14, 20]);
  assert.deepEqual(choices("inquisitor-royal-accuser").map(({ feature }) => feature.level), [3, 9, 15]);
  assert.deepEqual(choices("ranger-nirmathi-irregular").map(({ feature }) => feature.level), [1]);
});

test("fixed and restricted favored enemies filter every selector", () => {
  assert.deepEqual(choices("ranger-galvanic-saboteur")[0].feature.optionChoiceIds, ["ranger-enemy-construct"]);
  assert.deepEqual(choices("ranger-tanglebriar-demonslayer")[0].feature.optionChoiceIds, ["ranger-enemy-outsider-evil"]);
  assert.deepEqual(choices("inquisitor-royal-accuser")[0].feature.optionChoiceIds, [
    "ranger-enemy-aberration", "ranger-enemy-dragon", "ranger-enemy-humanoid-orc", "ranger-enemy-humanoid-other", "ranger-enemy-undead",
  ]);
});

test("applied non-ranger archetypes receive usable favored-enemy selectors", () => {
  const inquisitor = data.classes.find((item) => item.id === "inquisitor");
  const applied = applyArchetype(inquisitor, archetype("inquisitor-royal-accuser"));
  const selectors = applied.features.filter((feature) => feature.optionGroupId === "ranger-favored-enemies");
  assert.deepEqual(selectors.map((feature) => feature.level), [3, 9, 15]);
  assert.ok(selectors.every((feature) => feature.choiceRequired && feature.optionChoiceIds.length === 5));
});

test("pure favored-enemy rules leave the manual queue without hiding composite mechanics", () => {
  for (const id of ["inquisitor-royal-accuser", "ranger-galvanic-saboteur", "ranger-nirmathi-irregular"])
    assert.ok(!archetypeAutomationSummary(archetype(id), feats).manual.some((entry) => /Favored Enemy|Focused Enemy/.test(entry)), id);
  assert.ok(archetypeAutomationSummary(archetype("barbarian-hateful-rager"), feats).manual.includes("Favored Enemy (Ex) (level 2)"));
  assert.ok(archetypeAutomationSummary(archetype("ranger-tanglebriar-demonslayer"), feats).manual.includes("Favored Enemy (Ex) (level 1)"));
});

test("favored-enemy inference stays bounded and unique across the catalogue", () => {
  for (const item of archetypes) {
    const inferred = inferArchetypeFavoredEnemyChoices(item);
    assert.equal(new Set(inferred.map(({ feature }) => feature.id)).size, inferred.length, item.id);
    assert.ok(inferred.every(({ feature }) => feature.level >= 1 && feature.level <= 20 && feature.optionChoiceIds.length), item.id);
  }
});
