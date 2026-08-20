import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, inferArchetypeTemporaryHitPointActions } from "../packages/engine/src/index.js";
import { inferredArchetypeTemporaryHitPointActionDetails } from "../packages/engine/src/archetype-temporary-hit-points.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const classes = data.classes;

test("deterministic player-owned temporary hit points become level-aware feature actions", () => {
  const armoredVigor = inferArchetypeTemporaryHitPointActions(archetype("fighter-siegebreaker"))[0];
  assert.deepEqual(armoredVigor.action.temporaryHitPointsByLevel, [
    { level: 2, amount: 2 },
    { level: 6, amount: 4 },
    { level: 10, amount: 6 },
    { level: 14, amount: 8 },
    { level: 18, amount: 10 },
  ]);
  assert.deepEqual(armoredVigor.action.temporaryHitPointsDurationRoundsByLevel, [{ level: 2, rounds: 10 }]);
  assert.equal(armoredVigor.action.resourceId, "archetype-fighter-siegebreaker-armored-vigor-ex-2");
  assert.deepEqual(armoredVigor.action.confirmations, [{ id: "wearing-armor", label: "Wearing armor", requiredForActivation: true }]);

  const rasugen = inferArchetypeTemporaryHitPointActions(archetype("alchemist-mnemostiller"))[0].action;
  assert.deepEqual(rasugen.temporaryHitPointsByLevel.slice(0, 2), [{ level: 1, amount: 2 }, { level: 2, amount: 4 }]);
  assert.equal(inferArchetypeTemporaryHitPointActions(archetype("medium-fiend-keeper"))[0].action.minimumLevel, 5);
});

test("complete temporary-HP actions leave the manual queue", () => {
  assert.equal(archetypeAutomationSummary(archetype("fighter-siegebreaker"), data.feats, data.spells).manual.includes("Armored Vigor (Ex) (level 2)"), false);
  assert.equal(archetypeAutomationSummary(archetype("alchemist-mnemostiller"), data.feats, data.spells).manual.includes("Rasugen (Su) (level 1)"), true);
});

test("temporary-HP sentence coverage exposes only rules represented by the action", () => {
  const armoredVigor = inferredArchetypeTemporaryHitPointActionDetails(archetype("fighter-siegebreaker"));
  assert.deepEqual(armoredVigor.sentenceCoverage.map((entry) => entry.sentenceIndex), [0, 1, 2]);
  const rasugen = inferredArchetypeTemporaryHitPointActionDetails(archetype("alchemist-mnemostiller"));
  assert.deepEqual(rasugen.sentenceCoverage.map((entry) => entry.sentenceIndex), [2]);
  assert.ok(archetypeAutomationSummary(archetype("alchemist-mnemostiller"), data.feats, data.spells).manual.includes("Rasugen (Su) (level 1)"), "unmodeled mutagen restrictions remain visible");
});

test("temporary-hit-point inference excludes benefits owned by allies and subordinate creatures", () => {
  for (const id of ["barbarian-raging-cannibal", "cavalier-constable", "druid-ape-shaman", "investigator-dread-investigator", "monk-sohei", "rogue-rotdrinker", "witch-witch-watcher"])
    assert.deepEqual(inferArchetypeTemporaryHitPointActions(archetype(id)), [], id);
});

test("applied archetypes expose inferred temporary-hit-point actions to the feature UI", () => {
  const fighter = classes.find((item) => item.id === "fighter");
  const applied = applyArchetype(fighter, archetype("fighter-siegebreaker"));
  const action = applied.features.find((feature) => feature.id === "fighter-siegebreaker-armored-vigor-ex-2")?.resourceActions?.[0];
  assert.equal(action?.label, "Gain Armored Vigor temporary HP");
  assert.equal(action?.temporaryHitPointsByLevel.at(-1).amount, 10);
});

test("temporary-hit-point inference remains bounded and unique across the catalogue", () => {
  for (const item of archetypes) {
    const actions = inferArchetypeTemporaryHitPointActions(item);
    assert.equal(new Set(actions.map((entry) => entry.sourceFeatureId)).size, actions.length, `${item.id} has unique actions`);
    for (const { action } of actions) {
      assert.ok(action.temporaryHitPointsByLevel.length > 0);
      assert.ok(action.temporaryHitPointsByLevel.every((step) => step.level >= 1 && step.level <= 20 && step.amount >= 1 && step.amount <= 9999), `${item.id} has bounded amounts`);
      assert.ok((action.temporaryHitPointsDurationRoundsByLevel ?? []).every((step) => step.level >= 1 && step.level <= 20 && step.rounds >= 1 && step.rounds <= 999), `${item.id} has bounded durations`);
    }
  }
});
