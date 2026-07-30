import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";

const directory = new URL("../packages/data/src/archetypes/", import.meta.url);
const arcanist = JSON.parse(await readFile(new URL("../packages/data/src/classes/arcanist.json", import.meta.url), "utf8"));
const archetypes = await Promise.all((await readdir(directory))
  .filter((name) => name.startsWith("arcanist-") && name.endsWith(".json"))
  .map(async (name) => JSON.parse(await readFile(new URL(name, directory), "utf8"))));

test("all published Arcanist archetypes have sourced replacement progressions", () => {
  assert.equal(archetypes.length, 15);
  assert.ok(archetypes.every((archetype) =>
    archetype.source.url.includes("ArchetypeDisplay.aspx") &&
    archetype.replacesText &&
    archetype.replacements.every((replacement) => replacement.featureIds.length && replacement.features.length)
  ));
  const featureIds = archetypes.flatMap((archetype) =>
    archetype.replacements.flatMap((replacement) => replacement.features.map((feature) => feature.id))
  );
  assert.equal(new Set(featureIds).size, featureIds.length);
});

test("Blade Adept replaces the correct exploit levels and exposes its complete rules", () => {
  const bladeAdept = archetypes.find((archetype) => archetype.id === "arcanist-blade-adept");
  const applied = applyArchetype(arcanist, bladeAdept);
  const features = featuresThroughLevel(applied, 20);
  assert.ok(features.some((feature) => feature.name === "Sword Bond (Su)" && /one-handed piercing or slashing/.test(feature.summary)));
  assert.ok(features.some((feature) => feature.name === "Sentient Sword (Su)" && /black blade/.test(feature.summary)));
  for (const id of ["arcanist-exploit-1", "arcanist-exploit-3", "arcanist-exploit-9"]) {
    assert.ok(!features.some((feature) => feature.id === id));
  }
  assert.ok(features.some((feature) => feature.id === "arcanist-exploit-5"));
});
