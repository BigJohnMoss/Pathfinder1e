import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { archetypeAutomationSummary } from "../packages/engine/src/index.js";

test("archetype automation reports calculated and manual mechanics separately", () => {
  const summary = archetypeAutomationSummary({
    mechanicalCoverage: "partial",
    classSkillAdditions: ["Ride"],
    spellListAdditions: { haste: 3 },
    replacements: [{ featureIds: ["base-feature"], features: [
      { id: "choice", name: "Choice", level: 1, choiceRequired: true, optionGroupId: "choices" },
      { id: "manual", name: "Bespoke Aura", level: 4 },
    ] }],
  });
  assert.ok(summary.automated.includes("Base feature replacements and level progression"));
  assert.ok(summary.automated.includes("Class skill changes"));
  assert.ok(summary.automated.includes("Spell-list additions"));
  assert.deepEqual(summary.manual, ["Bespoke Aura (level 4)"]);
});

test("full archetypes never report manual effects", () => {
  assert.deepEqual(archetypeAutomationSummary({ mechanicalCoverage: "full", replacements: [{ features: [{ name: "Feature", level: 1 }] }] }).manual, []);
});

test("shared archetype feat choices expose every earned selection slot", () => {
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const featChoices = (id) => archetype(id).replacements.flatMap((replacement) => replacement.features).filter((feature) => feature.optionGroupId === "archetype-feats");
  assert.deepEqual(featChoices("bloodrager-blood-conduit").map((feature) => feature.level), [1]);
  assert.deepEqual(featChoices("brawler-hinyasi").map((feature) => feature.level), [1]);
  assert.deepEqual(featChoices("slayer-vanguard").map((feature) => feature.level), [2]);
  assert.deepEqual(featChoices("paladin-vindictive-bastard").map((feature) => feature.level), [3, 9, 15]);
  assert.deepEqual(featChoices("occultist-battle-host").map((feature) => feature.level), [4, 8, 12, 16]);
  assert.deepEqual(featChoices("swashbuckler-guiding-blade").map((feature) => feature.level), [1, 4, 8, 12, 16, 20]);
  assert.deepEqual(featChoices("bard-phrenologist").map((feature) => feature.level), [10]);
  assert.deepEqual(featChoices("cleric-undead-lord").map((feature) => feature.level), [10]);
  assert.deepEqual(featChoices("cleric-mendevian-priest").map((feature) => feature.level), [4, 8]);
  assert.deepEqual(featChoices("barbarian-wildborn").map((feature) => feature.level), [4, 10, 16]);
  assert.deepEqual(featChoices("druid-ape-shaman").map((feature) => feature.level), [9, 13, 17]);
  assert.deepEqual(featChoices("druid-bear-shaman").map((feature) => feature.level), [9, 13, 17]);
  assert.deepEqual(featChoices("druid-boar-shaman").map((feature) => feature.level), [9, 13, 17]);

  const grantedFeats = (id) => archetype(id).replacements
    .flatMap((replacement) => replacement.features)
    .map((feature) => feature.grantedFeatId)
    .filter(Boolean);
  assert.ok(grantedFeats("bard-phrenologist").includes("psychic-sensitivity"));
  assert.ok(grantedFeats("cleric-undead-lord").includes("feat-command-undead"));

  const wildborn = archetype("barbarian-wildborn").replacements.flatMap((replacement) => replacement.features);
  assert.deepEqual(wildborn.find((feature) => feature.id === "barbarian-wildborn-weapon-and-armor-proficiencies-1").grantedFeatIds, ["improved-unarmed-strike", "catch-off-guard"]);

  const multipleGrantCases = new Map([
    ["cavalier-green-knight", ["endurance", "diehard"]],
    ["cavalier-spellscar-drifter", ["amateur-gunslinger", "gunsmithing"]],
    ["fighter-high-guardian", ["bodyguard", "in-harms-way"]],
    ["fighter-unbreakable", ["endurance", "diehard"]],
    ["inquisitor-expulsionist", ["alignment-channel", "turn-undead"]],
    ["investigator-steel-hound", ["amateur-gunslinger", "gunsmithing"]],
    ["magus-spire-defender", ["combat-expertise", "dodge"]],
    ["monk-serpent-fire-adept", ["chakra-initiate", "psychic-sensitivity"]],
    ["paladin-holy-gun", ["amateur-gunslinger", "gunsmithing"]],
    ["rogue-makeshift-scrapper", ["catch-off-guard", "throw-anything"]],
  ]);
  for (const [id, expected] of multipleGrantCases) {
    const grants = archetype(id).replacements.flatMap((replacement) => replacement.features).flatMap((feature) => feature.grantedFeatIds ?? []);
    assert.deepEqual(grants, expected, `${id} fixed feat grants`);
  }
});
