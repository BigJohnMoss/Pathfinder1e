import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  archetypeAutomationSummary,
  characterPrecisionDamageRules,
  inferArchetypePrecisionDamageAdjustments,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const characterClass = (id) => data.classes.find((item) => item.id === id);

test("archetype sneak attack progressions resolve at their published levels", () => {
  const cases = [
    ["alchemist-eldritch-poisoner", [1, 4, 8, 12, 16, 20]],
    ["brawler-snakebite-striker", [1, 6, 10, 12, 20]],
    ["fighter-venomblade", [6, 10, 14, 18]],
    ["inquisitor-sanctified-slayer", [4, 7, 10, 13, 16, 19]],
    ["mesmerist-enigma", [5, 9, 13, 17]],
    ["rogue-eldritch-scoundrel", [3, 7, 11, 15, 19]],
    ["warpriest-cult-leader", [3, 6, 9, 12, 15, 18]],
    ["warpriest-mantis-zealot", [4, 8, 12, 16, 20]],
    ["rogue-snare-setter", [5, 9, 13, 17]],
    ["bard-sandman", [5, 10, 15, 20]],
  ];
  for (const [id, levels] of cases) {
    const [rule] = inferArchetypePrecisionDamageAdjustments(archetype(id));
    assert.ok(rule, `${id} has a precision-damage rule`);
    assert.deepEqual(rule.diceByLevel.map((step) => step.level), levels, id);
    assert.deepEqual(rule.diceByLevel.map((step) => step.dice), levels.map((_, index) => index + 1), id);
    assert.equal(archetypeAutomationSummary(archetype(id)).manual.some((item) => /Sneak Attack/i.test(item)), false, id);
  }
});

test("precision damage retains attack and range restrictions", () => {
  const [woodland] = inferArchetypePrecisionDamageAdjustments(archetype("slayer-woodland-sniper"));
  assert.equal(woodland.attackMode, "ranged");
  assert.deepEqual(woodland.maximumRangeByLevel, [
    { level: 3, range: 30 }, { level: 6, range: 40 }, { level: 9, range: 50 },
    { level: 12, range: 60 }, { level: 15, range: 70 }, { level: 18, range: 80 },
  ]);
  const applied = applyArchetype(characterClass("slayer"), archetype("slayer-woodland-sniper"));
  assert.equal(characterPrecisionDamageRules([applied], { slayer: 12 })[0].maximumRange, 60);
  const carnivalist = archetype("rogue-carnivalist");
  assert.equal(inferArchetypePrecisionDamageAdjustments(carnivalist)[0].partialFeature, true);
  assert.ok(archetypeAutomationSummary(carnivalist).manual.some((item) => /Sneak Attack/i.test(item)), "the familiar clause remains visible for manual implementation");
});

test("Vivisectionist and Rogue levels stack before determining sneak attack dice", () => {
  const vivisectionist = applyArchetype(characterClass("alchemist"), archetype("alchemist-vivisectionist"));
  assert.equal(characterPrecisionDamageRules([vivisectionist], { alchemist: 5 })[0].dice, 3);
  const combined = characterPrecisionDamageRules([vivisectionist, characterClass("rogue")], { alchemist: 5, rogue: 2 });
  assert.equal(combined.length, 1);
  assert.equal(combined[0].dice, 4);
  assert.match(combined[0].source, /Vivisectionist.*Rogue/i);
});

test("core Rogue and Slayer sneak attack progressions produce active combat rules", () => {
  assert.equal(characterPrecisionDamageRules([characterClass("rogue")], { rogue: 20 })[0].dice, 10);
  assert.equal(characterPrecisionDamageRules([characterClass("slayer")], { slayer: 12 })[0].dice, 4);
});
