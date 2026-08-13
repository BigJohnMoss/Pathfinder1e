import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import spells from "../generated/pf1e-spells.mjs";
import { applyArchetype, applyArchetypeResourceAdjustments, archetypeAutomationSummary, inferArchetypeSpellLikeAbilityActions } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);

test("fixed spell-like abilities become cast actions with the published cadence", () => {
  const greenFaith = inferArchetypeSpellLikeAbilityActions(archetype("druid-green-faith-initiate"));
  assert.deepEqual(greenFaith.map(({ action }) => [action.spellLikeAbility.spellName, action.spellLikeAbility.cadence, action.minimumLevel]), [
    ["whispering wind", "day", 6],
    ["legend lore", "week", 10],
  ]);
  const atWill = inferArchetypeSpellLikeAbilityActions(archetype("alchemist-blazing-torchbearer"))[0].action;
  assert.equal(atWill.label, "Cast spark");
  assert.equal(atWill.resourceId, undefined);
});

test("innate (Sp) features without redundant spell-like wording become bounded cast actions", () => {
  const reincarnate = inferArchetypeSpellLikeAbilityActions(archetype("druid-restorer"))[0].action;
  assert.equal(reincarnate.label, "Cast reincarnate");
  assert.equal(reincarnate.minimumLevel, 13);
  assert.equal(applyArchetypeResourceAdjustments({}, [archetype("druid-restorer")], 13)[reincarnate.resourceId], 1);

  const invisibility = inferArchetypeSpellLikeAbilityActions(archetype("slayer-stygian-slayer"))[0].action;
  assert.equal(invisibility.label, "Cast invisibility");
  assert.equal(applyArchetypeResourceAdjustments({}, [archetype("slayer-stygian-slayer")], 4)[invisibility.resourceId], 1);
  assert.equal(applyArchetypeResourceAdjustments({}, [archetype("slayer-stygian-slayer")], 20)[invisibility.resourceId], 5);

  assert.deepEqual(inferArchetypeSpellLikeAbilityActions(archetype("inquisitor-exarch")).map(({ action }) => [action.label, action.resourceId]), [
    ["Cast detect chaos", undefined],
  ]);
  const weekly = inferArchetypeSpellLikeAbilityActions(archetype("inquisitor-green-faith-marshal"))[0].action;
  assert.equal(weekly.label, "Cast commune with nature");
  assert.equal(applyArchetypeResourceAdjustments({}, [archetype("inquisitor-green-faith-marshal")], 5)[weekly.resourceId], 1);
  assert.equal(inferArchetypeSpellLikeAbilityActions(archetype("slayer-bloody-jake"))[0].action.label, "Cast tree stride");
});

test("named spell-equivalent powers become bounded activation actions", () => {
  const enforcer = inferArchetypeSpellLikeAbilityActions(archetype("paladin-iomedaen-enforcer"));
  assert.deepEqual(enforcer.map(({ action }) => [action.spellLikeAbility.spellName, action.spellLikeAbility.cadence, action.spellLikeAbility.kind]), [
    ["detect chaos", "at-will", "spell-equivalent"],
  ]);
  const mesmerist = archetype("mesmerist-umbral-mesmerist");
  const shadowSummoning = inferArchetypeSpellLikeAbilityActions(mesmerist).find(({ action }) => action.spellLikeAbility.spellName === "summon monster 1").action;
  assert.equal(applyArchetypeResourceAdjustments({}, [mesmerist], 4, { charisma: 4 })[shadowSummoning.resourceId], 7);
  const secretSeeker = archetype("inquisitor-secret-seeker");
  const detectThoughts = inferArchetypeSpellLikeAbilityActions(secretSeeker).find(({ action }) => action.spellLikeAbility.spellName === "detect thoughts").action;
  assert.equal(applyArchetypeResourceAdjustments({}, [secretSeeker], 9)[detectThoughts.resourceId], 18);
});

test("spell-like resources enforce daily, weekly, formula, and scaling limits", () => {
  const greenFaith = archetype("druid-green-faith-initiate");
  const maximums = applyArchetypeResourceAdjustments({}, [greenFaith], 10);
  const actions = inferArchetypeSpellLikeAbilityActions(greenFaith);
  assert.equal(maximums[actions[0].action.resourceId], 1);
  assert.equal(maximums[actions[1].action.resourceId], 1);

  const drowned = archetype("spiritualist-drowned-channeler");
  const hydraulic = inferArchetypeSpellLikeAbilityActions(drowned).find(({ action }) => action.spellLikeAbility.spellName === "hydraulic push").action;
  assert.equal(applyArchetypeResourceAdjustments({}, [drowned], 5)[hydraulic.resourceId], 1);
  assert.equal(applyArchetypeResourceAdjustments({}, [drowned], 17)[hydraulic.resourceId], 4);

  const mnemostiller = archetype("alchemist-mnemostiller");
  const detectThoughts = inferArchetypeSpellLikeAbilityActions(mnemostiller).find(({ action }) => action.spellLikeAbility.spellName === "detect thoughts").action;
  assert.equal(applyArchetypeResourceAdjustments({}, [mnemostiller], 1, { charisma: 4 })[detectThoughts.resourceId], 4);
});

test("applied archetypes expose inferred spell-like actions to the feature UI", () => {
  const druid = data.classes.find((item) => item.id === "druid");
  const applied = applyArchetype(druid, archetype("druid-green-faith-initiate"));
  const zephyr = applied.features.find((feature) => feature.id === "druid-green-faith-initiate-zephyr-message-sp-6");
  assert.equal(zephyr.resourceActions[0].label, "Cast whispering wind");
  assert.equal(zephyr.resourceActions[0].cost, 1);
  assert.ok(!archetypeAutomationSummary(archetype("druid-green-faith-initiate")).manual.some((item) => item.startsWith("Zephyr Message")));
});

test("catalogue inference is bounded, unique, named, and player-owned", () => {
  const spellNames = new Set(spells.map((spell) => spell.name.toLowerCase()));
  let actionCount = 0;
  for (const item of archetypes) {
    const actions = inferArchetypeSpellLikeAbilityActions(item);
    actionCount += actions.length;
    assert.equal(new Set(actions.map(({ action }) => action.id)).size, actions.length, `${item.id} has unique spell-like actions`);
    for (const { sourceFeatureId, action } of actions) {
      assert.ok(action.minimumLevel >= 1 && action.minimumLevel <= 20, `${item.id} has a bounded minimum level`);
      assert.doesNotMatch(action.spellLikeAbility.spellName, /^(?:it|spells?|his |her |their )/i, `${item.id} names a concrete spell`);
      assert.doesNotMatch(sourceFeatureId, /(?:companion|eidolon|familiar|mount|phantom)/i, `${item.id} excludes subordinate abilities`);
      assert.ok(spellNames.has(action.spellLikeAbility.spellName.toLowerCase()) || action.spellLikeAbility.spellName === "transmogrify", `${item.id} references a known spell name`);
    }
  }
  assert.ok(actionCount >= 89, `expected broad catalogue coverage, received ${actionCount}`);
  assert.deepEqual(inferArchetypeSpellLikeAbilityActions(archetype("inquisitor-living-grimoire")), []);
  assert.deepEqual(inferArchetypeSpellLikeAbilityActions(archetype("magus-esoteric")), []);
});
