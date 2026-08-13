import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, applyArchetypeResourceAdjustments, apgClassResourceMaximums, archetypeAutomationSummary, inferArchetypeTimedEffectActions, normalizeCharacterDraft } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);

test("timed archetype effects spend shared resources and preserve exact scaling", () => {
  const sorrow = inferArchetypeTimedEffectActions(archetype("bard-sorrowsoul"))[0].action;
  assert.equal(sorrow.resourceId, "bardicPerformance");
  assert.equal(sorrow.cost, 3);
  assert.deepEqual(sorrow.activeEffect.targets, ["fortitude", "reflex", "will"]);
  assert.equal(sorrow.activeEffect.defaultRounds, 1);

  const sohei = inferArchetypeTimedEffectActions(archetype("monk-sohei"))[0].action;
  assert.equal(sohei.resourceId, "kiPool");
  assert.deepEqual(sohei.activeEffect.targets, ["attackRolls", "damageRolls"]);
  assert.equal(sohei.activeEffect.selectEquippedWeapon, true);
  assert.equal(sohei.activeEffect.includeUnarmedStrike, true);
  assert.equal(sohei.activeEffect.usesWeaponEnhancementRules, true);
  assert.deepEqual(sohei.activeEffect.bonusByLevel, [
    { level: 4, bonus: 1 }, { level: 8, bonus: 2 }, { level: 12, bonus: 3 }, { level: 16, bonus: 4 }, { level: 20, bonus: 5 },
  ]);

  const sacredFist = inferArchetypeTimedEffectActions(archetype("warpriest-sacred-fist"))[0].action;
  assert.deepEqual(sacredFist.activeEffect.bonusByLevel, [
    { level: 7, bonus: 1 }, { level: 10, bonus: 2 }, { level: 13, bonus: 3 }, { level: 16, bonus: 4 }, { level: 19, bonus: 5 },
  ]);
  assert.equal(sacredFist.activeEffect.defaultRounds, 10);
});

test("timed effect inference rejects conditional approximations and preserves skill choices", () => {
  assert.deepEqual(inferArchetypeTimedEffectActions(archetype("magus-spell-dancer")), []);
  const augmentation = inferArchetypeTimedEffectActions(archetype("magus-spire-defender"))[0].action;
  assert.deepEqual(augmentation.activeEffect.skillOptions, ["Acrobatics", "Climb", "Escape Artist", "Perception", "Stealth", "Swim"]);
  assert.deepEqual(augmentation.activeEffect.bonusByLevel, [
    { level: 4, bonus: 5 }, { level: 7, bonus: 6 }, { level: 10, bonus: 7 }, { level: 13, bonus: 8 }, { level: 16, bonus: 9 }, { level: 19, bonus: 10 },
  ]);
  const splendor = inferArchetypeTimedEffectActions(archetype("occultist-battle-host"))[0].action;
  assert.deepEqual(splendor.activeEffect.targets, ["strength", "dexterity", "constitution"]);
  assert.equal(splendor.resourceId, "archetype-occultist-battle-host-heroic-splendor-su-6");
  const insight = inferArchetypeTimedEffectActions(archetype("oracle-shigenjo"))[0].action;
  assert.deepEqual(insight.activeEffect.skillOptions, ["Spellcraft"]);
  assert.deepEqual(inferArchetypeTimedEffectActions(archetype("paladin-holy-tactician")), []);
});

test("applied archetypes expose timed effects without duplicate generic actions", () => {
  const monk = data.classes.find((item) => item.id === "monk");
  const applied = applyArchetype(monk, archetype("monk-sohei"));
  assert.deepEqual(applied.features.find((feature) => feature.id === "monk-sohei-ki-weapon-su-4").resourceActions.map((action) => action.label), ["Activate Ki Weapon"]);
});

