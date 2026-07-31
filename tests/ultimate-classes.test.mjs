import test from "node:test";
import assert from "node:assert/strict";
import data from "../generated/pf1e-data.mjs";
import { apgClassResourceMaximums, classProgression, spellcastingProgression, spellsAvailableToClass } from "../packages/engine/src/index.js";

const byId = id => data.classes.find(characterClass => characterClass.id === id);

test("Magus has its complete level-20 spell-combat chassis", () => {
  const magus = byId("magus");
  const progression = classProgression(magus, 20, { intelligenceScore: 18 });
  assert.equal(progression.baseAttackBonus, 15);
  assert.ok(progression.features.some(feature => feature.id === "magus-true-magus-20"));
  assert.equal(spellcastingProgression(magus, 20, { abilityScore: 18 }).maximumSpellLevel, 6);
  assert.ok(spellsAvailableToClass(data.spells, "magus", 6).length >= 60);
  assert.deepEqual(apgClassResourceMaximums("magus", 10, { intelligence: 4 }), { arcanePool: 9 });
});

test("Gunslinger reaches true grit with full BAB and tracked grit", () => {
  const gunslinger = byId("gunslinger");
  const progression = classProgression(gunslinger, 20, { intelligenceScore: 10 });
  assert.equal(progression.baseAttackBonus, 20);
  assert.ok(progression.features.some(feature => feature.id === "gunslinger-true-grit-20"));
  assert.deepEqual(apgClassResourceMaximums("gunslinger", 20, { wisdom: 5 }), { grit: 5 });
});

test("Samurai reaches last stand with challenge and resolve resources", () => {
  const samurai = byId("samurai");
  const progression = classProgression(samurai, 20, { intelligenceScore: 10 });
  assert.equal(progression.baseAttackBonus, 20);
  assert.ok(progression.features.some(feature => feature.id === "samurai-last-stand-20"));
  assert.deepEqual(apgClassResourceMaximums("samurai", 20), { challenges: 7, resolve: 10 });
});
