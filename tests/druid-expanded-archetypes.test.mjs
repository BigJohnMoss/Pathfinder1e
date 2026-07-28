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

for (const [file, expected, removed] of [
  ["druid-desert", ["desert-druid-native-2", "desert-druid-sandwalker-3", "desert-druid-endurance-4", "desert-druid-shaded-vision-9", "desert-druid-dunemeld-13"], ["druid-woodland-stride-2", "druid-trackless-step-3", "druid-resist-natures-lure-4", "druid-venom-immunity-9", "druid-thousand-faces-13"]],
  ["druid-jungle", ["jungle-druid-guardian-2", "jungle-druid-woodland-stride-3", "jungle-druid-torrid-endurance-4", "jungle-druid-verdant-sentinel-13"], ["druid-woodland-stride-2", "druid-trackless-step-3", "druid-resist-natures-lure-4", "druid-thousand-faces-13"]]
]) test(`${file} shifts its retained Wild Shape progression by two levels`, async () => {
  const druid = await load("../packages/data/src/classes/druid.json");
  const archetype = await load(`../packages/data/src/archetypes/${file}.json`);
  const applied = applyArchetype(druid, archetype);
  const features = featuresThroughLevel(applied, 20);
  const ids = features.map((feature) => feature.id);
  for (const id of expected) assert.ok(ids.includes(id));
  for (const id of removed) assert.ok(!ids.includes(id));
  assert.deepEqual(features.filter((feature) => feature.progressionKey === "druid-wild-shape").map((feature) => feature.level), [6,8,10,12,14,16,18,20]);
  assert.equal(druidWildShapeUses(18), 8);
});

for (const [file, expected, removed] of [
  ["druid-mountain", ["mountain-druid-mountaineer-2", "mountain-druid-sure-footed-3", "mountain-druid-spire-walker-4", "mountain-druid-stance-9", "mountain-druid-stone-13"], ["druid-woodland-stride-2", "druid-trackless-step-3", "druid-resist-natures-lure-4", "druid-venom-immunity-9", "druid-thousand-faces-13"]],
  ["druid-plains", ["plains-druid-traveler-2", "plains-druid-run-like-wind-3", "plains-druid-savanna-ambush-4", "plains-druid-canny-charger-9", "plains-druid-evasion-13"], ["druid-woodland-stride-2", "druid-trackless-step-3", "druid-resist-natures-lure-4", "druid-venom-immunity-9", "druid-thousand-faces-13"]],
  ["druid-swamp", ["swamp-druid-marshwight-2", "swamp-druid-strider-3", "swamp-druid-pond-scum-4", "swamp-druid-slippery-13"], ["druid-woodland-stride-2", "druid-trackless-step-3", "druid-resist-natures-lure-4", "druid-thousand-faces-13"]]
]) test(`${file} exposes its complete terrain progression through level 20`, async () => {
  const druid = await load("../packages/data/src/classes/druid.json");
  const archetype = await load(`../packages/data/src/archetypes/${file}.json`);
  const features = featuresThroughLevel(applyArchetype(druid, archetype), 20);
  const ids = features.map((feature) => feature.id);
  for (const id of expected) assert.ok(ids.includes(id));
  for (const id of removed) assert.ok(!ids.includes(id));
  assert.deepEqual(features.filter((feature) => feature.progressionKey === "druid-wild-shape").map((feature) => feature.level), [6,8,10,12,14,16,18,20]);
});

