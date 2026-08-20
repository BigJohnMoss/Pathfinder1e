import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import feats from "../generated/pf1e-feats.mjs";
import spells from "../generated/pf1e-spells.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  archetypeAutomationSummary,
  inferArchetypeRemovesSpellcasting,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const paladin = data.classes.find((item) => item.id === "paladin");

test("published Paladin spellcasting removals disable the complete spellbook", () => {
  for (const id of ["paladin-divine-guardian", "paladin-temple-champion"]) {
    const source = archetype(id);
    assert.equal(inferArchetypeRemovesSpellcasting(source), true, id);
    const applied = applyArchetype(paladin, source, data.classes, spells);
    assert.equal(applied.spellcasting, undefined, id);
    assert.equal(applied.features.some((feature) => feature.type === "spellcasting"), false, id);
  }
});

test("complete removal text leaves the manual queue while extra item restrictions remain visible", () => {
  assert.equal(archetypeAutomationSummary(archetype("paladin-temple-champion"), feats, spells).manual.includes("Spells (level 1)"), false);
  assert.equal(archetypeAutomationSummary(archetype("paladin-divine-guardian"), feats, spells).manual.includes("Martial Focus (level 1)"), true);
});

test("limited and conditional casting restrictions do not remove a class spellbook", () => {
  for (const id of ["cleric-appeaser", "spiritualist-exciter", "spiritualist-quintessentialist"])
    assert.equal(inferArchetypeRemovesSpellcasting(archetype(id)), false, id);
});
