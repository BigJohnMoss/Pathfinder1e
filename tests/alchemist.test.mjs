import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import spells from "../generated/pf1e-spells.mjs";
import { apgClassResourceMaximums, classProgression, spellcastingProgression, spellsAvailableToClass } from "../packages/engine/src/index.js";

const alchemist = JSON.parse(await readFile(new URL("../packages/data/src/classes/alchemist.json", import.meta.url), "utf8"));
const discoveries = JSON.parse(await readFile(new URL("../packages/data/src/options/alchemist-discoveries.json", import.meta.url), "utf8"));

test("Alchemist exposes its complete level-20 chassis and ten discovery choices", () => {
  const progression = classProgression(alchemist, 20);
  assert.equal(progression.baseAttackBonus, 15);
  assert.equal(progression.saves.fortitude, 12);
  assert.equal(progression.saves.reflex, 12);
  assert.equal(progression.saves.will, 6);
  assert.equal(progression.features.filter((feature) => feature.progressionKey === "alchemist-discoveries").length, 9);
  assert.ok(progression.features.some((feature) => feature.id === "alchemist-grand-discovery-20"));
});

test("Alchemist prepares six levels of extracts from the imported formula catalogue", () => {
  const casting = spellcastingProgression(alchemist, 20, { abilityScore: 20 });
  assert.equal(casting.maximumSpellLevel, 6);
  assert.deepEqual(casting.slots.map(({ level, base }) => [level, base]), [[1,5],[2,5],[3,5],[4,5],[5,5],[6,5]]);
  assert.ok(spellsAvailableToClass(spells, "alchemist", 6).length >= 300);
});

test("Alchemist discoveries include prerequisites and daily bomb limits", () => {
  assert.ok(discoveries.options.length >= 25);
  assert.deepEqual(discoveries.options.find((option) => option.id === "poison-bomb").prerequisites, [{ type: "feature", id: "smoke-bomb" }]);
  assert.deepEqual(apgClassResourceMaximums("alchemist", 20, { intelligence: 5 }), { bombs: 25 });
});
