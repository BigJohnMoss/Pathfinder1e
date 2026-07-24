import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classProgression, spellcastingProgression } from "../packages/engine/src/index.js";

const cleric = JSON.parse(await readFile(new URL("../packages/data/src/classes/cleric.json", import.meta.url), "utf8"));

test("Cleric records its Core chassis and divine feature identifiers", () => {
  assert.equal(cleric.hitDie, 8);
  assert.equal(cleric.babProgression, "three-quarters");
  assert.deepEqual(cleric.saves, { fortitude: "good", reflex: "poor", will: "good" });
  assert.equal(cleric.spellcasting.ability, "wisdom");
  assert.ok(cleric.features.some(feature => feature.id === "channel-energy-1"));
  assert.ok(cleric.features.some(feature => feature.id === "cleric-domains-1"));
});

test("Cleric progression reaches ninth-level divine spells", () => {
  const first = spellcastingProgression(cleric, 1, { abilityScore: 18 });
  assert.equal(first.maximumSpellLevel, 1);
  assert.deepEqual(first.slots.filter(slot => slot.base > 0).map(slot => [slot.level, slot.base]), [[1, 1]]);
  assert.deepEqual(first.prepared, [{ level: 0, count: 3 }, { level: 1, count: 1 }]);

  const twentieth = spellcastingProgression(cleric, 20, { abilityScore: 28 });
  assert.equal(twentieth.maximumSpellLevel, 9);
  assert.equal(twentieth.slots.find(slot => slot.level === 9).base, 4);
  assert.equal(twentieth.prepared.find(entry => entry.level === 0).count, 6);
});

test("Cleric class progression exposes channel energy from level one", () => {
  const progression = classProgression(cleric, 1, { intelligenceScore: 10 });
  assert.equal(progression.baseAttackBonus, 0);
  assert.equal(progression.saves.fortitude, 2);
  assert.equal(progression.saves.will, 2);
  assert.ok(progression.features.some(feature => feature.id === "channel-energy-1"));
});