test("complete timed effects leave the manual queue while partial effects remain", () => {
  assert.equal(archetypeAutomationSummary(archetype("magus-spire-defender"), data.feats, data.spells).manual.includes("Arcane Augmentation (Su) (level 4)"), false);
  assert.equal(archetypeAutomationSummary(archetype("occultist-battle-host"), data.feats, data.spells).manual.includes("Heroic Splendor (Su) (level 6)"), false);
  assert.equal(archetypeAutomationSummary(archetype("bard-sorrowsoul"), data.feats, data.spells).manual.includes("Spurn Harm (Su) (level 5)"), false);
  assert.equal(archetypeAutomationSummary(archetype("monk-sohei"), data.feats, data.spells).manual.includes("Ki Weapon (Su) (level 4)"), false);
});

test("Spurn Harm gains its complete level-gated defensive package", () => {
  const action = inferArchetypeTimedEffectActions(archetype("bard-sorrowsoul"))[0].action;
  assert.deepEqual(action.activeEffect.targets, ["fortitude", "reflex", "will"]);
  assert.equal(action.activeEffect.bonus, 2);
  assert.deepEqual(action.activeEffect.additionalEffectsByLevel.map(({ minimumLevel, target, bonus }) => ({ minimumLevel, target, bonus })), [
    { minimumLevel: 11, target: "spellResistance", bonus: 22 },
    { minimumLevel: 17, target: "damageReduction", bonus: 10 },
  ]);
  assert.deepEqual(action.activeEffect.additionalEffectsByLevel[0].bonusByLevel.slice(-1), [{ level: 20, bonus: 31 }]);
});

test("monk and Sacred Fist ki pools use bounded class-level formulas", () => {
  assert.deepEqual(apgClassResourceMaximums("monk", 3, { wisdom: 4 }), {});
  assert.deepEqual(apgClassResourceMaximums("monk", 4, { wisdom: 4 }), { kiPool: 6 });
  assert.deepEqual(apgClassResourceMaximums("monk", 20, { wisdom: 6 }), { kiPool: 16 });
  assert.equal(applyArchetypeResourceAdjustments(apgClassResourceMaximums("warpriest", 19, { wisdom: 4 }), [archetype("warpriest-sacred-fist")], 19, { wisdom: 4 }).kiPool, 12);
});

test("timed effect parser remains narrowly bounded across the catalogue", () => {
  const actions = archetypes.flatMap((item) => inferArchetypeTimedEffectActions(item));
  assert.equal(actions.length, 7);
  assert.equal(new Set(actions.map(({ action }) => action.id)).size, actions.length);
  for (const { action } of actions) {
    assert.ok(action.cost >= 1);
    assert.ok(action.activeEffect.fixedRounds);
    assert.ok(action.activeEffect.targets.length >= 1);
    assert.ok(action.activeEffect.defaultRounds >= 1);
  }
});

test("skill, damage-reduction, and weapon-enhancement effects survive bounded normalization", () => {
  const normalized = normalizeCharacterDraft({
    classId: "magus", level: 4, classLevels: [{ classId: "magus", level: 4 }],
    baseAbilities: { strength: 10, dexterity: 10, constitution: 10, intelligence: 14, wisdom: 10, charisma: 10 },
    activeEffects: [
      { id: "augmentation", name: "Arcane Augmentation", target: "skillChecks", bonus: 5, roundsRemaining: 10, skillIds: ["Stealth", "<invalid>"] },
      { id: "spurn-harm-dr", name: "Spurn Harm damage reduction", target: "damageReduction", bonus: 10, roundsRemaining: 1, description: "DR 10/—." },
      { id: "ki-weapon", name: "Ki Weapon", target: "attackRolls", bonus: 5, roundsRemaining: 1, weaponIds: ["longbow"], weaponEnhancementBonus: true },
    ],
  }, { classIds: ["magus"] });
  assert.deepEqual(normalized.activeEffects[0].skillIds, ["Stealth"]);
  assert.deepEqual(normalized.activeEffects[1], { id: "spurn-harm-dr", name: "Spurn Harm damage reduction", target: "damageReduction", bonus: 10, roundsRemaining: 1, description: "DR 10/—." });
  assert.deepEqual(normalized.activeEffects[2], { id: "ki-weapon", name: "Ki Weapon", target: "attackRolls", bonus: 5, roundsRemaining: 1, weaponIds: ["longbow"], weaponEnhancementBonus: true });
});
