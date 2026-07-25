import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { availableOptions, classProgression, spellcastingProgression } from "../packages/engine/src/index.js";
import bundle from "../generated/pf1e-data.mjs";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const ranger = await read("../packages/data/src/classes/ranger.json");
const enemies = await read("../packages/data/src/options/ranger-favored-enemies.json");
const terrains = await read("../packages/data/src/options/ranger-favored-terrains.json");

test("Ranger exposes its Core martial and skill chassis through level 20", () => {
  assert.equal(ranger.hitDie, 10);
  assert.equal(ranger.babProgression, "full");
  assert.deepEqual(ranger.saves, { fortitude: "good", reflex: "good", will: "poor" });
  assert.equal(ranger.skillRanksPerLevel, 6);
  assert.equal(classProgression(ranger, 1, { intelligenceScore: 10 }).baseAttackBonus, 1);
  assert.ok(classProgression(ranger, 20, { intelligenceScore: 10 }).features.some((feature) => feature.id === "ranger-master-hunter-20"));
});

test("Ranger prepared spellcasting unlocks levels 1 through 4", () => {
  assert.deepEqual(spellcastingProgression(ranger, 3, { abilityScore: 18 })?.slots, []);
  assert.deepEqual(spellcastingProgression(ranger, 4, { abilityScore: 18 })?.slots, [{ level: 1, base: 0, bonus: 1, count: 1 }]);
  assert.deepEqual(spellcastingProgression(ranger, 20, { abilityScore: 22 })?.slots.map((slot) => slot.level), [1, 2, 3, 4]);
});

test("Ranger gains five unique favored enemies and four unique terrains", () => {
  assert.deepEqual(ranger.features.filter((feature) => feature.progressionKey === "ranger-favored-enemy").map((feature) => feature.level), [1, 5, 10, 15, 20]);
  assert.deepEqual(ranger.features.filter((feature) => feature.progressionKey === "ranger-favored-terrain").map((feature) => feature.level), [3, 8, 13, 18]);
  assert.equal(enemies.options.length, 32);
  assert.equal(terrains.options.length, 11);
});

test("Ranger primary choices unlock at their Core levels", async () => {
  const styles = await read("../packages/data/src/options/ranger-combat-styles.json");
  const bonds = await read("../packages/data/src/options/ranger-hunters-bonds.json");
  assert.equal(availableOptions(styles, "ranger", 1).length, 0);
  assert.equal(availableOptions(styles, "ranger", 2).length, 2);
  assert.equal(availableOptions(bonds, "ranger", 3).length, 0);
  assert.equal(availableOptions(bonds, "ranger", 4).length, 2);
});

test("Ranger combat style feat slots filter by style and unlock tier", () => {
  const styleFeats = bundle.optionGroups.find((group) => group.id === "ranger-combat-style-feats");
  const archery = (level) => availableOptions(styleFeats, "ranger", level, [], { featureIds: ["ranger-combat-style-archery"] });
  const twoWeapon = (level) => availableOptions(styleFeats, "ranger", level, [], { featureIds: ["ranger-combat-style-two-weapon"] });
  assert.deepEqual([2, 6, 10].map((level) => archery(level).length), [4, 6, 8]);
  assert.deepEqual([2, 6, 10].map((level) => twoWeapon(level).length), [4, 6, 8]);
  assert.ok(archery(6).some((option) => option.id === "ranger-style-feat-manyshot"));
  assert.equal(archery(6).some((option) => option.id === "ranger-style-feat-pinpoint-targeting"), false);
  assert.ok(twoWeapon(10).some((option) => option.id === "ranger-style-feat-two-weapon-rend"));
});

test("Ranger earns five selectable combat style feat slots", () => {
  const slots = ranger.features.filter((feature) => feature.progressionKey === "ranger-combat-style-feat");
  assert.deepEqual(slots.map((feature) => feature.level), [2, 6, 10, 14, 18]);
  assert.ok(slots.every((feature) => feature.choiceRequired && feature.optionGroupId === "ranger-combat-style-feats"));
});
