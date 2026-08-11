import assert from "node:assert/strict";
import test from "node:test";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { spellsFromArchetypeGrants } from "../apps/web/app/archetype-spell-grants";
import { applyArchetype } from "../packages/engine/src/index.js";

const sorcerer = data.classes.find((item) => item.id === "sorcerer")!;
const razmiranPriest = archetypes.find((item) => item.id === "sorcerer-razmiran-priest")!;
const applied = applyArchetype(sorcerer, razmiranPriest, data.classes, data.spells);

test("the spellbook receives inferred bonus spells only at their class-level unlock", () => {
  const atTwo = spellsFromArchetypeGrants(data.spells, applied.spellGrants, "sorcerer", 2, 2, "known");
  const atThree = spellsFromArchetypeGrants(data.spells, applied.spellGrants, "sorcerer", 3, 2, "known");
  assert.ok(!atTwo.some((spell) => spell.id === "later-spell-aid"));
  assert.equal(atThree.find((spell) => spell.id === "later-spell-aid")?.levelByClass.sorcerer, 2);
});

test("grant mode and maximum spell level are both enforced", () => {
  assert.deepEqual(spellsFromArchetypeGrants(data.spells, applied.spellGrants, "sorcerer", 20, 2, "known").filter((spell) => spell.levelByClass.sorcerer > 2), []);
  assert.deepEqual(spellsFromArchetypeGrants(data.spells, applied.spellGrants, "sorcerer", 20, 9, "list"), []);
});
