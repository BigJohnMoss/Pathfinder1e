import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  archetypeArmorConditionedBenefits,
  archetypeAutomationSummary,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((candidate) => candidate.id === id);

test("Armor Master benefits follow equipped armor, shield cap, and level breakpoints", () => {
  const armorMaster = archetype("fighter-armor-master");
  assert.deepEqual(archetypeArmorConditionedBenefits([armorMaster], { fighter: 4 }, { armorCategory: "heavy", shieldBonus: 1 }).armorClass, { normal: 0, touch: 1, flatFooted: 0 });
  assert.equal(archetypeArmorConditionedBenefits([armorMaster], { fighter: 20 }, { armorCategory: "heavy", shieldBonus: 4 }).armorClass.touch, 4);
  assert.equal(archetypeArmorConditionedBenefits([armorMaster], { fighter: 20 }, { armorCategory: "none", shieldBonus: 0 }).defenses.length, 0);
  for (const [armorCategory, expected] of [["light", 4], ["medium", 8], ["heavy", 12]]) {
    const benefits = archetypeArmorConditionedBenefits([armorMaster], { fighter: 20 }, { armorCategory });
    assert.equal(benefits.defenses.find((defense) => defense.kind === "damageReduction")?.value, expected);
    assert.equal(benefits.defenses.find((defense) => defense.kind === "fortification")?.value, 75);
    assert.equal(benefits.defenses.find((defense) => defense.kind === "immunity")?.qualifier, "critical hits and sneak attacks");
    assert.ok(benefits.conditionalModifiers.some((modifier) => /cannot be sundered/i.test(modifier.label)));
  }
  assert.deepEqual(archetypeAutomationSummary(armorMaster, data.feats, data.spells).manual, []);
});

test("Molthuni Defender resolves armor-scaled defense and distinct selected maneuver bonuses", () => {
  const molthuni = archetype("fighter-molthuni-defender");
  const selectedOptions = {
    "fighter-molthuni-defender-armored-defense-ex-3": "molthuni-trip",
    "fighter-molthuni-defender-armored-defense-maneuver-7": "molthuni-grapple",
    "fighter-molthuni-defender-armored-defense-maneuver-11": "molthuni-trip",
    unrelated: "molthuni-drag",
  };
  assert.deepEqual(archetypeArmorConditionedBenefits([molthuni], { fighter: 15 }, { armorCategory: "light", selectedOptions }).conditionalModifiers, []);
  const benefits = archetypeArmorConditionedBenefits([molthuni], { fighter: 15 }, { armorCategory: "heavy", selectedOptions });
  assert.equal(benefits.conditionalModifiers.find((modifier) => modifier.label === "CMD")?.bonus, 6);
  assert.equal(benefits.conditionalModifiers.find((modifier) => modifier.label.startsWith("Acrobatics DC"))?.bonus, 6);
  assert.deepEqual(benefits.conditionalModifiers.filter((modifier) => modifier.label.endsWith(" CMB")).map((modifier) => [modifier.label, modifier.bonus]).sort(), [["Grapple CMB", 2], ["Trip CMB", 2]]);
  assert.deepEqual(archetypeAutomationSummary(molthuni, data.feats, data.spells).manual, []);
});
