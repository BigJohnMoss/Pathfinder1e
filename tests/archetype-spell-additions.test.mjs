import assert from "node:assert/strict";
import test from "node:test";
import data from "../generated/pf1e-data.mjs";
import archetypes from "../generated/pf1e-archetypes.mjs";
import { applyArchetype, inferArchetypeSpellAdditions } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const characterClass = (id) => data.classes.find((item) => item.id === id);

test("fixed level tables become spell-list additions", () => {
  const inferred = inferArchetypeSpellAdditions(archetype("bard-watersinger"), data.spells);
  assert.deepEqual(inferred.spellListAdditions, {
    "create-water": 0,
    "hydraulic-push": 1,
    slipstream: 1,
    "aqueous-orb": 2,
    "hydraulic-torrent": 2,
    "water-walk": 2,
    "fluid-form": 3,
    "ride-the-waves": 3,
    "control-water": 4,
    "later-spell-water-walk-communal": 4,
    vortex: 5,
    seamantle: 6,
  });
  const applied = applyArchetype(characterClass("bard"), archetype("bard-watersinger"), data.classes, data.spells);
  assert.equal(applied.spellListAdditions["aqueous-orb"], 2);
  assert.equal(applied.spellListAdditions.seamantle, 6);
});

test("source suffixes and reversed greater spell names are recognized", () => {
  const inferred = inferArchetypeSpellAdditions(archetype("mesmerist-vox"), data.spells);
  assert.equal(inferred.spellListAdditions["ear-piercing-scream"], 1);
  assert.equal(inferred.spellListAdditions["later-spell-cacophonous-call"], 2);
  assert.equal(inferred.spellListAdditions["later-spell-cacophonous-call-mass"], 5);
  assert.equal(inferred.spellListAdditions["shout-greater"], 6);
  assert.equal(inferred.spellListAdditions["break-enchantment"], undefined);
});

test("bonus spells known retain their class-level unlocks", () => {
  const inferred = inferArchetypeSpellAdditions(archetype("sorcerer-razmiran-priest"), data.spells);
  const grants = new Map(inferred.spellGrants.map((grant) => [grant.spellId, grant]));
  assert.deepEqual(grants.get("later-spell-aid"), {
    spellId: "later-spell-aid",
    spellLevel: 2,
    minimumClassLevel: 3,
    mode: "known",
    sourceFeatureId: "sorcerer-razmiran-priest-lay-healer-su-3",
  });
  assert.equal(grants.get("remove-disease").spellLevel, 3);
  assert.equal(grants.get("remove-disease").minimumClassLevel, 5);
  const applied = applyArchetype(characterClass("sorcerer"), archetype("sorcerer-razmiran-priest"), data.classes, data.spells);
  assert.deepEqual(applied.spellGrants, inferred.spellGrants);
  assert.deepEqual(inferArchetypeSpellAdditions(archetype("psychic-formless-adept"), data.spells).spellGrants, [], "conditional spells known remain manual");
});

test("choice lists and creature lists are not mistaken for spell grants", () => {
  assert.deepEqual(inferArchetypeSpellAdditions(archetype("mesmerist-dreamstalker"), data.spells).spellGrants, []);
  assert.deepEqual(inferArchetypeSpellAdditions(archetype("bard-fey-courtier"), data.spells).spellListAdditions, {});
});
