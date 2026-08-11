import assert from "node:assert/strict";
import test from "node:test";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, archetypeSpellModifiers, inferArchetypeSpellModifiers } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const characterClass = (id) => data.classes.find((item) => item.id === id);
const spell = (id) => data.spells.find((item) => item.id === id);

test("named-spell caster-level bonuses scale at their published milestone", () => {
  const roadKeeper = applyArchetype(characterClass("druid"), archetype("druid-road-keeper"), data.classes, data.spells);
  assert.equal(archetypeSpellModifiers(roadKeeper, 1, spell("longstrider")).casterLevel, 1);
  assert.equal(archetypeSpellModifiers(roadKeeper, 8, spell("longstrider")).casterLevel, 1);
  assert.equal(archetypeSpellModifiers(roadKeeper, 9, spell("longstrider")).casterLevel, 2);
  assert.equal(archetypeSpellModifiers(roadKeeper, 20, spell("entangle")).casterLevel, 0);
  assert.ok(!archetypeAutomationSummary(archetype("druid-road-keeper"), data.feats, data.spells).manual.includes("One with the Road (Su) (level 9)"));
});

test("descriptor and named-spell save-DC bonuses apply only to eligible spells", () => {
  const winterWitch = applyArchetype(characterClass("witch"), archetype("witch-winter-witch"), data.classes, data.spells);
  assert.equal(archetypeSpellModifiers(winterWitch, 1, spell("snowball")).saveDc, 1);
  assert.equal(archetypeSpellModifiers(winterWitch, 1, spell("bestow-curse")).saveDc, 0);

  const psychicDuelist = applyArchetype(characterClass("psychic"), archetype("psychic-psychic-duelist"), data.classes, data.spells);
  assert.equal(archetypeSpellModifiers(psychicDuelist, 4, spell("later-spell-instigate-psychic-duel")).saveDc, 1);
  assert.equal(archetypeSpellModifiers(psychicDuelist, 4, spell("daze")).saveDc, 0);
});

test("spell-access and modifier sentence coverage complete Ice Magic together", () => {
  assert.equal(inferArchetypeSpellModifiers(archetype("witch-winter-witch"), data.spells).length, 1);
  const summary = archetypeAutomationSummary(archetype("witch-winter-witch"), data.feats, data.spells);
  assert.ok(summary.automated.some((entry) => /cross-rule feature/.test(entry)));
  assert.ok(!summary.manual.includes("Ice Magic (level 1)"));
});

test("passive concentration bonuses retain spell and defensive-casting scope", () => {
  const dervish = applyArchetype(characterClass("bard"), archetype("bard-dawnflower-dervish"), data.classes, data.spells);
  assert.equal(archetypeSpellModifiers(dervish, 5, spell("daze")).concentration, 4);
  assert.match(archetypeSpellModifiers(dervish, 5, spell("daze")).sources[0], /when casting spells defensively/);

  const herald = applyArchetype(characterClass("cleric"), archetype("cleric-herald-caller"), data.classes, data.spells);
  assert.equal(archetypeSpellModifiers(herald, 5, spell("summon-monster-1")).concentration, 1);
  assert.equal(archetypeSpellModifiers(herald, 5, spell("guidance")).concentration, 0);
});
