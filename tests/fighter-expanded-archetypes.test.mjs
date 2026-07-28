import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";

const fighter = JSON.parse(await readFile(new URL("../packages/data/src/classes/fighter.json", import.meta.url), "utf8"));
const loadArchetype = async (name) => JSON.parse(await readFile(new URL(`../packages/data/src/archetypes/${name}.json`, import.meta.url), "utf8"));

test("Crossbowman replaces every declared Fighter milestone through level 20", async () => {
  const archetype = await loadArchetype("fighter-crossbowman");
  const applied = applyArchetype(fighter, archetype);
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  assert.equal(applied.name, "Fighter (Crossbowman)");
  assert.ok(ids.includes("crossbowman-deadshot-3"));
  assert.ok(ids.includes("crossbowman-penetrating-shot-19"));
  assert.ok(ids.includes("fighter-bonus-feat-20"));
  assert.ok(!ids.includes("armor-training-3"));
  assert.ok(!ids.includes("weapon-training-5"));
  assert.ok(!ids.includes("armor-mastery-19"));
  assert.match(applied.features.find((feature) => feature.id === "weapon-mastery-20").summary, /crossbow/);
});

test("Two-Handed Fighter retains restricted weapon training and replaces defensive milestones", async () => {
  const archetype = await loadArchetype("fighter-two-handed-fighter");
  const applied = applyArchetype(fighter, archetype);
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  assert.ok(ids.includes("two-handed-overhand-chop-3"));
  assert.ok(ids.includes("two-handed-devastating-blow-19"));
  assert.ok(ids.includes("weapon-training-17"));
  assert.ok(!ids.includes("bravery-2"));
  assert.ok(!ids.includes("armor-training-15"));
  assert.ok(!ids.includes("armor-mastery-19"));
  assert.match(applied.features.find((feature) => feature.id === "weapon-training-5").summary, /two-handed melee weapons/);
});

test("Two-Weapon Warrior replaces individual armor milestones without removing the rest of the chassis", async () => {
  const archetype = await loadArchetype("fighter-two-weapon-warrior");
  const applied = applyArchetype(fighter, archetype);
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  assert.ok(ids.includes("two-weapon-defensive-flurry-3"));
  assert.ok(ids.includes("two-weapon-perfect-balance-15"));
  assert.ok(ids.includes("two-weapon-deadly-defense-19"));
  assert.ok(ids.includes("bravery-18"));
  assert.ok(ids.includes("weapon-mastery-20"));
  assert.ok(!ids.includes("armor-training-3"));
  assert.ok(!ids.includes("weapon-training-17"));
  assert.ok(!ids.includes("armor-mastery-19"));
});

test("expanded Fighter archetypes use unique feature identifiers", async () => {
  const archetypes = await Promise.all([
    loadArchetype("fighter-crossbowman"),
    loadArchetype("fighter-two-handed-fighter"),
    loadArchetype("fighter-two-weapon-warrior")
  ]);
  const ids = archetypes.flatMap((archetype) => archetype.replacements.flatMap((replacement) => replacement.features.map((feature) => feature.id)));
  assert.equal(new Set(ids).size, ids.length);
});

test("Free Hand Fighter replaces all defensive and training progressions while retaining the capstone", async () => {
  const applied = applyArchetype(fighter, await loadArchetype("fighter-free-hand-fighter"));
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  assert.ok(ids.includes("free-hand-deceptive-strike-2"));
  assert.ok(ids.includes("free-hand-reversal-19"));
  assert.ok(ids.includes("weapon-mastery-20"));
  for (const removed of ["bravery-2", "armor-training-3", "weapon-training-5", "armor-mastery-19"]) assert.ok(!ids.includes(removed));
});

test("Mobile Fighter preserves early armor training and replaces its capstone", async () => {
  const applied = applyArchetype(fighter, await loadArchetype("fighter-mobile-fighter"));
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  assert.ok(ids.includes("armor-training-3"));
  assert.ok(ids.includes("armor-training-7"));
  assert.ok(ids.includes("mobile-rapid-attack-11"));
  assert.ok(ids.includes("mobile-whirlwind-blitz-20"));
  assert.ok(!ids.includes("weapon-training-5"));
  assert.ok(!ids.includes("weapon-mastery-20"));
});

