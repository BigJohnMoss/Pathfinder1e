import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyArchetype, druidWildShapeUses, featuresThroughLevel } from "../packages/engine/src/index.js";

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

for (const [file, prefix, expected] of [
  ["druid-aquatic", "aquatic-druid", ["aquatic-druid-adaptation-2", "aquatic-druid-natural-swimmer-3", "aquatic-druid-resist-oceans-fury-4", "aquatic-druid-seaborn-9", "aquatic-druid-deep-diver-13"]],
  ["druid-arctic", "arctic-druid", ["arctic-druid-native-2", "arctic-druid-icewalking-3", "arctic-druid-endurance-4", "arctic-druid-snowcaster-9", "arctic-druid-flurry-form-13"]]
]) test(`${file} delays Wild Shape and replaces its terrain progressions`, async () => {
  const druid = await load("../packages/data/src/classes/druid.json");
  const archetype = await load(`../packages/data/src/archetypes/${file}.json`);
  const applied = applyArchetype(druid, archetype);
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  for (const id of expected) assert.ok(ids.includes(id));
  for (const id of ["druid-woodland-stride-2", "druid-trackless-step-3", "druid-resist-natures-lure-4", "druid-wild-shape-4", "druid-venom-immunity-9", "druid-thousand-faces-13"]) assert.ok(!ids.includes(id));
  assert.equal(applied.wildShapeLevelAdjustment, -2);
  assert.equal(druidWildShapeUses(20 + applied.wildShapeLevelAdjustment), 8);
  assert.ok(ids.includes(`${prefix}-wild-shape-20`));
});
