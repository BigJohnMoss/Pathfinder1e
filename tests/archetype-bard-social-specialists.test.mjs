import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetypeResourceAdjustments, archetypeAutomationSummary, inferArchetypeRerollActions } from "../packages/engine/src/index.js";

const ids = ["bard-wit", "bard-fey-prankster", "bard-brazen-deceiver", "bard-provocateur", "bard-solacer"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const features = (id) => record(id).replacements.flatMap((replacement) => replacement.features ?? []);
const named = (id, pattern) => features(id).find((candidate) => pattern.test(candidate.name));

test("all five social-specialist Bards are fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Wit automates every scaling social, initiative, performance, and duel rule", () => {
  const source = record("bard-wit");
  assert.equal(named(source.id, /^Way with Words/).level, 1);
  assert.deepEqual(source.skillBonusAdjustments[0].bonusByLevel.map(({ level, bonus }) => [level, bonus]), [[1, 1], [4, 2], [8, 3], [12, 4], [16, 5], [20, 6]]);
  assert.deepEqual(source.initiativeAdjustments[0], { sourceFeatureId: "bard-wit-quick-witted-ex-2", label: "Quick Witted", minimumLevel: 2, base: 0, levelDivisor: 2, minimum: 1 });
  const actions = named(source.id, /^Bardic Performance$/).resourceActions;
  assert.equal(actions.find((action) => action.id === "wit-cutting-remark").diceRoll.flatModifierByLevel.at(-1).modifier, 20);
  assert.equal(actions.find((action) => action.id === "wit-cutting-remark-daze").targetEffectRoll.successEffect.rounds, 999);
  assert.deepEqual(named(source.id, /^On the Ball/).resourceActions[0].fixedD20Result.resultByLevel, [{ level: 5, result: 10 }, { level: 20, result: 20 }]);
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 20).onTheBall, 3);
});

test("Fey Prankster provides exact skill, performance, feat, and Master of Mischief controls", () => {
  const source = record("bard-fey-prankster");
  assert.deepEqual(source.skillBonusAdjustments.map((adjustment) => adjustment.skill), ["Bluff", "Disguise", "Sleight of Hand", "Stealth"]);
  assert.deepEqual(named(source.id, /^Dirty Trickster/).grantedFeatIds, ["improved-dirty-trick"]);
  assert.equal(named(source.id, /^Bardic Performance$/).resourceActions.length, 4);
  assert.equal(named(source.id, /^Embarrassing Satire/).resourceActions[0].minimumLevel, 8);
  assert.equal(source.skillCheckRules.length, 4);
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 17).masterOfMischiefTake20, 3);
});

test("Brazen Deceiver automates lie tiers, shadow spells, Spellsong, and Bluff mastery", () => {
  const source = record("bard-brazen-deceiver");
  const tale = named(source.id, /^Deceptive Tale/);
  assert.equal(tale.level, 1);
  assert.deepEqual(tale.resourceActions[0].modes.map((mode) => [mode.id, mode.minimumLevel]), [["unlikely", 1], ["far-fetched", 5], ["impossible", 11]]);
  assert.deepEqual(named(source.id, /^Blatant Subtlety/).grantedFeatIds, ["spellsong"]);
  assert.deepEqual(Object.keys(source.bonusSpellAdditions), ["bleed", "touch-of-fatigue", "darkness", "darkvision", "shadow-conjuration", "shadow-step", "shadow-evocation", "shadow-walk", "shadow-conjuration-greater", "shadow-evocation-greater"]);
  assert.equal(source.skillCheckRules[0].skills[0], "Bluff");
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 17).devilsTongueTake20, 3);
});

test("Provocateur rolls every Calumny substitution and tracks both Damning Performance tiers", () => {
  const source = record("bard-provocateur");
  assert.equal(source.skillBonusAdjustments.length, 3);
  const calumny = named(source.id, /^Calumny/).resourceActions[0];
  assert.deepEqual(calumny.modes.map((mode) => mode.id), ["rumor-bluff", "rumor-diplomacy", "demoralize"]);
  assert.equal(calumny.diceRoll.modifierInputLabel, "Selected Perform modifier");
  const damning = named(source.id, /^Damning Performance/).resourceActions[0];
  assert.deepEqual(damning.modes.map((mode) => [mode.id, mode.minimumLevel, mode.maximumLevel]), [["minutes", 4, 17], ["days", 18, undefined]]);
  assert.equal(damning.confirmations[0].requiredForActivation, true);
});

test("Solacer automates physician checks, performances, treatment, and protection tiers", () => {
  const source = record("bard-solacer");
  assert.equal(named(source.id, /^Learned Physician/).level, 1);
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [source], 17), { learnedPhysicianTake20: 3, creativeTreatment: 4 });
  assert.equal(inferArchetypeRerollActions(source)[0].action.rerollAction.kind, "higher-d20");
  assert.equal(named(source.id, /^Inspire Tenacity/).resourceActions[0].resourceId, "bardicPerformance");
  assert.deepEqual(named(source.id, /^Invigorating Artistry/).resourceActions[0].modes.map((mode) => mode.label), ["+3", "+4", "+5"]);
});
