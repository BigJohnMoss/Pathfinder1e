import assert from "node:assert/strict";
import test from "node:test";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeCompanionEffectiveLevel, inferArchetypeCompanionGrants, resolvedArchetypeCompanionGrants } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const characterClass = (id) => data.classes.find((item) => item.id === id);

test("infers only direct companion grants missing structured catalogue records", () => {
  const inferred = archetypes.flatMap((item) => inferArchetypeCompanionGrants(item).map((grant) => [item.id, grant]));
  assert.deepEqual(inferred.map(([id]) => id), [
    "gunslinger-buccaneer",
    "magus-beastblade",
    "magus-nature-bonded-magus",
    "shaman-draconic-shaman",
  ]);
  assert.deepEqual(inferred.map(([, grant]) => [grant.kind, grant.minimumLevel]), [
    ["familiar", 5],
    ["familiar", 3],
    ["familiar", 1],
    ["drake", 4],
  ]);
});

test("Buccaneer's exotic pet is a bounded half-level raven familiar", () => {
  const [grant] = inferArchetypeCompanionGrants(archetype("gunslinger-buccaneer"));
  assert.equal(grant.optionId, "wizard-familiar-raven");
  assert.equal(grant.effectiveLevelMultiplier, 0.5);
  assert.deepEqual([5, 10, 20].map((level) => archetypeCompanionEffectiveLevel(grant, level)), [2, 5, 10]);
  assert.deepEqual(applyArchetype(characterClass("gunslinger"), archetype("gunslinger-buccaneer")).companionGrants, [grant]);
});

test("explicit companion grants remain authoritative and are not duplicated", () => {
  const duettist = archetype("bard-duettist");
  assert.deepEqual(inferArchetypeCompanionGrants(duettist), []);
  assert.equal(resolvedArchetypeCompanionGrants(duettist), duettist.companionGrants);
});

test("companion effective levels preserve adjustments and character-level progression", () => {
  assert.equal(archetypeCompanionEffectiveLevel({ effectiveLevelAdjustment: -3 }, 8), 5);
  assert.equal(archetypeCompanionEffectiveLevel({ usesCharacterLevel: true }, 2, 9), 9);
  assert.equal(archetypeCompanionEffectiveLevel({ effectiveLevelMultiplier: 0.5, effectiveLevelAdjustment: -2 }, 3), 1);
});
