import assert from "node:assert/strict";
import test from "node:test";
import data from "../generated/pf1e-data.mjs";
import archetypes from "../generated/pf1e-archetypes.mjs";
import { applyArchetype, archetypeAutomationSummary, inferArchetypeSpellAdditions } from "../packages/engine/src/index.js";

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

test("fixed formula-book additions become level-gated known extracts", () => {
  const cloneMaster = inferArchetypeSpellAdditions(archetype("alchemist-clone-master"), data.spells);
  assert.deepEqual(cloneMaster.spellGrants.map(({ spellId, spellLevel, minimumClassLevel }) => [spellId, spellLevel, minimumClassLevel]), [
    ["clone", 6, 16],
    ["simulacrum-lesser", 3, 7],
    ["simulacrum", 5, 13],
  ]);

  const preservationist = inferArchetypeSpellAdditions(archetype("alchemist-preservationist"), data.spells);
  assert.ok(preservationist.spellGrants.some((grant) => grant.spellId === "summon-natures-ally-9" && grant.spellLevel === 6 && grant.minimumClassLevel === 18));
});

test("complete fixed spell-list and spells-known additions leave the manual queue", () => {
  const cases = [
    ["cleric-forgemaster", "Steel Spells"],
    ["ranger-tanglebriar-demonslayer", "Expanded Spell List"],
    ["spiritualist-necrologist", "Spells"],
    ["warpriest-forgepriest", "Smith’s Spells"],
    ["bard-cultivator", "Plant Magic"],
    ["ranger-summit-sentinel", "Spells"],
    ["bard-flame-dancer", "Fan the Flames"],
    ["sorcerer-razmiran-priest", "Lay Healer"],
    ["bard-animal-speaker", "Summon Nature’s Ally"],
    ["bard-watersinger", "Watersinger Spells"],
    ["warpriest-proselytizer", "Emotional Appeal"],
  ];
  for (const [id, featureName] of cases) {
    const source = archetype(id);
    assert.equal(archetypeAutomationSummary(source, [], data.spells).manual.some((entry) => entry.startsWith(featureName)), false, id);
  }
  const flameDancer = inferArchetypeSpellAdditions(archetype("bard-flame-dancer"), data.spells);
  assert.deepEqual(flameDancer.spellGrants.map(({ spellId, spellLevel, minimumClassLevel }) => [spellId, spellLevel, minimumClassLevel]), [
    ["burning-hands", 1, 8],
    ["flaming-sphere", 2, 8],
    ["fireball", 3, 8],
  ]);
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
