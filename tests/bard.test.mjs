import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { availableOptions, classProgression } from "../packages/engine/src/index.js";
import { spontaneousSpellcastingProgression } from "../packages/engine/src/spontaneous-spellcasting.js";
import bundle from "../generated/pf1e-data.mjs";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const bard = await read("../packages/data/src/classes/bard.json");
const versatilePerformances = bundle.optionGroups.find((group) => group.id === "bard-versatile-performances");

test("Bard exposes its Core chassis through level 20", () => {
  assert.equal(bard.hitDie, 8);
  assert.equal(bard.babProgression, "three-quarters");
  assert.deepEqual(bard.saves, { fortitude: "poor", reflex: "good", will: "good" });
  assert.equal(bard.skillRanksPerLevel, 6);
  assert.equal(classProgression(bard, 1, { intelligenceScore: 10 }).baseAttackBonus, 0);
  assert.equal(classProgression(bard, 20, { intelligenceScore: 10 }).baseAttackBonus, 15);
  assert.ok(classProgression(bard, 20, { intelligenceScore: 10 }).features.some((feature) => feature.id === "bard-deadly-performance-20"));
});

test("Bard spontaneous casting reaches 6th-level spells", () => {
  const first = spontaneousSpellcastingProgression(bard, 1, { abilityScore: 16 });
  assert.deepEqual(first.slots, [{ level: 1, base: 1, bonus: 1, count: 2 }]);
  assert.deepEqual(first.known, [{ level: 0, count: 4 }, { level: 1, count: 2 }]);
  const twentieth = spontaneousSpellcastingProgression(bard, 20, { abilityScore: 22 });
  assert.deepEqual(twentieth.slots.map((slot) => slot.level), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(twentieth.known.map((entry) => entry.level), [0, 1, 2, 3, 4, 5, 6]);
});

test("Bard gains every Core performance at its milestone", () => {
  assert.deepEqual(
    bard.features.filter((feature) => feature.progressionKey === "bardic-performance-type").map((feature) => [feature.level, feature.name]),
    [
      [1, "Countersong"], [1, "Distraction"], [1, "Fascinate"], [6, "Suggestion"],
      [8, "Dirge of Doom"], [9, "Inspire Greatness"], [12, "Soothing Performance"],
      [14, "Frightening Tune"], [15, "Inspire Heroics"], [18, "Mass Suggestion"], [20, "Deadly Performance"]
    ]
  );
  assert.deepEqual(
    bard.features.filter((feature) => feature.progressionKey === "bard-inspire-courage").map((feature) => [feature.level, feature.scaling]),
    [[1, "+1"], [5, "+2"], [11, "+3"], [17, "+4"]]
  );
});

test("Bard earns five unique Versatile Performance choices", () => {
  const slots = bard.features.filter((feature) => feature.progressionKey === "bard-versatile-performance");
  assert.deepEqual(slots.map((feature) => feature.level), [2, 6, 10, 14, 18]);
  assert.ok(slots.every((feature) => feature.choiceRequired && feature.optionGroupId === "bard-versatile-performances"));
  assert.equal(availableOptions(versatilePerformances, "bard", 1).length, 0);
  assert.equal(availableOptions(versatilePerformances, "bard", 2).length, 9);
  assert.match(versatilePerformances.options.find((option) => option.id === "bard-versatile-performance-oratory").benefit, /Diplomacy and Sense Motive/);
});

test("Bard lore and generalist features improve at the Core levels", () => {
  assert.deepEqual(
    bard.features.filter((feature) => feature.progressionKey === "bard-lore-master").map((feature) => [feature.level, feature.uses]),
    [[5, "1 per day"], [11, "2 per day"], [17, "3 per day"]]
  );
  assert.deepEqual(
    bard.features.filter((feature) => feature.progressionKey === "bard-jack-of-all-trades").map((feature) => feature.level),
    [10, 16, 19]
  );
});
