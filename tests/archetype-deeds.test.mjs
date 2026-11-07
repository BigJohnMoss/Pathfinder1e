import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  archetypeAutomationSummary,
  archetypeConditionalModifiers,
  archetypeDeedRules,
  archetypeSkillBonuses,
  archetypeSkillCheckRules,
  applyArchetype,
  characterPrecisionDamageRules,
  namedDeeds,
} from "../packages/engine/src/index.js";

const ids = [
  "gunslinger-black-powder-vaulter",
  "gunslinger-blatherskite",
  "gunslinger-maverick",
  "swashbuckler-mouser",
  "swashbuckler-noble-fencer",
  "swashbuckler-veiled-blade",
  "swashbuckler-wildstrider",
];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const deedFeature = (id) => record(id).replacements
  .flatMap((replacement) => replacement.features)
  .find((feature) => /^Deeds?$/i.test(feature.name));

test("the first Deeds batch models every published named deed and leaves the manual audit", () => {
  for (const id of ids) {
    const feature = deedFeature(id);
    assert.ok(feature, `${id} deed feature`);
    assert.deepEqual(
      feature.deedRules.map((rule) => rule.name.toLowerCase().replaceAll("’", "'")),
      namedDeeds(feature).map((name) => name.toLowerCase().replaceAll("’", "'")),
      `${id} named deed coverage`,
    );
    const actionIds = new Set((feature.resourceActions ?? []).map((action) => action.id));
    for (const rule of feature.deedRules) {
      assert.ok(Number.isInteger(rule.minimumLevel) && rule.minimumLevel >= 1 && rule.minimumLevel <= 20, `${id}:${rule.id} level`);
      if (rule.kind === "active") {
        assert.ok(rule.actionIds?.length, `${id}:${rule.id} active action`);
        assert.ok(rule.actionIds.every((actionId) => actionIds.has(actionId)), `${id}:${rule.id} linked action`);
      }
    }
    assert.equal(archetypeAutomationSummary(record(id), data.feats, data.spells).manual.some((entry) => /^Deeds? \(level/.test(entry)), false, id);
  }
});

test("deed rules respect class-level gates and resource requirements", () => {
  const sources = [record("gunslinger-maverick"), record("swashbuckler-mouser")];
  assert.deepEqual(archetypeDeedRules(sources, { gunslinger: 1, swashbuckler: 1 }).map((rule) => rule.name), ["Stacked Deck", "Underfoot Assault"]);
  const throughSeven = archetypeDeedRules(sources, { gunslinger: 3, swashbuckler: 7 });
  assert.ok(throughSeven.some((rule) => rule.name === "Fist Fighter" && rule.minimumResource === 1));
  assert.ok(throughSeven.some((rule) => rule.name === "Hamstring" && rule.minimumResource === 1));
  const hamstring = deedFeature("swashbuckler-mouser").resourceActions.find((action) => action.id === "mouser-hamstring");
  assert.equal(hamstring.minimumResourceRemaining, 1);
  assert.equal(hamstring.cost, 0);
});

test("Deeds batch supplemental mechanics flow into their shared engine systems", () => {
  const blatherskite = record("gunslinger-blatherskite");
  assert.ok(archetypeConditionalModifiers([blatherskite], { gunslinger: 3 }).some((modifier) => modifier.label === "Initiative checks" && modifier.bonus === 2));
  const appliedBlatherskite = applyArchetype(data.classes.find((candidate) => candidate.id === "gunslinger"), blatherskite, data.classes, data.spells);
  assert.ok(characterPrecisionDamageRules([appliedBlatherskite], { gunslinger: 3 }).some((rule) => rule.label === "Cheap Shot" && rule.dice === 1 && rule.dieSides === 6));

  const veiled = record("swashbuckler-veiled-blade");
  assert.ok(archetypeSkillBonuses([veiled], { swashbuckler: 3 }).conditionalModifiers.some((modifier) => modifier.label === "Sleight of Hand checks" && modifier.bonus === 4));

  const wildstrider = record("swashbuckler-wildstrider");
  assert.equal(archetypeSkillCheckRules([wildstrider], { swashbuckler: 14 }).length, 0);
  assert.ok(archetypeSkillCheckRules([wildstrider], { swashbuckler: 15 }).some((rule) => rule.skills.includes("Stealth") && rule.result === 10));
});
