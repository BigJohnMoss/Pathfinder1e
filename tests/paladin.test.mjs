import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classProgression, spellcastingProgression } from "../packages/engine/src/index.js";
import { paladinCasterLevel, paladinDivineBondUses, paladinLayOnHands, paladinMercyCount, paladinSmiteUses } from "../packages/engine/src/paladin.js";

const paladin = JSON.parse(await readFile(new URL("../packages/data/src/classes/paladin.json", import.meta.url), "utf8"));

test("Paladin records its Core chassis and milestone features", () => {
  assert.equal(paladin.hitDie, 10);
  assert.equal(paladin.babProgression, "full");
  assert.deepEqual(paladin.saves, { fortitude: "good", reflex: "poor", will: "good" });
  assert.equal(paladin.skillRanksPerLevel, 2);
  assert.equal(paladin.spellcasting.ability, "charisma");
  for (const id of ["paladin-aura-of-good-1", "paladin-smite-evil-1", "paladin-lay-on-hands-2", "paladin-spellcasting-4", "paladin-divine-bond-5", "paladin-holy-champion-20"]) {
    assert.ok(paladin.features.some((feature) => feature.id === id), id);
  }
});

test("Paladin progression exposes its full martial chassis", () => {
  const first = classProgression(paladin, 1, { intelligenceScore: 10 });
  assert.equal(first.baseAttackBonus, 1);
  assert.deepEqual(first.saves, { fortitude: 2, reflex: 0, will: 2 });
  assert.deepEqual(first.features.map((feature) => feature.id), ["paladin-aura-of-good-1", "paladin-detect-evil-1", "paladin-smite-evil-1"]);

  const twentieth = classProgression(paladin, 20, { intelligenceScore: 10 });
  assert.equal(twentieth.baseAttackBonus, 20);
  assert.ok(twentieth.features.some((feature) => feature.id === "paladin-holy-champion-20"));
});

test("Paladin spellcasting begins at level 4 and stops at 4th-level spells", () => {
  assert.deepEqual(spellcastingProgression(paladin, 3, { abilityScore: 18 })?.slots, []);
  const fourth = spellcastingProgression(paladin, 4, { abilityScore: 18 });
  assert.equal(fourth.maximumSpellLevel, 1);
  assert.deepEqual(fourth.slots, [{ level: 1, base: 0, bonus: 1, count: 1 }]);
  assert.deepEqual(fourth.prepared, [{ level: 1, count: 1 }]);

  const twentieth = spellcastingProgression(paladin, 20, { abilityScore: 26 });
  assert.equal(twentieth.maximumSpellLevel, 4);
  assert.equal(Math.max(...twentieth.slots.map((slot) => slot.level)), 4);
  assert.equal(Math.max(...twentieth.prepared.map((slot) => slot.level)), 4);
});

test("Paladin resources scale at their Core milestones", () => {
  assert.deepEqual([1, 4, 7, 10, 13, 16, 19].map(paladinSmiteUses), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(paladinLayOnHands(1, 3), { dice: 0, usesPerDay: 0 });
  assert.deepEqual(paladinLayOnHands(2, 3), { dice: 1, usesPerDay: 4 });
  assert.deepEqual(paladinLayOnHands(20, -12), { dice: 10, usesPerDay: 0 });
  assert.deepEqual([2, 3, 6, 20].map(paladinMercyCount), [0, 1, 2, 6]);
  assert.deepEqual([4, 5, 9, 13, 17].map(paladinDivineBondUses), [0, 1, 2, 3, 4]);
  assert.deepEqual([1, 3, 4, 20].map(paladinCasterLevel), [0, 0, 1, 17]);
});
