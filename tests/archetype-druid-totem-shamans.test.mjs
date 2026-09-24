import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, inferArchetypeFeatChoices, inferArchetypeNatureBondRules } from "../packages/engine/src/index.js";

const ids = ["ape", "bat", "bear", "boar", "dragon", "eagle", "lion", "saurian", "serpent", "shark", "wolf"];
const record = (totem) => archetypes.find((item) => item.id === `druid-${totem}-shaman`);
const features = (totem) => record(totem).replacements.flatMap((replacement) => replacement.features ?? []);

test("all eleven totem shamans have complete structured automation", () => {
  for (const totem of ids) {
    const archetype = record(totem);
    assert.equal(archetype.mechanicalCoverage, "full", totem);
    assert.deepEqual(archetypeAutomationSummary(archetype, data.feats, data.spells).manual, [], totem);
    assert.equal(archetype.resourceAdjustments.find((entry) => entry.resourceId === "totemTransformation")?.levelMultiplier, 1, totem);
    const transformation = features(totem).find((feature) => /^Totem Transformation/.test(feature.name));
    assert.equal(transformation.resourceActions[0].modes.length >= 3, true, totem);
    assert.deepEqual(transformation.resourceActions[0].actionTypeByLevel, [
      { level: 2, actionType: "standard" },
      { level: 7, actionType: "move" },
      { level: 12, actionType: "swift" },
    ], totem);
    assert.equal(transformation.resourceActions[1].spellLikeAbility.spellId, "speak-with-animals", totem);
    const summons = features(totem).find((feature) => /^Totemic Summons/.test(feature.name));
    assert.equal(summons.resourceActions[0].modes.length, 5, totem);
    const wildShape = features(totem).find((feature) => /^Wild Shape/.test(feature.name));
    assert.equal(wildShape.resourceActions[0].resourceId, "wildShape", totem);
    assert.equal(wildShape.progressionProfiles[0].steps.length, 15, totem);
    const sourceSlots = features(totem).filter((feature) => feature.name === "Bonus Feat" && feature.optionGroupId === "archetype-feats");
    const inferredSlots = inferArchetypeFeatChoices(archetype, data.feats);
    assert.deepEqual((sourceSlots.length ? sourceSlots : inferredSlots).map((feature) => feature.level).sort((a, b) => a - b), [9, 13, 17], totem);
  }
});

test("totem Nature Bond restrictions only expose catalog-backed choices", () => {
  const companions = new Set(data.optionGroups.find((group) => group.id === "ranger-animal-companions").options.map((option) => option.id));
  const domains = new Set(data.optionGroups.find((group) => group.id === "cleric-domains").options.map((option) => option.id));
  const druid = data.classes.find((item) => item.id === "druid");
  for (const totem of ids) {
    const archetype = record(totem);
    const rules = inferArchetypeNatureBondRules(archetype);
    assert.ok(rules.animalCompanionIds.length > 0, totem);
    assert.ok(rules.animalCompanionIds.every((id) => companions.has(id)), totem);
    assert.ok(rules.domainIds.every((id) => domains.has(id)), totem);
    const applied = applyArchetype(druid, archetype, data.classes);
    assert.deepEqual(applied.druidAnimalCompanionIds, rules.animalCompanionIds, totem);
    assert.deepEqual(applied.druidDomainIds, rules.domainIds, totem);
  }
});

test("dragon shaman automates its exceptional progression and bite rider", () => {
  const dragon = record("dragon");
  assert.equal(dragon.wildShapeLevelAdjustment, -4);
  const bite = features("dragon").find((feature) => /^Dragon Bite/.test(feature.name));
  assert.deepEqual(bite.resourceActions[0].modes.map((mode) => mode.id), ["acid", "cold", "electricity", "fire"]);
  const wildShape = features("dragon").find((feature) => /^Wild Shape/.test(feature.name));
  assert.deepEqual(wildShape.progressionProfiles[0].steps.at(-1).values, { other: 16, favored: 20 });
});
