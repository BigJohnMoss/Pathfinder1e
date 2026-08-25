import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  applyArchetypeResourceAdjustments,
  archetypeAutomationSummary,
  archetypeConditionalModifiers,
  fixedOptionIdsThroughLevel,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((candidate) => candidate.id === id);
const oracle = data.classes.find((candidate) => candidate.id === "oracle");

test("fixed Oracle revelations grant their exact options at the published levels", () => {
  const inerrant = applyArchetype(oracle, archetype("oracle-inerrant-voice"), data.classes, data.spells);
  const seer = applyArchetype(oracle, archetype("oracle-seer"), data.classes, data.spells);
  const stargazer = applyArchetype(oracle, archetype("oracle-stargazer"), data.classes, data.spells);
  assert.deepEqual(fixedOptionIdsThroughLevel(inerrant, 2), []);
  assert.deepEqual(fixedOptionIdsThroughLevel(inerrant, 3), ["oracle-revelation-vigilant-protector"]);
  assert.deepEqual(fixedOptionIdsThroughLevel(seer, 2), ["oracle-revelation-natural-divination"]);
  assert.deepEqual(fixedOptionIdsThroughLevel(seer, 3), ["oracle-revelation-natural-divination", "oracle-revelation-gift-of-prophecy"]);
  assert.deepEqual(fixedOptionIdsThroughLevel(stargazer, 6), ["oracle-revelation-guiding-star"]);
  assert.deepEqual(fixedOptionIdsThroughLevel(stargazer, 7), ["oracle-revelation-guiding-star", "oracle-revelation-star-chart"]);
});

test("fixed revelation resources remain bounded and actions retain their level gates", () => {
  const inerrant = archetype("oracle-inerrant-voice");
  const seer = archetype("oracle-seer");
  const stargazer = archetype("oracle-stargazer");
  assert.equal(applyArchetypeResourceAdjustments({}, [inerrant], 3, {}).inerrantVoiceVigilantProtector, 1);
  assert.equal(applyArchetypeResourceAdjustments({}, [inerrant], 19, {}).inerrantVoiceVigilantProtector, 5);
  assert.equal(applyArchetypeResourceAdjustments({}, [seer], 8, {}).seerNaturalDivination, 3);
  assert.equal(applyArchetypeResourceAdjustments({}, [seer], 20, {}).seerNaturalDivination, 6);
  const inerrantActions = inerrant.replacements.flatMap((replacement) => replacement.features).flatMap((feature) => feature.resourceActions ?? []);
  assert.equal(inerrantActions.find((action) => action.id === "inerrant-voice-transpose-ward").minimumLevel, 11);
  const prophecy = seer.replacements.flatMap((replacement) => replacement.features).flatMap((feature) => feature.resourceActions ?? []).find((action) => action.id === "seer-gift-of-prophecy");
  assert.deepEqual(prophecy.modes.map(({ id, minimumLevel }) => [id, minimumLevel]), [["augury", 3], ["divination", 5], ["commune", 9]]);
  const starChart = stargazer.replacements.flatMap((replacement) => replacement.features).flatMap((feature) => feature.resourceActions ?? []).find((action) => action.id === "stargazer-star-chart");
  assert.equal(starChart.spellLikeAbility.spellId, "commune");
});

test("Guiding Star resolves its Charisma bonus and all four revelation containers leave the manual audit", () => {
  const stargazer = archetype("oracle-stargazer");
  assert.deepEqual(archetypeConditionalModifiers([stargazer], { oracle: 10 }, { charisma: 5 }), [{
    label: "Wisdom-based checks",
    condition: "The open night sky is visible",
    bonus: 5,
    source: "Stargazer",
  }]);
  for (const id of ["oracle-inerrant-voice", "oracle-keleshite-prophet", "oracle-seer", "oracle-stargazer"]) {
    const summary = archetypeAutomationSummary(archetype(id), data.feats, data.spells);
    assert.equal(summary.manual.some((entry) => /^Revelations/.test(entry)), false, id);
  }
});
