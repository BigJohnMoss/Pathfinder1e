import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

test("Arcane Duelist replaces every published Bard feature and grants its fixed feats", async () => {
  const bard = await load("../packages/data/src/classes/bard.json");
  const archetype = await load("../packages/data/src/archetypes/bard-arcane-duelist.json");
  const applied = applyArchetype(bard, archetype);
  const features = featuresThroughLevel(applied, 20);
  const ids = features.map((feature) => feature.id);

  for (const added of [
    "arcane-duelist-arcane-strike-1",
    "arcane-duelist-rallying-cry-1",
    "arcane-duelist-bladethirst-6",
    "arcane-duelist-mass-bladethirst-18",
    "arcane-duelist-combat-casting-2",
    "arcane-duelist-greater-penetrating-strike-18",
    "arcane-duelist-arcane-bond-5",
    "arcane-duelist-arcane-armor-heavy-16"
  ]) assert.ok(ids.includes(added));

  for (const removed of [
    "bardic-knowledge-1",
    "bard-countersong-1",
    "bard-suggestion-6",
    "bard-mass-suggestion-18",
    "bard-well-versed-2",
    "bard-versatile-performance-18",
    "bard-lore-master-17",
    "bard-jack-of-all-trades-19"
  ]) assert.ok(!ids.includes(removed));

  assert.deepEqual(
    features.flatMap((feature) => feature.grantedFeatId ? [feature.grantedFeatId] : []),
    ["arcane-strike", "combat-casting", "disruptive", "armor-proficiency-medium", "spellbreaker", "penetrating-strike", "armor-proficiency-heavy", "greater-penetrating-strike"]
  );
  assert.ok(ids.includes("bard-inspire-courage-17"));
  assert.ok(ids.includes("bard-deadly-performance-20"));
});

test("Archivist replaces its performance and knowledge progressions through level 20", async () => {
  const bard = await load("../packages/data/src/classes/bard.json");
  const archetype = await load("../packages/data/src/archetypes/bard-archivist.json");
  const ids = featuresThroughLevel(applyArchetype(bard, archetype), 20).map((feature) => feature.id);

  for (const added of [
    "archivist-naturalist-1",
    "archivist-lamentable-belaborment-6",
    "archivist-pedantic-lecture-18",
    "archivist-lore-master-2",
    "archivist-magic-lore-2",
    "archivist-jack-of-all-trades-17",
    "archivist-probable-path-10"
  ]) assert.ok(ids.includes(added));

  for (const removed of [
    "bard-inspire-courage-1",
    "bard-inspire-courage-17",
    "bard-suggestion-6",
    "bard-mass-suggestion-18",
    "bard-versatile-performance-18",
    "bard-well-versed-2",
    "bard-lore-master-17",
    "bard-jack-of-all-trades-19"
  ]) assert.ok(!ids.includes(removed));

  assert.ok(ids.includes("bard-countersong-1"));
  assert.ok(ids.includes("bard-deadly-performance-20"));
});
