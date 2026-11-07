import assert from "node:assert/strict";
import test from "node:test";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, applyArchetypeResourceAdjustments, archetypeAutomationSummary, archetypeCompanionEffectiveLevel, inferArchetypeCompanionGrants, inferredArchetypeCompanionGrantDetails, phantomFocusDetails, phantomProgression, resolvedArchetypeCompanionGrants } from "../packages/engine/src/index.js";

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

test("pure structured companion grants leave the manual queue without hiding composite rules", () => {
  const draconicDruid = archetype("druid-draconic-druid");
  const details = inferredArchetypeCompanionGrantDetails(draconicDruid);
  assert.deepEqual(details.grants, [], "the authored grant remains authoritative");
  assert.ok(details.fullyAutomatedFeatureIds.has("druid-draconic-druid-drake-companion-1"));
  assert.equal(archetypeAutomationSummary(draconicDruid, data.feats, data.spells).manual.includes("Drake Companion (level 1)"), false);
  assert.equal(archetypeAutomationSummary(archetype("shaman-draconic-shaman"), data.feats, data.spells).manual.includes("Drake Companion (level 4)"), true);
});

test("Death Druid automates a selected full-level phantom and its borrowed features", () => {
  const deathDruid = archetype("druid-death-druid");
  const [grant] = resolvedArchetypeCompanionGrants(deathDruid);
  assert.deepEqual([grant.kind, grant.optionFeatureId, grant.minimumLevel], ["phantom", "druid-death-druid-phantom-1", 1]);
  assert.equal(archetypeCompanionEffectiveLevel(grant, 14), 14);

  const applied = applyArchetype(characterClass("druid"), deathDruid);
  assert.deepEqual(applied.features.filter((feature) => feature.id.startsWith("druid-death-druid-")).map((feature) => [feature.id, feature.level]), [
    ["druid-death-druid-etheric-tether-1", 1],
    ["druid-death-druid-phantom-1", 1],
    ["druid-death-druid-soul-magic-1", 1],
    ["druid-death-druid-bonded-manifestation-4", 4],
    ["druid-death-druid-resist-death-s-call-ex-4", 4],
    ["druid-death-druid-negative-immunity-su-9", 9],
    ["druid-death-druid-spiritual-bond-14", 14],
  ]);
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [deathDruid], 4), { bondedManifestation: 7 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [deathDruid], 20), { bondedManifestation: 23 });
  assert.deepEqual(archetypeAutomationSummary(deathDruid, data.feats, data.spells).manual, []);
});

test("phantom progression exposes its complete level-scaled companion statistics", () => {
  const level1 = phantomProgression(1);
  assert.deepEqual([level1.effectiveLevel, level1.hitDice, level1.baseAttackBonus, level1.goodSaveBonus, level1.badSaveBonus, level1.skillRanks, level1.feats, level1.armorBonus, level1.dexterityCharismaBonus, level1.slamDamage], [1, 1, 1, 2, 0, 2, 1, 0, 0, "1d6"]);
  assert.deepEqual(level1.abilityScores, { strength: 12, dexterity: 14, constitution: 13, intelligence: 7, wisdom: 10, charisma: 13 });
  assert.deepEqual(level1.specialAbilities, ["Darkvision 60 feet", "Link", "Share spells"]);
  const level20 = phantomProgression(20);
  assert.deepEqual([level20.hitDice, level20.baseAttackBonus, level20.goodSaveBonus, level20.badSaveBonus, level20.skillRanks, level20.feats, level20.armorBonus, level20.dexterityCharismaBonus, level20.slamDamage], [15, 15, 9, 5, 30, 8, 16, 8, "2d8"]);
  assert.ok(level20.specialAbilities.includes("Deliver touch spells (50 feet)"));
  assert.ok(level20.specialAbilities.includes("Incorporeal flight"));
});

test("all 15 emotional focuses calculate focus skills, saves, traits, and level abilities", () => {
  const focusIds = data.optionGroups.find((item) => item.id === "spiritualist-emotional-focuses").options.map((option) => option.id);
  assert.equal(focusIds.length, 15);
  for (const id of focusIds) {
    const details = phantomFocusDetails(id, 20);
    assert.equal(details.skills.length, 2, id);
    assert.equal(details.goodSaves.length, 2, id);
    assert.ok(details.traits.length >= 1, id);
    assert.deepEqual(details.abilities.map((ability) => ability.minimumLevel), [1, 7, 12, 17], id);
  }
  const anger = phantomProgression(20, "spiritualist-focus-anger");
  assert.deepEqual(anger.abilityScores, { strength: 22, dexterity: 12, constitution: 13, intelligence: 7, wisdom: 10, charisma: 21 });
  assert.equal(anger.slamDamage, "3d8");
  const lust = phantomProgression(20, "spiritualist-focus-lust");
  assert.deepEqual(lust.abilityScores, { strength: 12, dexterity: 12, constitution: 23, intelligence: 7, wisdom: 10, charisma: 21 });
  assert.equal(phantomProgression(11, "spiritualist-focus-zeal").slamCritical, "19-20/x3");
});

test("Death Druid emotional focuses inherit the full Spiritualist focus catalogue for Druids", () => {
  const group = data.optionGroups.find((item) => item.id === "death-druid-phantom-focuses");
  const spiritualist = data.optionGroups.find((item) => item.id === "spiritualist-emotional-focuses");
  assert.ok(group);
  assert.deepEqual(group.classIds, ["druid"]);
  assert.equal(group.options.length, spiritualist.options.length);
  assert.ok(group.options.every((option) => option.groupId === group.id && option.classIds.includes("druid")));
});
