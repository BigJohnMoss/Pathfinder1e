import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, inferArchetypeSpellcastingAbility, inferArchetypeSpellcastingProgression, spellcastingProgression } from "../packages/engine/src/index.js";
import { spontaneousSpellcastingProgression } from "../packages/engine/src/spontaneous-spellcasting.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const characterClass = (id) => data.classes.find((item) => item.id === id);

test("explicit archetype spellcasting substitutions use the published ability", () => {
  const expected = new Map([
    ["bard-chronicler-of-worlds", "intelligence"],
    ["bard-dwarven-scholar", "wisdom"],
    ["cleric-elder-mythos-cultist", "charisma"],
    ["druid-feyspeaker", "charisma"],
    ["inquisitor-living-grimoire", "intelligence"],
    ["paladin-tortured-crusader", "wisdom"],
    ["ranger-dandy", "charisma"],
  ]);
  for (const [archetypeId, ability] of expected) {
    const selected = archetype(archetypeId);
    assert.equal(inferArchetypeSpellcastingAbility(selected), ability, archetypeId);
    const applied = applyArchetype(characterClass(selected.classId), selected);
    assert.equal(applied.spellcasting?.ability, ability, archetypeId);
    if (applied.spellcasting?.preparedByLevel)
      assert.equal(spellcastingProgression(applied, 8, { abilityScore: 18 })?.ability, ability, archetypeId);
    assert.ok(archetypeAutomationSummary(selected).automated.includes(`Spellcasting ability: ${ability[0].toUpperCase()}${ability.slice(1)}`));
  }
});

test("non-spellcasting ability substitutions do not alter class spellcasting", () => {
  for (const archetypeId of ["fighter-high-guardian", "investigator-empiricist", "kineticist-overwhelming-soul", "monk-water-dancer", "swashbuckler-whirling-dervish"]) {
    const selected = archetype(archetypeId);
    assert.equal(inferArchetypeSpellcastingAbility(selected), undefined, archetypeId);
    assert.equal(applyArchetype(characterClass(selected.classId), selected).spellcasting?.ability, characterClass(selected.classId).spellcasting?.ability, archetypeId);
  }
});

test("the spellcasting substitution parser remains narrowly bounded across the catalogue", () => {
  const inferred = archetypes.filter((item) => inferArchetypeSpellcastingAbility(item));
  assert.deepEqual(inferred.map((item) => item.id), [
    "bard-chronicler-of-worlds",
    "bard-dwarven-scholar",
    "cleric-elder-mythos-cultist",
    "druid-feyspeaker",
    "inquisitor-living-grimoire",
    "paladin-tortured-crusader",
    "ranger-dandy",
  ]);
});

test("Living Grimoire uses Warpriest prepared slots with the Inquisitor list", () => {
  const selected = archetype("inquisitor-living-grimoire");
  assert.deepEqual(inferArchetypeSpellcastingProgression(selected), { classId: "warpriest", minimumLevel: 1 });
  const applied = applyArchetype(characterClass("inquisitor"), selected, data.classes);
  const progression = spellcastingProgression(applied, 8, { abilityScore: 18 });
  const warpriest = spellcastingProgression(characterClass("warpriest"), 8, { abilityScore: 18 });
  assert.equal(applied.spellcasting?.ability, "intelligence");
  assert.equal(applied.spellcasting?.castingType, "prepared");
  assert.equal(applied.spellcasting?.preparesFromSlots, true);
  assert.deepEqual(progression?.slots, warpriest?.slots);
  assert.equal(applied.spellListClassId, undefined);
});

test("Dandy uses gated Medium spontaneous progression with the Bard list", () => {
  const selected = archetype("ranger-dandy");
  assert.deepEqual(inferArchetypeSpellcastingProgression(selected), { classId: "medium", minimumLevel: 4, spellListClassId: "bard" });
  const applied = applyArchetype(characterClass("ranger"), selected, data.classes);
  assert.equal(applied.spellcasting?.ability, "charisma");
  assert.equal(applied.spellcasting?.castingType, "spontaneous");
  assert.equal(applied.spellListClassId, "bard");
  assert.deepEqual(spontaneousSpellcastingProgression(applied, 3, { abilityScore: 18 })?.slots, []);
  assert.deepEqual(
    spontaneousSpellcastingProgression(applied, 4, { abilityScore: 18 })?.slots,
    spontaneousSpellcastingProgression(characterClass("medium"), 4, { abilityScore: 18 })?.slots,
  );
});

test("Questioner uses gated Bard progression and list while retaining Intelligence casting", () => {
  const selected = archetype("investigator-questioner");
  assert.deepEqual(inferArchetypeSpellcastingProgression(selected), { classId: "bard", minimumLevel: 5, spellListClassId: "bard" });
  const applied = applyArchetype(characterClass("investigator"), selected, data.classes);
  assert.equal(applied.spellcasting?.ability, "intelligence");
  assert.equal(applied.spellcasting?.castingType, "spontaneous");
  assert.equal(applied.spellListClassId, "bard");
  assert.deepEqual(spontaneousSpellcastingProgression(applied, 4, { abilityScore: 18 })?.slots, []);
  assert.deepEqual(
    spontaneousSpellcastingProgression(applied, 5, { abilityScore: 18 })?.slots,
    spontaneousSpellcastingProgression(characterClass("bard"), 5, { abilityScore: 18 })?.slots,
  );
});

test("Ley Line Guardian uses Sorcerer spontaneous progression with Intelligence", () => {
  const selected = archetype("witch-ley-line-guardian");
  assert.deepEqual(inferArchetypeSpellcastingProgression(selected), { classId: "sorcerer", minimumLevel: 1 });
  const applied = applyArchetype(characterClass("witch"), selected, data.classes);
  assert.equal(applied.spellcasting?.ability, "intelligence");
  assert.equal(applied.spellcasting?.castingType, "spontaneous");
  assert.equal(applied.spellListClassId, undefined);
  assert.deepEqual(
    spontaneousSpellcastingProgression(applied, 10, { abilityScore: 20 })?.slots,
    spontaneousSpellcastingProgression(characterClass("sorcerer"), 10, { abilityScore: 20 })?.slots,
  );
});

test("alternate spellcasting progression inference is bounded to exact catalogue rules", () => {
  assert.deepEqual(archetypes.filter((item) => inferArchetypeSpellcastingProgression(item)).map((item) => item.id), [
    "inquisitor-living-grimoire",
    "investigator-questioner",
    "ranger-dandy",
    "witch-ley-line-guardian",
  ]);
});
