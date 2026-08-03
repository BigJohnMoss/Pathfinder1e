import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";

const directory = new URL("../packages/data/src/archetypes/", import.meta.url);
const arcanist = JSON.parse(await readFile(new URL("../packages/data/src/classes/arcanist.json", import.meta.url), "utf8"));
const elementalMasterElements = JSON.parse(await readFile(new URL("../packages/data/src/options/elemental-master-elements.json", import.meta.url), "utf8"));
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
  assert.ok(features.some((feature) => feature.id === "arcanist-blade-adept-exploit-5" && feature.optionGroupId === "blade-adept-exploits"));
  assert.deepEqual(features.filter((feature) => feature.optionGroupId === "blade-adept-exploits").map((feature) => feature.level), [5, 7, 11, 13, 15, 17, 19]);
});

test("Elemental Master requires one of four inherited elemental schools", () => {
  const elementalMaster = archetypes.find((archetype) => archetype.id === "arcanist-elemental-master");
  const applied = applyArchetype(arcanist, elementalMaster);
  const focus = applied.features.find((feature) => feature.id === "arcanist-elemental-master-elemental-focus-su-1");
  assert.equal(focus.type, "selectable");
  assert.equal(focus.choiceRequired, true);
  assert.equal(focus.optionGroupId, "elemental-master-elements");
  assert.equal(elementalMasterElements.inheritsOptionsFrom, "wizard-schools");
  assert.deepEqual(elementalMasterElements.inheritedOptionIds, [
    "wizard-school-air",
    "wizard-school-earth",
    "wizard-school-fire",
    "wizard-school-water",
  ]);
});