test("Cave Druid changes class skills, domains, empathy, and Wild Shape forms", async () => {
  const druid = await load("../packages/data/src/classes/druid.json");
  const archetype = await load("../packages/data/src/archetypes/druid-cave.json");
  const applied = applyArchetype(druid, archetype);
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  for (const id of ["cave-druid-cavesense-1", "cave-druid-tunnelrunner-2", "cave-druid-lightfoot-3", "cave-druid-resist-corruption-4"]) assert.ok(ids.includes(id));
  for (const id of ["druid-nature-sense-1", "druid-woodland-stride-2", "druid-trackless-step-3", "druid-resist-natures-lure-4"]) assert.ok(!ids.includes(id));
  assert.ok(applied.classSkills.includes("Knowledge (dungeoneering)"));
  assert.ok(!applied.classSkills.includes("Knowledge (geography)"));
  assert.ok(applied.druidDomainIds.includes("domain-darkness"));
  assert.ok(!applied.druidDomainIds.includes("domain-air"));
  assert.match(applied.features.find((feature) => feature.id === "druid-wild-empathy-1").summary, /oozes/);
});

test("Blight Druid exposes its corrupted bond, restricted familiar, and disease progression", async () => {
  const druid = await load("../packages/data/src/classes/druid.json");
  const archetype = await load("../packages/data/src/archetypes/druid-blight.json");
  const applied = applyArchetype(druid, archetype);
  const features = featuresThroughLevel(applied, 20);
  const ids = features.map((feature) => feature.id);
  for (const id of ["druid-nature-bond-1", "blight-druid-familiar-1", "blight-druid-miasma-5", "blight-druid-blightblooded-9", "blight-druid-plaguebearer-13"]) assert.ok(ids.includes(id));
  for (const id of ["druid-animal-companion-1", "druid-trackless-step-3", "druid-resist-natures-lure-4", "druid-venom-immunity-9", "druid-thousand-faces-13"]) assert.ok(!ids.includes(id));
  assert.deepEqual(features.find((feature) => feature.id === "blight-druid-familiar-1"), {
    id: "blight-druid-familiar-1",
    name: "Blight Familiar",
    level: 1,
    type: "selectable",
    summary: "If Familiar was chosen for Blighted Nature Bond, choose its form.",
    choiceRequired: true,
    optionGroupId: "blight-druid-familiars",
    requiredOptionId: "blight-druid-nature-bond-familiar",
    requiredOptionMessage: "Choose the Familiar nature bond first"
  });
  for (const id of ["domain-darkness", "domain-death", "domain-destruction"]) assert.ok(applied.druidDomainIds.includes(id));
  assert.match(applied.features.find((feature) => feature.id === "druid-wild-empathy-1").summary, /vermin/);
});

test("Urban Druid restricts Nature Bond and delays Wild Shape by four levels", async () => {
  const druid = await load("../packages/data/src/classes/druid.json");
  const archetype = await load("../packages/data/src/archetypes/druid-urban.json");
  const applied = applyArchetype(druid, archetype);
  const features = featuresThroughLevel(applied, 20);
  const ids = features.map((feature) => feature.id);
  for (const id of ["druid-nature-bond-1", "urban-druid-spontaneous-casting-1", "urban-druid-lorekeeper-2", "urban-druid-resist-temptation-4", "urban-druid-thousand-faces-6", "urban-druid-mental-strength-9"]) assert.ok(ids.includes(id));
  for (const id of ["druid-animal-companion-1", "druid-spontaneous-casting-1", "druid-woodland-stride-2", "druid-trackless-step-3", "druid-resist-natures-lure-4", "druid-venom-immunity-9", "druid-thousand-faces-13"]) assert.ok(!ids.includes(id));
  assert.deepEqual(features.filter((feature) => feature.progressionKey === "druid-wild-shape").map((feature) => feature.level), [8,10,12,14,16,18,20]);
  assert.equal(applied.wildShapeLevelAdjustment, -4);
  assert.equal(druidWildShapeUses(20 + applied.wildShapeLevelAdjustment), 7);
  for (const skill of ["Diplomacy", "Knowledge (history)", "Knowledge (local)", "Knowledge (nobility)"]) assert.ok(applied.classSkills.includes(skill));
  assert.deepEqual(applied.druidDomainIds, ["domain-charm","domain-community","domain-knowledge","domain-nobility","domain-protection","domain-repose","domain-rune","domain-weather"]);
});
