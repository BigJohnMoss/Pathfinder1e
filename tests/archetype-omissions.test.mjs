import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import feats from "../generated/pf1e-feats.mjs";
import spells from "../generated/pf1e-spells.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  archetypeAutomationSummary,
  inferArchetypeOmissions,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);

const expected = {
  "bard-duettist": ["well versed", "jack of all trades"],
  "bloodrager-bloody-knuckled-rowdy": ["damage reduction"],
  "cleric-foundation-of-faith": ["channel energy"],
  "druid-ashvawg-tamer": ["resist natures lure", "venom immunity"],
  "hunter-feral-hunter": ["animal companion"],
  "paladin-chosen-one": ["divine bond"],
};

test("pure omission statements resolve only when their replacement targets prove the omission", () => {
  for (const [id, names] of Object.entries(expected))
    assert.deepEqual(inferArchetypeOmissions(archetype(id)).flatMap((entry) => entry.omittedNames), names, id);
});

test("verified omissions leave the manual queue", () => {
  for (const [id, names] of Object.entries(expected)) {
    const summary = archetypeAutomationSummary(archetype(id), feats, spells);
    const omissions = inferArchetypeOmissions(archetype(id));
    assert.equal(summary.automated.includes(`${omissions.length} verified class-feature omission${omissions.length === 1 ? "" : "s"}`), true, id);
    for (const omission of omissions) {
      const feature = archetype(id).replacements.flatMap((entry) => entry.features).find((entry) => entry.id === omission.sourceFeatureId);
      assert.equal(summary.manual.includes(`${feature.name} (level ${feature.level})`), false, id);
    }
  }
});

test("the applied class actually removes every verified base feature", () => {
  for (const [id, names] of Object.entries(expected)) {
    const source = archetype(id);
    const characterClass = data.classes.find((item) => item.id === source.classId);
    const applied = applyArchetype(characterClass, source, data.classes, spells);
    const replacementTargets = new Set(source.replacements.flatMap((entry) => entry.featureIds));
    const relevantTargets = characterClass.features.filter((feature) =>
      replacementTargets.has(feature.id) && names.some((name) => feature.name.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim().includes(name)),
    );
    assert.ok(relevantTargets.length, id);
    for (const target of relevantTargets)
      assert.equal(applied.features.some((feature) => feature.id === target.id), false, `${id}: ${target.id}`);
  }
});

test("partial and conditional negative rules remain manual", () => {
  for (const id of ["fighter-foehammer", "bloodrager-urban-bloodrager", "swashbuckler-rondelero-swashbuckler"])
    assert.deepEqual(inferArchetypeOmissions(archetype(id)), [], id);
});

test("omission inference stays bounded to the audited exact family", () => {
  const inferred = archetypes.flatMap((item) => inferArchetypeOmissions(item).map((rule) => [item.id, rule.sourceFeatureId]));
  assert.equal(inferred.length, 7);
  assert.equal(new Set(inferred.map(([, featureId]) => featureId)).size, inferred.length);
});
