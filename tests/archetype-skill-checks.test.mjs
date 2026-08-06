import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import { archetypeAutomationSummary, archetypeSkillCheckRules, inferArchetypeSkillCheckRules } from "../packages/engine/src/index.js";

const byId = (id) => archetypes.find((archetype) => archetype.id === id);

test("deterministic archetype skill checks respect exact level gates and skill scopes", () => {
  const archaeologist = byId("bard-archaeologist");
  const philosopher = byId("oracle-enlightened-philosopher");
  const spireDiver = byId("slayer-spire-diver");
  assert.ok(archaeologist && philosopher && spireDiver);
  assert.deepEqual(archetypeSkillCheckRules([archaeologist], { bard: 5 }), []);
  assert.deepEqual(archetypeSkillCheckRules([archaeologist], { bard: 6 }).map((rule) => [rule.result, rule.skills]), [[10, ["Disable Device"]]]);
  assert.deepEqual(archetypeSkillCheckRules([philosopher], { oracle: 19 }), []);
  assert.equal(archetypeSkillCheckRules([philosopher], { oracle: 20 })[0]?.result, 20);
  assert.deepEqual(archetypeSkillCheckRules([spireDiver], { slayer: 18 }).map((rule) => rule.result), [10]);
  assert.deepEqual(archetypeSkillCheckRules([spireDiver], { slayer: 19 }).map((rule) => rule.result), [10, 20]);
});

test("conditional take rules preserve their published applicability and stress exception", () => {
  const catBurglar = byId("rogue-cat-burglar");
  const warden = byId("ranger-warden");
  const krakenCaller = byId("druid-kraken-caller");
  assert.ok(catBurglar && warden && krakenCaller);
  assert.equal(inferArchetypeSkillCheckRules(catBurglar)[0]?.condition, "while in dungeon and urban environments");
  assert.equal(inferArchetypeSkillCheckRules(warden)[0]?.condition, "involving any of his favored terrains");
  assert.equal(inferArchetypeSkillCheckRules(byId("bard-fey-prankster"))[0]?.trainedOnly, true);
  assert.equal(inferArchetypeSkillCheckRules(krakenCaller)[0]?.allowsStress, true);
  assert.ok(!archetypeAutomationSummary(krakenCaller).manual.some((item) => item.startsWith("Dauntless Swimmer")));
});

test("skill-check inference is normalized, player-owned, and conservative across the catalogue", () => {
  const allowedSkills = new Set(["Acrobatics", "Appraise", "Bluff", "Climb", "Craft", "Diplomacy", "Disable Device", "Disguise", "Escape Artist", "Fly", "Handle Animal", "Heal", "Intimidate", "Linguistics", "Perception", "Perform", "Profession", "Ride", "Sense Motive", "Sleight of Hand", "Spellcraft", "Stealth", "Survival", "Swim", "Use Magic Device", ...["arcana", "dungeoneering", "engineering", "geography", "history", "local", "nature", "nobility", "planes", "religion"].map((name) => `Knowledge (${name})`)]);
  let count = 0;
  for (const archetype of archetypes) {
    const rules = inferArchetypeSkillCheckRules(archetype);
    const signatures = new Set();
    for (const rule of rules) {
      count += 1;
      assert.ok([10, 20].includes(rule.result), `${archetype.id} has a supported deterministic result`);
      assert.ok(rule.minimumLevel >= 1 && rule.minimumLevel <= 20, `${archetype.id} has a bounded level`);
      assert.ok(rule.skills.length > 0 && rule.skills.every((skill) => allowedSkills.has(skill)), `${archetype.id} has exact builder skills`);
      assert.ok((rule.condition?.length ?? 0) <= 250, `${archetype.id} has a readable condition`);
      const signature = JSON.stringify([rule.sourceFeatureId, rule.result, rule.skills, rule.condition]);
      assert.ok(!signatures.has(signature), `${archetype.id} has no duplicate skill-check rule`);
      signatures.add(signature);
    }
  }
  assert.equal(count, 18);
});
