import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, inferArchetypeSpellcastingAbility, spellcastingProgression } from "../packages/engine/src/index.js";

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
