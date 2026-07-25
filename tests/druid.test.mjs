import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { classProgression, druidWildShapeUses, spellcastingProgression } from "../packages/engine/src/index.js";
import bundle from "../generated/pf1e-data.mjs";

const druid = JSON.parse(await readFile(new URL("../packages/data/src/classes/druid.json", import.meta.url), "utf8"));
const natureBonds = bundle.optionGroups.find((group) => group.id === "druid-nature-bonds");

test("Druid exposes its Core chassis through level 20", () => {
  assert.equal(druid.hitDie, 8);
  assert.equal(druid.babProgression, "three-quarters");
  assert.deepEqual(druid.saves, { fortitude: "good", reflex: "poor", will: "good" });
  assert.equal(druid.skillRanksPerLevel, 4);
  assert.equal(classProgression(druid, 20, { intelligenceScore: 10 }).baseAttackBonus, 15);
  assert.ok(classProgression(druid, 20, { intelligenceScore: 10 }).features.some((feature) => feature.id === "druid-wild-shape-20"));
});

test("Druid prepared casting reaches ninth-level spells", () => {
  const first = spellcastingProgression(druid, 1, { abilityScore: 16 });
  assert.deepEqual(first.slots, [{ level: 1, base: 1, bonus: 1, count: 2 }]);
  assert.deepEqual(first.prepared, [{ level: 0, count: 3 }, { level: 1, count: 1 }]);
  const twentieth = spellcastingProgression(druid, 20, { abilityScore: 28 });
  assert.deepEqual(twentieth.slots.map((slot) => slot.level), [1,2,3,4,5,6,7,8,9]);
  assert.deepEqual(twentieth.prepared.map((entry) => entry.level), [0,1,2,3,4,5,6,7,8,9]);
});

test("Druid Nature Bond exposes animal and domain paths", () => {
  assert.deepEqual(natureBonds.options.map((option) => option.id), ["druid-nature-bond-animal", "druid-nature-bond-domain"]);
});

test("Wild Shape follows its Core use and form milestones", () => {
  const wildShape = druid.features.filter((feature) => feature.progressionKey === "druid-wild-shape");
  assert.deepEqual(wildShape.map((feature) => feature.level), [4,6,8,10,12,14,16,18,20]);
  assert.equal(wildShape.at(-1).uses, "at will");
  assert.equal(druidWildShapeUses(3), 0);
  assert.equal(druidWildShapeUses(4), 1);
  assert.equal(druidWildShapeUses(18), 8);
  assert.equal(druidWildShapeUses(20), null);
  assert.throws(() => druidWildShapeUses(21), RangeError);
});
