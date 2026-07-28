import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyArchetype } from "../packages/engine/src/index.js";

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

for (const [file, expected, removed] of [
  ["ranger-guide",["guide-rangers-focus-1","guide-terrain-bond-4","guide-rangers-luck-9","guide-inspired-moment-11","guide-improved-rangers-luck-16"],["ranger-favored-enemy-1","ranger-favored-enemy-20","ranger-hunters-bond-4","ranger-animal-companion-4","ranger-evasion-9","ranger-quarry-11","ranger-improved-evasion-16","ranger-improved-quarry-19"]],
  ["ranger-spirit-ranger",["spirit-ranger-spirit-bond-4","spirit-ranger-wisdom-spirits-12"],["ranger-hunters-bond-4","ranger-animal-companion-4","ranger-camouflage-12"]],
  ["ranger-urban-ranger",["urban-ranger-favored-community-3","urban-ranger-trapfinding-3","urban-ranger-push-through-7","urban-ranger-blend-in-12","urban-ranger-invisibility-trick-17"],["ranger-favored-terrain-3","ranger-favored-terrain-18","ranger-endurance-3","ranger-woodland-stride-7","ranger-camouflage-12","ranger-hide-in-plain-sight-17"]]
]) test(`${file} exposes its complete APG progression`, async () => {
  const ranger = await load("../packages/data/src/classes/ranger.json");
  const archetype = await load(`../packages/data/src/archetypes/${file}.json`);
  const applied = applyArchetype(ranger, archetype);
  const ids = applied.features.map((feature) => feature.id);
  for (const id of expected) assert.ok(ids.includes(id));
  for (const id of removed) assert.ok(!ids.includes(id));
  if (file === "ranger-urban-ranger") {
    assert.ok(applied.classSkills.includes("Disable Device"));
    assert.ok(!applied.classSkills.includes("Handle Animal"));
  }
});