test("Polearm Master replaces every declared milestone and restricts Weapon Mastery", async () => {
  const applied = applyArchetype(fighter, await loadArchetype("fighter-polearm-master"));
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  assert.ok(ids.includes("polearm-pole-fighting-2"));
  assert.ok(ids.includes("polearm-parry-19"));
  assert.ok(!ids.includes("bravery-18"));
  assert.ok(!ids.includes("armor-training-15"));
  assert.ok(!ids.includes("weapon-training-17"));
  assert.match(applied.features.find((feature) => feature.id === "weapon-mastery-20").summary, /spear or polearm/);
});

test("Weapon Master focuses all replaced progressions on one chosen weapon", async () => {
  const applied = applyArchetype(fighter, await loadArchetype("fighter-weapon-master"));
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  assert.ok(ids.includes("weapon-master-guard-2"));
  assert.ok(ids.includes("weapon-master-training-15"));
  assert.ok(ids.includes("weapon-master-unstoppable-strike-19"));
  assert.ok(ids.includes("weapon-mastery-20"));
  for (const removed of ["bravery-2", "armor-training-3", "weapon-training-5", "armor-mastery-19"]) assert.ok(!ids.includes(removed));
});

test("Phalanx Soldier replaces the shield-wall milestones and reaches Shielded Fortress", async () => {
  const applied = applyArchetype(fighter, await loadArchetype("fighter-phalanx-soldier"));
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  for (const added of ["phalanx-fighting-3", "phalanx-ready-pike-17", "phalanx-shield-ally-17", "phalanx-shielded-fortress-20"]) assert.ok(ids.includes(added));
  for (const removed of ["bravery-2", "armor-training-3", "weapon-training-5", "weapon-training-17", "weapon-mastery-20"]) assert.ok(!ids.includes(removed));
  assert.ok(ids.includes("armor-mastery-19"));
});

test("Roughrider replaces mounted progression milestones while retaining Weapon Mastery", async () => {
  const applied = applyArchetype(fighter, await loadArchetype("fighter-roughrider"));
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  for (const added of ["roughrider-armored-charger-3", "roughrider-mounted-mettle-17", "roughrider-ride-them-down-15", "roughrider-unavoidable-onslaught-15", "roughrider-indomitable-steed-19"]) assert.ok(ids.includes(added));
  assert.ok(ids.includes("weapon-mastery-20"));
  for (const removed of ["armor-training-15", "weapon-training-5", "armor-mastery-19"]) assert.ok(!ids.includes(removed));
});

test("Savage Warrior retains armor defenses and replaces only natural-weapon milestones", async () => {
  const applied = applyArchetype(fighter, await loadArchetype("fighter-savage-warrior"));
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  assert.ok(ids.includes("armor-training-3"));
  assert.ok(ids.includes("armor-mastery-19"));
  assert.ok(ids.includes("savage-natural-savagery-17"));
  assert.ok(ids.includes("savage-natural-mastery-20"));
  assert.ok(!ids.includes("weapon-training-5"));
  assert.ok(!ids.includes("weapon-mastery-20"));
});

test("Shielded Fighter replaces all armor, weapon-training, mastery, and capstone milestones", async () => {
  const applied = applyArchetype(fighter, await loadArchetype("fighter-shielded-fighter"));
  const ids = featuresThroughLevel(applied, 20).map((feature) => feature.id);
  for (const added of ["shielded-active-defense-3", "shielded-shield-buffet-13", "shielded-shield-guard-17", "shielded-shield-mastery-19", "shielded-shield-ward-20"]) assert.ok(ids.includes(added));
  for (const removed of ["armor-training-3", "weapon-training-5", "armor-mastery-19", "weapon-mastery-20"]) assert.ok(!ids.includes(removed));
  assert.ok(ids.includes("bravery-18"));
});

test("the generated APG Fighter archetype catalogue contains all twelve published paths", async () => {
  const expected = [
    "fighter-archer", "fighter-crossbowman", "fighter-free-hand-fighter", "fighter-mobile-fighter",
    "fighter-phalanx-soldier", "fighter-polearm-master", "fighter-roughrider", "fighter-savage-warrior",
    "fighter-shielded-fighter", "fighter-two-handed-fighter", "fighter-two-weapon-warrior", "fighter-weapon-master"
  ];
  const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
  assert.deepEqual(bundle.archetypes.filter((archetype) => archetype.classId === "fighter").map((archetype) => archetype.id).sort(), expected.sort());
});
