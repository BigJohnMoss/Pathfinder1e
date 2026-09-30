import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, applyArchetypeResourceAdjustments, archetypeAutomationSummary, archetypeEligibilityIssues } from "../packages/engine/src/index.js";

const record = (id) => archetypes.find((item) => item.id === id);
const features = (id) => record(id).replacements.flatMap((replacement) => replacement.features ?? []);

test("Mantella and Season Keeper are fully automated", () => {
  for (const id of ["druid-mantella", "druid-season-keeper"]) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Mantella tracks its poison form, bounded Toxic Diet pool, and immunity", () => {
  const archetype = record("druid-mantella");
  assert.deepEqual([6, 8, 20].map((level) => applyArchetypeResourceAdjustments({}, [archetype], level).toxicDiet), [3, 4, 10]);
  const affinity = features(archetype.id).find((feature) => /^Poison Affinity/.test(feature.name));
  assert.deepEqual({ resourceId: affinity.resourceActions[0].resourceId, cost: affinity.resourceActions[0].cost }, { resourceId: "wildShape", cost: 1 });
  const diet = features(archetype.id).find((feature) => /^Toxic Diet/.test(feature.name));
  assert.deepEqual(diet.resourceActions.map(({ id, cost }) => [id, cost]), [["mantella-absorb-poison", 1], ["mantella-secrete-poison", 0]]);
  assert.equal(archetype.defenseAdjustments[0].qualifier, "poison (self and animal companion)");
});

test("Season Keeper enforces its companion path and seasonal wild-shape levels", () => {
  const archetype = record("druid-season-keeper");
  assert.ok(data.races.some((ancestry) => ancestry.id === "triaxian"));
  assert.deepEqual(archetypeEligibilityIssues(archetype, { ancestryId: "human", alignment: "neutral" }), ["Requires triaxian ancestry."]);
  assert.deepEqual(archetypeEligibilityIssues(archetype, { ancestryId: "triaxian", alignment: "neutral" }), []);
  const applied = applyArchetype(data.classes.find((item) => item.id === "druid"), archetype, data.classes);
  assert.deepEqual(applied.druidNatureBondOptionIds, ["druid-nature-bond-animal"]);
  assert.equal(applied.wildShapeLevelAdjustment, -2);
  assert.equal(applyArchetypeResourceAdjustments({}, [archetype], 20).seasonalSpirit, 1);
  const bond = features(archetype.id).find((feature) => /^Nature Bond/.test(feature.name));
  assert.deepEqual(bond.resourceActions[0].modes.map((mode) => mode.id), ["summer", "winter"]);
  assert.equal(bond.resourceActions.find((action) => action.id === "season-keeper-summer-healing").modes.at(-1).defaultRounds, 9);
  assert.equal(bond.resourceActions.find((action) => action.id === "season-keeper-greater-summer-healing").modes.at(-1).defaultRounds, 18);
  const shape = features(archetype.id).find((feature) => /^Wild Shape/.test(feature.name));
  assert.equal(shape.resourceActions.length, 3);
  assert.deepEqual(shape.progressionProfiles[0].steps.at(-1).values, { general: 18, seasonal: 20 });
});
