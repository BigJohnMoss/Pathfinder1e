import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  archetypeAutomationSummary,
} from "../packages/engine/src/index.js";

const record = (id) => archetypes.find((candidate) => candidate.id === id);
const features = (id) => record(id).replacements.flatMap((replacement) => replacement.features ?? []);

test("Druid single-gap archetypes are fully automated", () => {
  for (const id of ["druid-mooncaller", "druid-draconic-druid"]) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Mooncaller retains both published conditional save bonuses", () => {
  const rows = record("druid-mooncaller").conditionalModifiers;
  assert.deepEqual(rows.map(({ base, condition }) => ({ base, condition })), [
    { base: 4, condition: "Saving throws to avoid confusion, daze, feeblemind, and insanity effects" },
    { base: 4, condition: "Saving throws against exceptional, spell-like, and supernatural abilities of creatures with the shapechanger subtype" },
  ]);
});

test("Draconic Druid exposes every Dragon Shape tier with exact wild-shape costs", () => {
  const feature = features("druid-draconic-druid").find(({ name }) => name === "Dragon Shape");
  assert.deepEqual(feature.resourceActions.map(({ minimumLevel, resourceId, cost }) => ({ minimumLevel, resourceId, cost })), [
    { minimumLevel: 4, resourceId: "wildShape", cost: 1 },
    { minimumLevel: 10, resourceId: "wildShape", cost: 2 },
    { minimumLevel: 12, resourceId: "wildShape", cost: 2 },
  ]);
  assert.deepEqual(record("druid-draconic-druid").companionGrants.map(({ kind }) => kind), ["drake"]);
});
