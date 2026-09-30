import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  applyArchetypeResourceAdjustments,
  archetypeAutomationSummary,
} from "../packages/engine/src/index.js";

const source = archetypes.find((item) => item.id === "druid-drovier");
const features = source.replacements.flatMap((replacement) => replacement.features ?? []);

test("Drovier is fully automated", () => {
  assert.equal(source.mechanicalCoverage, "full");
  assert.deepEqual(archetypeAutomationSummary(source, data.feats, data.spells).manual, []);
});

test("Drovier restricts Nature Bond to its three legal domains", () => {
  const druid = data.classes.find((item) => item.id === "druid");
  const applied = applyArchetype(druid, source, data.classes);
  assert.deepEqual(applied.druidNatureBondOptionIds, ["druid-nature-bond-domain"]);
  assert.deepEqual(applied.druidDomainIds, ["domain-animal", "domain-eagle", "domain-wolf"]);
  assert.deepEqual(source.optionGroupAugmentations, [{ targetGroupId: "cleric-domains", sourceGroupId: "drovier-domains" }]);

  const group = data.optionGroups.find((item) => item.id === "drovier-domains");
  assert.deepEqual(group.options.map(({ id }) => id), ["domain-eagle", "domain-wolf"]);
  for (const id of ["domain-eagle", "domain-wolf"])
    assert.ok(group.options.find((domain) => domain.id === id)?.domainSpells.length === 9, id);
});

test("Drovier Communal Aspect scales by level and becomes at will at level 20", () => {
  assert.deepEqual(
    [4, 10, 19, 20].map((level) => applyArchetypeResourceAdjustments({}, [source], level).communalAspectIncrements),
    [4, 10, 19, 20],
  );
  const adjustment = source.resourceAdjustments.find(({ resourceId }) => resourceId === "communalAspectIncrements");
  assert.equal(adjustment.atWillAtLevel, 20);

  const action = features.find((feature) => /^Communal Aspect/.test(feature.name)).resourceActions[0];
  assert.deepEqual({ id: action.id, resourceId: action.resourceId, cost: action.cost }, {
    id: "drovier-communal-aspect",
    resourceId: "communalAspectIncrements",
    cost: 1,
  });
  assert.equal(action.activeEffect.defaultRounds, 100);
  assert.equal(action.activeEffect.replaceExisting, true);
  assert.deepEqual(action.modes.filter((mode) => mode.maximumLevel === 5).map(({ label }) => label), [
    "Frog", "Gorilla", "Monkey", "Otter", "Raccoon", "Raptor", "Tree Lizard",
  ]);
  assert.deepEqual(action.modes.filter((mode) => mode.minimumLevel === 6).map(({ label }) => label), [
    "Frog (greater)", "Gorilla (greater)", "Monkey (greater)", "Otter (greater)",
    "Raccoon (greater)", "Raptor (greater)", "Tree Lizard (greater)",
  ]);
  assert.deepEqual(action.modes.slice(-4).map(({ label, minimumLevel }) => [label, minimumLevel]), [
    ["Aspect of the Falcon", 8], ["Aspect of the Bear", 10],
    ["Aspect of the Stag", 12], ["Aspect of the Wolf", 14],
  ]);
});
