import assert from "node:assert/strict";
import test from "node:test";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, inferArchetypeResourceDamageActions } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const characterClass = (id) => data.classes.find((item) => item.id === id);

test("resource-damage inference preserves published dice and save progressions", () => {
  const voidChannel = inferArchetypeResourceDamageActions(archetype("medium-voice-of-the-void"))[0].action;
  assert.deepEqual(voidChannel.combatRoll.damage.diceCountByLevel.slice(0, 3), [
    { level: 3, count: 1 },
    { level: 5, count: 2 },
    { level: 7, count: 3 },
  ]);
  assert.equal(voidChannel.savingThrow.ability, "charisma");
  assert.deepEqual(voidChannel.combatRoll.targetSave, { modifier: "will", outcome: "half-damage" });
  assert.equal(voidChannel.combatRoll.riders[0].maximumTargetHitDiceDivisor, 2);

  const breath = inferArchetypeResourceDamageActions(archetype("skald-wyrm-singer"))[0].action;
  assert.equal(breath.combatRoll.damage.diceCountByLevel[0].count, 6);
  assert.deepEqual(breath.modes.map(({ id }) => id), ["acid", "cold", "electricity", "fire"]);
  assert.deepEqual(breath.recipients.map(({ id }) => id), ["self", "ally"]);
  assert.equal(breath.combatRoll.confirmations[0].requiredForActivation, true);
});

test("melee-touch damage uses a level-scaled flat modifier", () => {
  const action = inferArchetypeResourceDamageActions(archetype("mesmerist-vox"))[0].action;
  assert.equal(action.combatRoll.attack.kind, "melee-touch");
  assert.deepEqual(action.combatRoll.damage.flatModifierByLevel.slice(0, 3), [
    { level: 3, modifier: 3 },
    { level: 4, modifier: 4 },
    { level: 5, modifier: 5 },
  ]);
  assert.equal(action.combatRoll.targetSave.requiredConfirmationId, "compelling-voice");
  assert.equal(action.combatRoll.riders[0].duration.rounds, 1);
});

test("fully represented damage actions leave the manual queue", () => {
  assert.equal(archetypeAutomationSummary(archetype("medium-voice-of-the-void"), data.feats, data.spells).manual.includes("Void Channeler (Su) (level 3)"), false);
  assert.equal(archetypeAutomationSummary(archetype("skald-wyrm-singer"), data.feats, data.spells).manual.includes("Breath Weapon (Su) (level 12)"), false);
  assert.equal(archetypeAutomationSummary(archetype("mesmerist-vox"), data.feats, data.spells).manual.includes("Wounding Words (Su) (level 3)"), true);
});

test("core-resource damage actions spend Fervor and scale their areas", () => {
  const action = inferArchetypeResourceDamageActions(archetype("warpriest-proclaimer"))[0].action;
  assert.equal(action.resourceId, "fervor");
  assert.deepEqual(action.combatRoll.rangeByLevel, [
    { level: 2, range: "5-foot burst" },
    { level: 7, range: "10-foot burst" },
    { level: 13, range: "15-foot burst" },
    { level: 19, range: "20-foot burst" },
  ]);
});

test("Demonic Channel spends its replacement pool and preserves alignment riders", () => {
  const actions = inferArchetypeResourceDamageActions(archetype("cleric-demonic-apostle")).map((entry) => entry.action);
  const action = actions[0];
  assert.equal(action.resourceId, "demonicChannel");
  assert.deepEqual(action.actionTypeByLevel, [{ level: 1, actionType: "standard" }]);
  assert.deepEqual(action.combatRoll.damage.diceCountByLevel.slice(0, 3), [
    { level: 1, count: 1 },
    { level: 3, count: 2 },
    { level: 5, count: 3 },
  ]);
  assert.equal(action.combatRoll.targetSave.conditionalModifiers[0].modifier, -2);
  assert.equal(action.combatRoll.riders[0].minimumLevel, 9);
  assert.equal(actions[1].minimumLevel, 5);
  assert.deepEqual(actions[1].activeEffect.targets, ["allies"]);
  assert.equal(actions[1].activeEffect.defaultRounds, 1);
  assert.equal(archetypeAutomationSummary(archetype("cleric-demonic-apostle"), data.feats, data.spells).manual.includes("Demonic Channel (Su) (level 1)"), false);
});

test("applied archetypes replace generic buttons with calculated damage actions", () => {
  const applied = applyArchetype(characterClass("medium"), archetype("medium-voice-of-the-void"), data.classes, data.spells);
  const feature = applied.features.find((entry) => entry.id === "medium-voice-of-the-void-void-channeler-su-3");
  assert.deepEqual(feature.resourceActions.map(({ label }) => label), ["Use Void Channeler"]);
  assert.ok(feature.resourceActions[0].combatRoll);
});

test("catalogue inference remains bounded and excludes choice containers", () => {
  const actions = archetypes.flatMap((entry) => inferArchetypeResourceDamageActions(entry));
  assert.equal(actions.length, 7);
  assert.equal(new Set(actions.map(({ action }) => action.id)).size, actions.length);
  assert.ok(actions.every(({ action }) =>
    action.resourceId && (action.combatRoll?.damage?.diceCountByLevel?.length || action.activeEffect),
  ));
  assert.equal(actions.some(({ sourceFeatureId }) => /(?:discoveries|revelations|deeds)/i.test(sourceFeatureId)), false);
});
