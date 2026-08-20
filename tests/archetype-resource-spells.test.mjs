import assert from "node:assert/strict";
import test from "node:test";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  archetypeAutomationSummary,
  inferArchetypeResourceSpellActions,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const characterClass = (id) => data.classes.find((item) => item.id === id);

test("resource-powered spell actions use the character's existing class pool", () => {
  const bloodSleuth = inferArchetypeResourceSpellActions(archetype("investigator-profiler"));
  assert.deepEqual(bloodSleuth.map(({ action }) => [action.label, action.resourceId, action.cost, action.minimumLevel]), [
    ["Cast discern next of kin", "inspiration", 1, 4],
    ["Cast blood biography", "inspiration", 2, 4],
  ]);
  assert.ok(!archetypeAutomationSummary(archetype("investigator-profiler"), data.feats, data.spells).manual.includes("Blood Sleuth (Sp) (level 4)"));
});

test("tiered performance spells retain their published levels and shared cost", () => {
  const actions = inferArchetypeResourceSpellActions(archetype("bard-arcane-healer"));
  assert.deepEqual(actions.map(({ action }) => [action.spellLikeAbility.spellName, action.minimumLevel, action.resourceId, action.cost]), [
    ["cure light wounds", 5, "bardicPerformance", 2],
    ["cure moderate wounds", 11, "bardicPerformance", 2],
    ["cure serious wounds", 17, "bardicPerformance", 2],
  ]);
});

test("ki-powered spell equivalents preserve activation, duration, and prerequisites", () => {
  const grayDisciple = inferArchetypeResourceSpellActions(archetype("monk-gray-disciple")).map(({ action }) => action);
  assert.deepEqual(grayDisciple.map((action) => action.spellLikeAbility.spellName), ["invisibility", "enlarge person", "darkness"]);
  assert.deepEqual(grayDisciple[0].actionTypeByLevel, [{ level: 4, actionType: "swift" }]);
  assert.equal(grayDisciple[0].activeEffect.defaultRounds, 1);
  assert.equal(grayDisciple[0].confirmations[0].requiredForActivation, true);
  assert.equal(grayDisciple[2].activeEffect.defaultRoundsByLevel.at(-1).rounds, 20);
  assert.ok(!archetypeAutomationSummary(archetype("monk-gray-disciple"), data.feats, data.spells).manual.includes("Fade from Sight (Sp) (level 4)"));

  const ironBody = inferArchetypeResourceSpellActions(archetype("monk-tetori"))[0].action;
  assert.deepEqual([ironBody.resourceId, ironBody.cost, ironBody.actionTypeByLevel[0].actionType, ironBody.activeEffect.defaultRounds], ["kiPool", 3, "move", 10]);
  const freedom = inferArchetypeResourceSpellActions(archetype("monk-treetop-monk"))[0].action;
  assert.deepEqual([freedom.cost, freedom.actionTypeByLevel[0].actionType, freedom.activeEffect.defaultRounds], [1, "swift", 1]);
});

test("applied archetypes expose resource-powered spells instead of generic use buttons", () => {
  const applied = applyArchetype(characterClass("investigator"), archetype("investigator-profiler"), data.classes, data.spells);
  const feature = applied.features.find((entry) => entry.id === "investigator-profiler-blood-sleuth-sp-4");
  assert.deepEqual(feature.resourceActions.map((action) => action.label), ["Cast discern next of kin", "Cast blood biography"]);
});

test("adjacent spell-equivalent rules retain their activation, saves, and triggers", () => {
  const honeSoul = inferArchetypeResourceSpellActions(archetype("monk-disciple-of-wholeness"))[0].action;
  assert.deepEqual([
    honeSoul.label,
    honeSoul.spellLikeAbility.spellName,
    honeSoul.spellLikeAbility.kind,
    honeSoul.resourceId,
    honeSoul.cost,
    honeSoul.actionTypeByLevel[0].actionType,
  ], ["Use Hone Soul (greater dispel magic)", "greater dispel magic", "spell-equivalent", "kiPool", 1, "standard"]);
  assert.equal(archetypeAutomationSummary(archetype("monk-disciple-of-wholeness"), data.feats, data.spells).manual.includes("Hone Soul (Su) (level 13)"), false);

  const counterCurse = inferArchetypeResourceSpellActions(archetype("magus-hexbreaker")).find(({ sourceFeatureId }) => sourceFeatureId.endsWith("counter-curse-su-11")).action;
  assert.equal(counterCurse.spellLikeAbility.spellName, "spell turning");
  assert.equal(counterCurse.confirmations[0].requiredForActivation, true);
  assert.match(counterCurse.confirmations[0].label, /successfully dispels a curse/i);
  assert.equal(archetypeAutomationSummary(archetype("magus-hexbreaker"), data.feats, data.spells).manual.includes("Counter Curse (Su) (level 11)"), false);

  const koan = inferArchetypeResourceSpellActions(archetype("monk-brazen-disciple"))[0].action;
  assert.deepEqual([koan.spellLikeAbility.spellName, koan.savingThrow.base, koan.savingThrow.levelDivisor, koan.savingThrow.ability], ["confusion", 10, 2, "wisdom"]);
  assert.equal(archetypeAutomationSummary(archetype("monk-brazen-disciple"), data.feats, data.spells).manual.includes("Confounding Koan (Sp) (level 12)"), false);
});

test("resource-powered transport exposes its per-creature variable cost", () => {
  const planarGuide = inferArchetypeResourceSpellActions(archetype("monk-elemental-monk"))[0].action;
  assert.deepEqual(planarGuide.variableCost, { label: "Ki points (including additional creatures)", minimum: 1, maximum: 8 });
  assert.equal(planarGuide.spellLikeAbility.spellName, "plane shift");
  assert.equal(archetypeAutomationSummary(archetype("monk-elemental-monk"), data.feats, data.spells).manual.includes("Planar Guide (Sp) (level 14)"), false);
});

test("catalogue inference remains concrete, bounded, and excludes container features", () => {
  const actions = archetypes.flatMap((entry) => inferArchetypeResourceSpellActions(entry));
  assert.ok(actions.length >= 24, `expected the expanded resource-spell batch, received ${actions.length}`);
  assert.ok(actions.every(({ action }) => action.resourceId && action.cost >= 1 && action.minimumLevel >= 1 && action.minimumLevel <= 20));
  assert.ok(actions.every(({ action }) => !/\b(?:ability|action|casts?|effect|when|whenever)\b/i.test(action.spellLikeAbility.spellName) && !/^(?:a )?spell$/i.test(action.spellLikeAbility.spellName)));
  assert.equal(actions.some(({ sourceFeatureId }) => /(?:forbidden-powers|special)-/i.test(sourceFeatureId)), false);
});
