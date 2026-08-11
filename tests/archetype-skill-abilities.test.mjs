import assert from "node:assert/strict";
import test from "node:test";
import { archetypeAutomationSummary, archetypeSkillAbilityOverrides, effectiveArchetypeSkillAbility, inferArchetypeSkillAbilityOverrides } from "../packages/engine/src/index.js";

const load = async (id) => (await import(`../packages/data/src/archetypes/${id}.json`, { with: { type: "json" } })).default;

test("infers Empiricist's unconditional Intelligence skill substitutions", async () => {
  const empiricist = await load("investigator-empiricist");
  assert.deepEqual(inferArchetypeSkillAbilityOverrides(empiricist), [
    "Disable Device",
    "Perception",
    "Sense Motive",
    "Use Magic Device",
  ].map((skill) => ({
    sourceFeatureId: "investigator-empiricist-ceaseless-observation-ex-2",
    skill,
    ability: "intelligence",
    minimumLevel: 2,
  })));
});

test("applies skill ability substitutions only from their minimum level", async () => {
  const empiricist = await load("investigator-empiricist");
  assert.equal(effectiveArchetypeSkillAbility([empiricist], { investigator: 1 }, "Perception", "wisdom"), "wisdom");
  assert.equal(effectiveArchetypeSkillAbility([empiricist], { investigator: 2 }, "Perception", "wisdom"), "intelligence");
  assert.equal(effectiveArchetypeSkillAbility([empiricist], { investigator: 20 }, "Diplomacy", "charisma"), "charisma");
});

test("applies Lotus Monk's grouped Knowledge and Linguistics substitutions at level 17", async () => {
  const lotus = await load("monk-lotus");
  assert.deepEqual(inferArchetypeSkillAbilityOverrides(lotus), ["Knowledge", "Linguistics"].map((skill) => ({
    sourceFeatureId: "lotus-learned-master-17",
    skill,
    ability: "wisdom",
    replacesAbility: "intelligence",
    minimumLevel: 17,
  })));
  assert.equal(effectiveArchetypeSkillAbility([lotus], { monk: 16 }, "Knowledge (arcana)", "intelligence"), "intelligence");
  assert.equal(effectiveArchetypeSkillAbility([lotus], { monk: 17 }, "Knowledge (arcana)", "intelligence"), "wisdom");
  assert.equal(effectiveArchetypeSkillAbility([lotus], { monk: 17 }, "Linguistics", "intelligence"), "wisdom");
});

test("explicit skill ability substitutions take precedence over inferred ones", async () => {
  const empiricist = await load("investigator-empiricist");
  const overrides = archetypeSkillAbilityOverrides({
    ...empiricist,
    skillAbilityOverrides: [{ skill: "Perception", ability: "charisma", minimumLevel: 3 }],
  });
  assert.equal(overrides.find((override) => override.skill === "Perception")?.ability, "charisma");
  assert.equal(overrides.filter((override) => override.skill === "Perception").length, 1);
});

test("reports the automated substitutions while retaining Empiricist's conditional rules", async () => {
  const empiricist = await load("investigator-empiricist");
  const summary = archetypeAutomationSummary(empiricist);
  assert.ok(summary.automated.includes("4 skill ability substitutions"));
  assert.ok(summary.manual.includes("Ceaseless Observation (Ex) (level 2)"));
});
