import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

for (const [file, expected, removed] of [
  ["paladin-divine-defender", ["divine-defender-shared-defense-3","divine-defender-shared-defense-range-6","divine-defender-armor-bond-5"], ["paladin-mercy-3","paladin-mercy-6","paladin-mercy-9","paladin-mercy-12","paladin-mercy-15","paladin-mercy-18","paladin-divine-bond-5"]],
  ["paladin-hospitaler", ["hospitaler-channel-positive-energy-4","hospitaler-aura-of-healing-11"], ["paladin-channel-positive-energy-4","paladin-aura-of-justice-11"]],
  ["paladin-shining-knight", ["shining-knight-skilled-rider-3","shining-knight-mounted-bond-5","shining-knight-knights-charge-11"], ["paladin-divine-health-3","paladin-divine-bond-5","paladin-aura-of-justice-11"]],
  ["paladin-undead-scourge", ["undead-scourge-aura-of-life-8","undead-scourge-annihilation-11"], ["paladin-aura-of-resolve-8","paladin-aura-of-justice-11"]],
  ["paladin-warrior-holy-light", ["holy-light-power-faith-4","holy-light-power-faith-8","holy-light-power-faith-12","holy-light-power-faith-16","holy-light-power-faith-20","holy-light-shining-light-14"], ["paladin-spellcasting-4","paladin-aura-of-faith-14"]]
]) test(`${file} exposes its complete APG progression`, async () => {
  const paladin = await load("../packages/data/src/classes/paladin.json");
  const archetype = await load(`../packages/data/src/archetypes/${file}.json`);
  const ids = featuresThroughLevel(applyArchetype(paladin, archetype), 20).map((feature) => feature.id);
  for (const id of expected) assert.ok(ids.includes(id));
  for (const id of removed) assert.ok(!ids.includes(id));
});

test("Warrior of the Holy Light removes Paladin spellcasting", async () => {
  const paladin = await load("../packages/data/src/classes/paladin.json");
  const archetype = await load("../packages/data/src/archetypes/paladin-warrior-holy-light.json");
  assert.equal(applyArchetype(paladin, archetype).spellcasting, undefined);
});
