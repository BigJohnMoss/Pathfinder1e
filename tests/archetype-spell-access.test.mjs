import assert from "node:assert/strict";
import test from "node:test";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, inferArchetypeSpellAccess, spellsAvailableToClass } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const characterClass = (id) => data.classes.find((item) => item.id === id);

test("whole-school spell expansions are materialized from the spell catalogue", () => {
  const access = inferArchetypeSpellAccess(archetype("alchemist-ectoplasm-master"), data.spells);
  assert.equal(access.spellListAdditions["animate-dead"], 4);
  assert.equal(access.spellListAdditions.fireball, undefined);
  assert.equal(Object.keys(access.spellListAdditions).length, 173);
});

test("descriptor expansions and prohibitions combine in the applied spell list", () => {
  const applied = applyArchetype(characterClass("inquisitor"), archetype("inquisitor-ravener-hunter"), data.classes, data.spells);
  assert.equal(applied.spellListAdditions["celestial-healing"], 1);
  assert.ok(applied.spellListExclusions.includes("interrogation"));
  const available = spellsAvailableToClass(data.spells, "inquisitor", 6, applied.spellListAdditions, applied.spellListExclusions);
  assert.ok(available.some((spell) => spell.id === "celestial-healing"));
  assert.ok(!available.some((spell) => spell.id === "interrogation"));
  assert.ok(available.some((spell) => spell.id === "detect-magic"));
});

test("school and descriptor prohibitions remove only spells on the affected class list", () => {
  const deepMarshal = inferArchetypeSpellAccess(archetype("magus-deep-marshal"), data.spells);
  assert.ok(Object.keys(deepMarshal.spellListAdditions).length > 0);
  assert.ok(deepMarshal.spellListExclusions.includes("daze"));
  assert.ok(!deepMarshal.spellListExclusions.includes("interrogation"));

  const winterWitch = applyArchetype(characterClass("witch"), archetype("witch-winter-witch"), data.classes, data.spells);
  const available = spellsAvailableToClass(data.spells, "witch", 9, winterWitch.spellListAdditions, winterWitch.spellListExclusions);
  assert.ok(!available.some((spell) => spell.id === "spark"));
  assert.ok(available.some((spell) => spell.id === "bestow-curse"));
});

test("a restriction-only feature no longer reports a duplicate manual effect", () => {
  const summary = archetypeAutomationSummary(archetype("inquisitor-exarch"), data.feats, data.spells);
  assert.ok(summary.automated.some((entry) => /prohibited spells? removed/.test(entry)));
  assert.ok(!summary.manual.includes("Spells (level 1)"));
});
