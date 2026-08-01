import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";

const archetypeDirectory = new URL("../packages/data/src/archetypes/", import.meta.url);
const classDirectory = new URL("../packages/data/src/classes/", import.meta.url);
const archetypes = await Promise.all((await readdir(archetypeDirectory))
  .filter((name) => name.endsWith(".json"))
  .map(async (name) => JSON.parse(await readFile(new URL(name, archetypeDirectory), "utf8"))));
const expectedCounts = {
  alchemist: 63,
  arcanist: 15,
  barbarian: 41,
  bard: 73,
  bloodrager: 18,
  brawler: 19,
  cavalier: 37,
  cleric: 35,
  druid: 75,
  fighter: 67,
  gunslinger: 23,
  hunter: 21,
  inquisitor: 38,
  investigator: 37,
  kineticist: 19,
  monk: 56,
  magus: 31,
  medium: 15,
  mesmerist: 21,
  oracle: 26,
  occultist: 20,
  paladin: 47,
  ranger: 62,
  rogue: 78,
  psychic: 8,
  samurai: 7,
  shaman: 17,
  skald: 26,
  slayer: 26,
  sorcerer: 13,
  spiritualist: 24,
  summoner: 22,
  swashbuckler: 20,
  warpriest: 18,
  witch: 42,
  wizard: 35
};

test("the archetype catalogue covers every published supported-class entry", () => {
  assert.equal(archetypes.length, Object.values(expectedCounts).reduce((total, count) => total + count, 0));
  for (const [classId, expected] of Object.entries(expectedCounts)) {
    const records = archetypes.filter((archetype) => archetype.classId === classId);
    assert.equal(records.length, expected, `${classId} archetype count`);
    assert.equal(new Set(records.map((archetype) => archetype.name.toLowerCase())).size, records.length, `${classId} duplicate names`);
  }
  // Totem Warrior has no replacements and is represented by the complete totem rage-power families.
  assert.ok(!archetypes.some((archetype) => archetype.id === "barbarian-totem-warrior"));
});

test("every archetype applies a valid sourced progression through level 20", async () => {
  const classes = new Map(await Promise.all(Object.keys(expectedCounts).map(async (classId) => [
    classId,
    JSON.parse(await readFile(new URL(`${classId}.json`, classDirectory), "utf8"))
  ])));
  for (const archetype of archetypes) {
    assert.ok(archetype.source?.url, `${archetype.id} source`);
    assert.ok(archetype.replacements?.length, `${archetype.id} replacements`);
    assert.ok(archetype.replacements.every((replacement) => replacement.features?.length), `${archetype.id} replacement features`);
    const applied = applyArchetype(classes.get(archetype.classId), archetype);
    assert.equal(applied.name, `${classes.get(archetype.classId).name} (${archetype.name})`);
    const features = featuresThroughLevel(applied, 20);
    assert.ok(archetype.replacements.flatMap((replacement) => replacement.features).every((feature) =>
      features.some((appliedFeature) => appliedFeature.id === feature.id)
    ), `${archetype.id} applied features`);
    assert.equal(new Set(features.map((feature) => feature.id)).size, features.length, `${archetype.id} duplicate applied features`);
  }
});
