import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyArchetype } from "../packages/engine/src/index.js";

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const rogue = await load("../packages/data/src/classes/rogue.json");

test("Core Rogue includes the complete Trap Sense progression", () => {
  assert.deepEqual(rogue.features.filter((feature) => feature.progressionKey === "rogue-trap-sense").map((feature) => feature.level), [3,6,9,12,15,18]);
});

for (const [file, expected, replacesTrapSense] of [
  ["rogue-acrobat",["acrobat-expert-acrobat-1","acrobat-second-chance-3"],true],
  ["rogue-cutpurse",["cutpurse-measure-mark-1","cutpurse-stab-grab-3"],true],
  ["rogue-investigator",["investigator-follow-up-1"],false],
  ["rogue-poisoner",["poisoner-poison-use-1","poisoner-master-poisoner-3"],true],
  ["rogue-rake",["rake-bravados-blade-1","rake-smile-3"],true],
  ["rogue-sniper",["sniper-accuracy-1","sniper-deadly-range-3"],true],
  ["rogue-spy",["spy-skilled-liar-1","spy-poison-use-3"],true],
  ["rogue-swashbuckler",["swashbuckler-martial-training-1","swashbuckler-daring-3"],true],
  ["rogue-thug",["thug-frightening-1","thug-brutal-beating-3"],true]
]) test(`${file} exposes its APG replacements`, async () => {
  const archetype = await load(`../packages/data/src/archetypes/${file}.json`);
  const ids = applyArchetype(rogue, archetype).features.map((feature) => feature.id);
  for (const id of expected) assert.ok(ids.includes(id));
  assert.ok(!ids.includes("trapfinding-1"));
  assert.equal(ids.includes("rogue-trap-sense-3"), !replacesTrapSense);
});
