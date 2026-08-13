import test from "node:test";
import assert from "node:assert/strict";
import generatedData from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary } from "../packages/engine/src/index.js";

const record = (id) => generatedData.archetypes.find((archetype) => archetype.id === id);
const characterClass = (id) => generatedData.classes.find((candidate) => candidate.id === id);

test("arcane armor archetypes replace class casting permissions at their exact levels", () => {
  const duelist = applyArchetype(characterClass("bard"), record("bard-arcane-duelist"));
  assert.deepEqual(duelist.arcaneSpellFailure.ignoredArmorCategories, [
    { category: "light", minimumLevel: 1 },
    { category: "medium", minimumLevel: 10 },
    { category: "heavy", minimumLevel: 16 },
  ]);
  assert.deepEqual(duelist.spellcasting.arcaneSpellFailure, duelist.arcaneSpellFailure);

  const geisha = applyArchetype(characterClass("bard"), record("bard-geisha"));
  assert.deepEqual(geisha.arcaneSpellFailure.ignoredArmorCategories, []);
  assert.ok(!archetypeAutomationSummary(record("bard-geisha")).manual.includes("Weapon and Armor Proficiency (level 1)"));

  const steelblood = applyArchetype(characterClass("bloodrager"), record("bloodrager-steelblood"));
  assert.ok(steelblood.arcaneSpellFailure.ignoredArmorCategories.some(({ category, minimumLevel }) => category === "heavy" && minimumLevel === 1));

  const skirnir = applyArchetype(characterClass("magus"), record("magus-skirnir"));
  assert.equal(skirnir.arcaneSpellFailure.ignoreShieldsAtLevel, 1);
});
