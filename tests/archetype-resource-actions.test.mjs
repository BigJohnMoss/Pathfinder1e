import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, inferArchetypeResourceActions, inferArchetypeRerollActions, inferArchetypeSpellLikeAbilityActions, inferArchetypeTemporaryHitPointActions } from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const specializedIds = (item) => new Set([
  ...inferArchetypeTemporaryHitPointActions(item),
  ...inferArchetypeRerollActions(item),
  ...inferArchetypeSpellLikeAbilityActions(item),
].map(({ sourceFeatureId }) => sourceFeatureId));

test("tracked archetype resources gain a matching activation action", () => {
  const ectochymist = archetype("alchemist-ectochymist");
  assert.deepEqual(inferArchetypeResourceActions(ectochymist, specializedIds(ectochymist)), [{
    sourceFeatureId: "alchemist-ectochymist-ectoplasmic-blanche-su-1",
    action: {
      id: "alchemist-ectochymist-ectoplasmic-blanche-su-1-use-ectoplasmicblanche",
      label: "Use Ectoplasmic Blanche",
      classId: "alchemist",
      minimumLevel: 1,
      resourceId: "ectoplasmicBlanche",
      cost: 1,
      summary: ectochymist.replacements.flatMap((replacement) => replacement.features).find((feature) => feature.id === "alchemist-ectochymist-ectoplasmic-blanche-su-1").summary,
    },
  }]);
  const archaeologist = archetype("bard-archaeologist");
  assert.equal(inferArchetypeResourceActions(archaeologist, specializedIds(archaeologist))[0].action.label, "Use 1 round of Archaeologist’s Luck");
});

test("applied archetypes expose generic actions without duplicating specialized actions", () => {
  const alchemist = data.classes.find((item) => item.id === "alchemist");
  const torchbearer = applyArchetype(alchemist, archetype("alchemist-blazing-torchbearer"));
  assert.deepEqual(torchbearer.features.find((feature) => feature.name.startsWith("Intense Light")).resourceActions.map((action) => action.label), ["Use Intense Light"]);
  assert.deepEqual(torchbearer.features.find((feature) => feature.name.startsWith("Everburning Flame")).resourceActions.map((action) => action.label), ["Cast spark"]);

  const siegebreaker = applyArchetype(data.classes.find((item) => item.id === "fighter"), archetype("fighter-siegebreaker"));
  assert.deepEqual(siegebreaker.features.find((feature) => feature.name.startsWith("Armored Vigor")).resourceActions.map((action) => action.label), ["Gain Armored Vigor temporary HP"]);

  const twilight = archetype("arcanist-twilight-sage");
  assert.deepEqual(inferArchetypeResourceActions(twilight, specializedIds(twilight)), []);
});

test("generic resource actions stay unique and bounded across the full catalogue", () => {
  let count = 0;
  for (const item of archetypes) {
    const actions = inferArchetypeResourceActions(item, specializedIds(item));
    count += actions.length;
    assert.equal(new Set(actions.map(({ action }) => action.id)).size, actions.length, `${item.id} has unique generic actions`);
    assert.equal(new Set(actions.map(({ action }) => action.resourceId)).size, actions.length, `${item.id} activates each resource once`);
    for (const { action } of actions) {
      assert.ok(action.minimumLevel >= 1 && action.minimumLevel <= 20, `${item.id} has a bounded action level`);
      assert.equal(action.cost, 1);
      assert.ok(action.resourceId);
    }
  }
  assert.ok(count >= 357, `expected broad generic action coverage after specialized actions take priority, received ${count}`);
});
