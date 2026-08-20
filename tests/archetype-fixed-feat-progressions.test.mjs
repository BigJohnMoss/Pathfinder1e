import assert from "node:assert/strict";
import test from "node:test";

import archetypes from "../generated/pf1e-archetypes.mjs";
import feats from "../generated/pf1e-feats.mjs";
import {
  archetypeAutomationSummary,
  inferArchetypeGrantedFeats,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((entry) => entry.id === id);

test("fixed bonus-feat progressions grant every feat at its published level", () => {
  const cases = new Map([
    ["bard-lotus-geisha", [[1, "spell-focus"], [5, "greater-spell-focus"]]],
    ["monk-tetori", [[1, "improved-grapple"], [2, "stunning-pin"], [6, "greater-grapple"], [10, "pinning-knockout"], [14, "chokehold"], [18, "neckbreaker"]]],
  ]);
  for (const [id, expected] of cases) {
    const selected = archetype(id);
    const grants = inferArchetypeGrantedFeats(selected, feats);
    assert.deepEqual(grants.map((grant) => [grant.level, grant.featId]), expected, id);
    assert.equal(archetypeAutomationSummary(selected, feats, []).manual.some((item) => item.startsWith("Bonus Feat")), false, id);
  }
});

test("mixed owner and selectable bonus-feat rules remain in the manual queue", () => {
  for (const id of ["cavalier-huntmaster", "gunslinger-siege-gunner", "mesmerist-vexing-daredevil"]) {
    assert.equal(archetypeAutomationSummary(archetype(id), feats, []).manual.some((item) => item.startsWith("Bonus Feat")), true, id);
  }
});
