import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import feats from "../generated/pf1e-feats.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, applyArchetypeResourceAdjustments, archetypeAutomationSummary, inferArchetypeRerollActions, inferArchetypeResourceAdjustments } from "../packages/engine/src/index.js";
import { inferredArchetypeRerollActionDetails } from "../packages/engine/src/archetype-rerolls.js";

const archetype = (id) => archetypes.find((item) => item.id === id);

test("per-day archetype resources retain their exact level progression", () => {
  const creativeTreatment = inferArchetypeResourceAdjustments(archetype("bard-solacer")).find((item) => item.label === "Creative Treatment");
  assert.deepEqual([creativeTreatment.base, creativeTreatment.interval, creativeTreatment.maximum], [1, 4, 5]);
  assert.equal(applyArchetypeResourceAdjustments({}, [archetype("bard-solacer")], 6).creativeTreatment, 2);

  const cheatFate = inferArchetypeResourceAdjustments(archetype("rogue-sczarni-swindler")).find((item) => item.label === "Cheat Fate");
  assert.deepEqual(cheatFate.maximumByLevel, [
    { level: 8, maximum: 1 },
    { level: 14, maximum: 2 },
    { level: 20, maximum: 3 },
  ]);
});

test("deterministic self-owned rerolls become rules-aware actions", () => {
  const creativeTreatment = inferArchetypeRerollActions(archetype("bard-solacer"))[0].action;
  assert.equal(creativeTreatment.rerollAction.kind, "higher-d20");
  assert.equal(creativeTreatment.resourceId, "creativeTreatment");

  const guardedLife = inferArchetypeRerollActions(archetype("wizard-hallowed-necromancer"))[0].action;
  assert.equal(guardedLife.resourceId, "archetype-wizard-hallowed-necromancer-positive-touch-su-1");
  assert.equal(guardedLife.cost, 2);

  const cultHunter = inferArchetypeRerollActions(archetype("investigator-cult-hunter"))[0].action;
  assert.equal(cultHunter.resourceId, "inspiration");
  assert.equal(cultHunter.minimumLevel, 11);

  const infiltrator = inferArchetypeRerollActions(archetype("swashbuckler-daring-infiltrator"))[0].action;
  assert.equal(infiltrator.minimumLevel, 11);
});

test("reroll inference excludes target rerolls, nested die rerolls, and untracked costs", () => {
  for (const id of ["monk-nornkith", "paladin-iroran-paladin", "swashbuckler-noble-fencer", "investigator-sleuth", "oracle-dual-cursed-oracle", "samurai-ward-speaker"])
    assert.deepEqual(inferArchetypeRerollActions(archetype(id)), [], id);
});

test("applied archetypes expose inferred rerolls and complete pure reroll features", () => {
  const rogue = data.classes.find((item) => item.id === "rogue");
  const applied = applyArchetype(rogue, archetype("rogue-sczarni-swindler"));
  assert.equal(applied.features.find((feature) => feature.id === "rogue-sczarni-swindler-cheat-fate-ex-8")?.resourceActions?.[0]?.rerollAction?.kind, "d20");
  assert.ok(!archetypeAutomationSummary(archetype("rogue-sczarni-swindler"), feats).manual.includes("Cheat Fate (Ex) (level 8)"));
});

test("reroll sentence coverage composes with saving-throw automation", () => {
  const cultHunter = archetype("investigator-cult-hunter");
  const details = inferredArchetypeRerollActionDetails(cultHunter);
  assert.deepEqual(details.sentenceCoverage.map((entry) => entry.sentenceIndex), [2, 3]);
  assert.ok(!archetypeAutomationSummary(cultHunter, feats).manual.includes("Purify Mind and Body (Ex) (level 2)"));
  assert.ok(archetypeAutomationSummary(archetype("wizard-hallowed-necromancer"), feats).manual.includes("Guarded Life (Su) (level 15)"), "unmodeled damage prevention remains visible");
});

test("reroll inference stays unique and resource costs remain positive", () => {
  for (const item of archetypes) {
    const actions = inferArchetypeRerollActions(item);
    assert.equal(new Set(actions.map((entry) => entry.sourceFeatureId)).size, actions.length, item.id);
    assert.ok(actions.every(({ action }) => !action.resourceId || Number.isInteger(action.cost) && action.cost > 0), item.id);
  }
});
