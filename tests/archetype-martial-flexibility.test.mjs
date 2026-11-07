import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  applyArchetypeResourceAdjustments,
  archetypeAutomationSummary,
  inferArchetypeMartialFlexibilityActions,
  resolvedArchetypeResourceAdjustments,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((candidate) => candidate.id === id);
const characterClass = (id) => data.classes.find((candidate) => candidate.id === id);

test("Martial Flexibility archetypes receive exact catalogue actions and resource progressions", () => {
  for (const [archetypeId, classId, minimumLevel, expectedModes] of [
    ["fighter-martial-master", "fighter", 5, 9],
    ["oracle-warsighted", "oracle", 1, 8],
    ["fighter-varisian-free-style-fighter", "fighter", 1, 9],
    ["sorcerer-eldritch-scrapper", "sorcerer", 1, 6],
  ]) {
    const source = archetype(archetypeId);
    const inferred = inferArchetypeMartialFlexibilityActions(source);
    assert.equal(inferred.length, 1, archetypeId);
    const action = inferred[0].action;
    assert.equal(action.classId, classId);
    assert.equal(action.minimumLevel, minimumLevel);
    assert.equal(action.costPerSelectedFeat, true);
    assert.equal(action.featSelection.source, "catalogue");
    assert.equal(action.featSelection.featType, "combat");
    assert.equal(action.modes.length, expectedModes);
    assert.equal(action.activeEffect.defaultRounds, 10);
    const resource = resolvedArchetypeResourceAdjustments(source).find((candidate) => candidate.resourceId === action.resourceId);
    assert.ok(resource, `${archetypeId} resource`);
    assert.equal(applyArchetypeResourceAdjustments({}, [source], 20)[action.resourceId], 13);
    const applied = applyArchetype(characterClass(classId), source, data.classes, data.spells);
    assert.ok(applied.features.some((feature) => feature.resourceActions?.some((candidate) => candidate.id === action.id)));
    assert.equal(archetypeAutomationSummary(source, data.feats, data.spells).manual.some((entry) => entry.startsWith("Martial Flexibility")), false);
  }
});

test("Martial Flexibility profiles preserve each published action milestone", () => {
  const martialMaster = inferArchetypeMartialFlexibilityActions(archetype("fighter-martial-master"))[0].action;
  assert.deepEqual(martialMaster.modes.map(({ id, featCount, actionType, minimumLevel, maximumLevel, variableFeatCount }) => ({ id, featCount, actionType, minimumLevel, maximumLevel, variableFeatCount })), [
    { id: "one-move", featCount: 1, actionType: "move", minimumLevel: 5, maximumLevel: 8, variableFeatCount: undefined },
    { id: "one-swift", featCount: 1, actionType: "swift", minimumLevel: 9, maximumLevel: 13, variableFeatCount: undefined },
    { id: "two-move", featCount: 2, actionType: "move", minimumLevel: 9, maximumLevel: 13, variableFeatCount: undefined },
    { id: "one-free", featCount: 1, actionType: "free", minimumLevel: 14, maximumLevel: 16, variableFeatCount: undefined },
    { id: "two-swift", featCount: 2, actionType: "swift", minimumLevel: 14, maximumLevel: 19, variableFeatCount: undefined },
    { id: "three-move", featCount: 3, actionType: "move", minimumLevel: 14, maximumLevel: 16, variableFeatCount: undefined },
    { id: "one-immediate", featCount: 1, actionType: "immediate", minimumLevel: 17, maximumLevel: 19, variableFeatCount: undefined },
    { id: "three-swift", featCount: 3, actionType: "swift", minimumLevel: 17, maximumLevel: 19, variableFeatCount: undefined },
    { id: "any-swift", featCount: 1, actionType: "swift", minimumLevel: 20, maximumLevel: undefined, variableFeatCount: true },
  ]);
  const scrapper = inferArchetypeMartialFlexibilityActions(archetype("sorcerer-eldritch-scrapper"))[0].action;
  assert.deepEqual(scrapper.featSelection.additionalFeatIds, ["arcane-strike", "combat-casting"]);
});

test("temporary granted feat identifiers remain bounded during save normalization", async () => {
  const { normalizeCharacterDraft } = await import("../packages/engine/src/index.js");
  const draft = normalizeCharacterDraft({
    name: "Flexible",
    classId: "fighter",
    level: 9,
    baseAbilities: { strength: 13, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    activeEffects: [{
      id: "martial-flexibility",
      name: "Martial Flexibility",
      target: "self",
      bonus: 0,
      roundsRemaining: 10,
      description: "Temporary feats.",
      grantedFeatIds: ["power-attack", "cleave", "BAD ID", "power-attack"],
    }],
  });
  assert.deepEqual(draft.activeEffects[0].grantedFeatIds, ["power-attack", "cleave"]);
});
