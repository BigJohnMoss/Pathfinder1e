import assert from "node:assert/strict";
import test from "node:test";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, inferArchetypeSaveEffectActions } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const characterClass = (id) => data.classes.find((item) => item.id === id);

test("save-effect inference resolves level-scaled fear and target immunity", () => {
  const action = inferArchetypeSaveEffectActions(archetype("cavalier-fell-rider"))[0].action;
  assert.deepEqual(action.savingThrow, { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "cavalier" });
  assert.deepEqual(action.targetEffectRoll.effectsByLevel[0].duration, { kind: "level-rounds" });
  assert.equal(action.targetEffectRoll.targetHitDiceUpgrade.name, "Frightened");
  assert.equal(action.targetEffectRoll.successEffect.rounds, 999);
});

test("daily-use save effects receive a calculated resource and immunity bypass", () => {
  const action = inferArchetypeSaveEffectActions(archetype("cavalier-ghost-rider"))[0].action;
  assert.equal(action.resourceId, "archetype-cavalier-ghost-rider-frightful-gaze-su-1");
  assert.equal(action.targetEffectRoll.effectsByLevel[0].name, "Paralyzed");
  assert.equal(action.targetEffectRoll.bypassesImmunitiesAtLevel, 9);
});

test("save-after-condition wording exposes action cost and activation requirements", () => {
  const action = inferArchetypeSaveEffectActions(archetype("swashbuckler-dashing-thief"))[0].action;
  assert.equal(action.resourceId, "panache");
  assert.deepEqual(action.actionTypeByLevel, [{ level: 3, actionType: "free" }]);
  assert.deepEqual(action.confirmations.map((item) => item.id), ["successful-feint", "eligible-target"]);
  assert.equal(action.targetEffectRoll.effectsByLevel[0].name, "Dazed");
  assert.deepEqual(action.targetEffectRoll.effectsByLevel[0].duration, { kind: "fixed-rounds", rounds: 1 });
  assert.equal(action.targetEffectRoll.failureEffect.rounds, 999);
});

test("applied archetypes expose save-effect controls and leave trigger-only effects manual", () => {
  const fellRider = applyArchetype(characterClass("cavalier"), archetype("cavalier-fell-rider"), data.classes, data.spells);
  assert.ok(fellRider.features.find((feature) => feature.id === "cavalier-fell-rider-terror-ex-14").resourceActions[0].targetEffectRoll);
  assert.equal(inferArchetypeSaveEffectActions(archetype("magus-sorrowblade")).length, 0);
  assert.equal(inferArchetypeSaveEffectActions(archetype("alchemist-plague-bringer")).length, 0);
});

test("fully represented save effects leave the manual queue", () => {
  assert.equal(archetypeAutomationSummary(archetype("cavalier-fell-rider"), data.feats, data.spells).manual.includes("Terror (Ex) (level 14)"), false);
  assert.equal(archetypeAutomationSummary(archetype("cavalier-ghost-rider"), data.feats, data.spells).manual.includes("Frightful Gaze (Su) (level 1)"), false);
  assert.equal(archetypeAutomationSummary(archetype("swashbuckler-dashing-thief"), data.feats, data.spells).manual.includes("Dazing Charm Deed (Ex) (level 3)"), false);
});

test("catalogue inference stays bounded to direct resolved actions", () => {
  const actions = archetypes.flatMap((entry) => inferArchetypeSaveEffectActions(entry));
  assert.equal(actions.length, 3);
  assert.ok(actions.every(({ action }) => action.savingThrow && action.targetEffectRoll?.effectsByLevel.length));
});
