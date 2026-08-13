import assert from "node:assert/strict";
import test from "node:test";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  archetypeConflictReasons,
  archetypeAutomationSummary,
  archetypeWildEmpathyChecks,
  inferArchetypeReplacementFeatureIds,
  inferArchetypeWildEmpathyAdjustments,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const characterClass = (id) => data.classes.find((item) => item.id === id);

test("specialist Wild Empathy checks retain their target, action, and bonus", () => {
  const applied = applyArchetype(characterClass("druid"), archetype("druid-ape-shaman"), data.classes, data.spells);
  const checks = archetypeWildEmpathyChecks([applied], { druid: 5 }, { charisma: 2 });
  assert.deepEqual(checks.map((check) => [check.name, check.modifier]), [
    ["Wild Empathy - animals", 7],
    ["Wild Empathy - apes and other primates", 11],
  ]);
  assert.match(checks[1].description, /full-round action/);
  assert.ok(!archetypeAutomationSummary(archetype("druid-ape-shaman"), data.feats, data.spells).manual.includes("Wild Empathy (Ex) (level 1)"));
});

test("split bonuses, penalties, and target restrictions produce distinct checks", () => {
  const aerie = applyArchetype(characterClass("druid"), archetype("druid-aerie-protector"), data.classes, data.spells);
  assert.deepEqual(archetypeWildEmpathyChecks([aerie], { druid: 5 }, { charisma: 2 }).map((check) => [check.name, check.modifier]), [
    ["Wild Empathy - flying animals", 11],
    ["Wild Empathy - other animals", 3],
  ]);

  const goliath = applyArchetype(characterClass("druid"), archetype("druid-goliath-druid"), data.classes, data.spells);
  assert.deepEqual(archetypeWildEmpathyChecks([goliath], { druid: 5 }, { charisma: 2 }).map((check) => check.name), [
    "Wild Empathy - creatures that are Large or larger",
  ]);
});

test("archetype-granted Wild Empathy uses the granting class level", () => {
  const minstrel = applyArchetype(characterClass("bard"), archetype("bard-first-world-minstrel"), data.classes, data.spells);
  assert.deepEqual(archetypeWildEmpathyChecks([minstrel], { bard: 4 }, { charisma: 3 }).map((check) => [check.name, check.modifier]), [
    ["Wild Empathy - animals", 7],
  ]);
});

test("rules-text replacement inference removes omitted base features conservatively", () => {
  const deathDruid = archetype("druid-death-druid");
  assert.deepEqual(inferArchetypeReplacementFeatureIds(characterClass("druid"), deathDruid).sort(), [
    "druid-nature-sense-1",
    "druid-wild-empathy-1",
  ]);
  const applied = applyArchetype(characterClass("druid"), deathDruid, data.classes, data.spells);
  assert.equal(archetypeWildEmpathyChecks([applied], { druid: 5 }, { charisma: 2 }).length, 0);

  const cryptBreaker = archetype("alchemist-crypt-breaker");
  assert.equal(inferArchetypeReplacementFeatureIds(characterClass("alchemist"), cryptBreaker).some((id) => id.startsWith("alchemist-discovery-")), false);
});

test("inferred replacement targets participate in archetype conflict checks", () => {
  const inferred = {
    id: "inferred",
    name: "Inferred",
    classId: "druid",
    replacements: [{ features: [{ id: "replacement", name: "Replacement", level: 1, summary: "This ability replaces wild empathy." }] }],
  };
  const explicit = {
    id: "explicit",
    name: "Explicit",
    classId: "druid",
    replacements: [{ featureIds: ["druid-wild-empathy-1"], features: [] }],
  };
  assert.match(archetypeConflictReasons(inferred, explicit, characterClass("druid"))[0], /wild empathy/i);
});

test("catalogue inference remains bounded and source-linked", () => {
  const rules = archetypes.flatMap((entry) => inferArchetypeWildEmpathyAdjustments(entry));
  assert.ok(rules.length >= 25);
  assert.ok(rules.every((rule) => rule.sourceFeatureId && rule.classId && rule.targets && Number.isInteger(rule.bonus)));
});
