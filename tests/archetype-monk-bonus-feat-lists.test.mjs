import assert from "node:assert/strict";
import test from "node:test";

import archetypes from "../generated/pf1e-archetypes.mjs";
import feats from "../generated/pf1e-feats.mjs";
import {
  archetypeAutomationSummary,
  inferArchetypeFeatAlternatives,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((entry) => entry.id === id);

test("exact Monk bonus-feat list additions reach the selector at their published levels", () => {
  const cases = new Map([
    ["monk-lifting-hand", [[1, ["whirling-hold"]], [6, ["dramatic-slam", "overhead-flip"]], [10, ["savage-leap"]]]],
    ["monk-scaled-fist", [[1, ["dragon-style", "intimidating-prowess"]], [6, ["dazzling-display", "dragon-ferocity"]], [10, ["disheartening-display", "dragon-roar", "shatter-defenses"]]]],
    ["monk-wildcat", [[6, ["improved-dirty-trick", "improved-reposition", "improved-steal"]], [10, ["quick-dirty-trick", "quick-reposition", "quick-steal"]]]],
  ]);
  for (const [id, expected] of cases) {
    const selected = archetype(id);
    const alternatives = inferArchetypeFeatAlternatives(selected, feats);
    assert.deepEqual(alternatives.map((entry) => [entry.minimumLevel, entry.featChoiceIds]), expected, id);
    assert.ok(alternatives.every((entry) => entry.optionGroupId === "monk-bonus-feats" && entry.mode === "augment"), id);
    assert.equal(archetypeAutomationSummary(selected, feats, []).manual.some((item) => item.startsWith("Bonus Feat")), false, id);
  }
});

test("partially represented Monk feat-list rules stay visible for follow-up", () => {
  for (const id of ["monk-far-strike-monk", "monk-ironskin-monk", "monk-student-of-stone"]) {
    assert.equal(archetypeAutomationSummary(archetype(id), feats, []).manual.some((item) => item.startsWith("Bonus Feat")), true, id);
  }
});
