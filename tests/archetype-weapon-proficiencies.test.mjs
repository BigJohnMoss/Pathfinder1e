import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  archetypeAutomationSummary,
  archetypeWeaponProficiencyRules,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((candidate) => candidate.id === id);

test("the remaining archetype weapon proficiency replacements are structured and complete", () => {
  const spire = archetype("magus-spire-defender");
  const hellcat = archetype("monk-hellcat");
  const softstrike = archetype("monk-softstrike-monk");
  for (const source of [spire, hellcat, softstrike]) {
    assert.equal(archetypeAutomationSummary(source, data.feats, data.spells).manual.some((entry) => /^Weapon Proficiency/.test(entry)), false, source.id);
  }
  assert.deepEqual(archetypeAutomationSummary(spire, data.feats, data.spells).manual, []);
  assert.deepEqual(applyArchetype(data.classes.find((candidate) => candidate.id === "monk"), hellcat, data.classes, data.spells).weaponUseAdjustments, hellcat.weaponUseAdjustments);
});

test("Spire Defender resolves the custom qualifying weapon and monk exceptions remain explicit", () => {
  const spireRules = archetypeWeaponProficiencyRules([archetype("magus-spire-defender")], {
    "magus-spire-defender-weapon-proficiency-1-weapon": "Whip",
  });
  assert.deepEqual(spireRules.map((rule) => [rule.label, rule.proficiencies]), [
    ["Replaces weapon proficiencies", ["All light simple weapons", "All one-handed simple weapons", "All light martial weapons", "All one-handed martial weapons"]],
    ["Gains proficiency", ["Whip"]],
  ]);
  assert.match(spireRules[1].condition, /exotic light or one-handed melee weapon/);
  assert.deepEqual(archetypeWeaponProficiencyRules([archetype("monk-hellcat")]).at(-1), {
    sourceFeatureId: "monk-hellcat-weapon-proficiency-1",
    label: "Flurry of Blows weapon",
    proficiencies: ["Light mace"],
    condition: undefined,
    source: "Hellcat",
  });
  assert.match(archetypeWeaponProficiencyRules([archetype("monk-softstrike-monk")]).at(-1).condition, /only when dealing bludgeoning damage/);
});

