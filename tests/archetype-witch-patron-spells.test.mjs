import assert from "node:assert/strict";
import test from "node:test";

import data from "../generated/pf1e-data.mjs";
import archetypes from "../generated/pf1e-archetypes.mjs";
import {
  applyArchetype,
  archetypeAutomationSummary,
  inferArchetypeSpellAdditions,
  witchPatronSpells,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((entry) => entry.id === id);
const characterClass = (id) => data.classes.find((entry) => entry.id === id);

const cases = new Map([
  ["witch-flood-walker", [4, 10, 16, 18]],
  ["witch-gravewalker", [4, 6, 12, 14, 16]],
  ["witch-mountain-witch", [2, 4, 6, 8, 10, 12, 14, 16, 18]],
]);

test("complete Witch patron-spell tables replace the exact patron milestones", () => {
  const patron = data.optionGroups.find((group) => group.id === "witch-patrons").options[0];
  for (const [id, expectedClassLevels] of cases) {
    const selected = archetype(id);
    const inferred = inferArchetypeSpellAdditions(selected, data.spells);
    assert.deepEqual(inferred.bonusSpellReplacementClassLevels, expectedClassLevels, id);
    assert.deepEqual(inferred.spellGrants.map((grant) => grant.minimumClassLevel), expectedClassLevels, id);
    assert.ok(inferred.spellGrants.every((grant) => grant.mode === "known"), id);

    const remainingPatronSpells = witchPatronSpells(data.spells, patron, 20, "witch", inferred.bonusSpellReplacementClassLevels);
    assert.equal(remainingPatronSpells.length + inferred.spellGrants.length, 9, `${id} still grants nine patron spells`);

    const applied = applyArchetype(characterClass("witch"), selected, data.classes, data.spells);
    assert.deepEqual(applied.bonusSpellReplacementClassLevels, expectedClassLevels, `${id} applied replacement levels`);
    assert.equal(applied.spellGrants.length, inferred.spellGrants.length, `${id} applied replacement spells`);
    assert.equal(archetypeAutomationSummary(selected, data.feats, data.spells).manual.includes("Spells (level 1)"), false, id);
  }
});

test("incomplete patron tables stay manual instead of hiding unavailable replacement spells", () => {
  for (const id of ["witch-dreamweaver", "witch-hag-of-gyronna", "witch-sea-witch"]) {
    const selected = archetype(id);
    const inferred = inferArchetypeSpellAdditions(selected, data.spells);
    assert.deepEqual(inferred.bonusSpellReplacementClassLevels, [], id);
    assert.equal(archetypeAutomationSummary(selected, data.feats, data.spells).manual.includes("Spells (level 1)"), true, id);
  }
});
