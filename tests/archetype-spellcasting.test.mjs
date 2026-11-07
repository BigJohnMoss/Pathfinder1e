import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, archetypeAutomationSummary, inferArchetypeSpellcastingAbility, inferArchetypeSpellcastingProfile, inferArchetypeSpellcastingProgression, spellcastingProgression, spellcastingTradition } from "../packages/engine/src/index.js";
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
    ["investigator-psychic-detective", "intelligence"],
    ["investigator-questioner", "intelligence"],
    ["magus-eldritch-scion", "charisma"],
    ["magus-mindblade", "intelligence"],
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
    "investigator-psychic-detective",
    "investigator-questioner",
    "magus-eldritch-scion",
    "magus-mindblade",
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

test("Questioner uses Bard progression and list from 1st level while retaining Intelligence casting", () => {
  const selected = archetype("investigator-questioner");
  assert.deepEqual(inferArchetypeSpellcastingProgression(selected), { classId: "bard", minimumLevel: 1, spellListClassId: "bard" });
  const applied = applyArchetype(characterClass("investigator"), selected, data.classes);
  assert.equal(applied.spellcasting?.ability, "intelligence");
  assert.equal(applied.spellcasting?.castingType, "spontaneous");
  assert.equal(applied.spellListClassId, "bard");
  assert.deepEqual(
    spontaneousSpellcastingProgression(applied, 1, { abilityScore: 18 })?.slots,
    spontaneousSpellcastingProgression(characterClass("bard"), 1, { abilityScore: 18 })?.slots,
  );
});

test("complete alternate spellcasting profiles apply list, progression, ability, mode, and tradition", () => {
  const expected = new Map([
    ["bard-speaker-of-the-palatine-eye", { spellListClassId: "mesmerist", tradition: "psychic" }],
    ["investigator-questioner", { ability: "intelligence", progressionClassId: "bard", spellListClassId: "bard", minimumLevel: 1, castingType: "spontaneous", tradition: "arcane" }],
    ["magus-eldritch-scion", { ability: "charisma", progressionClassId: "bard", spellListClassId: "magus", minimumLevel: 1, castingType: "spontaneous", tradition: "arcane" }],
    ["magus-mindblade", { ability: "intelligence", progressionClassId: "bard", spellListClassId: "magus", minimumLevel: 1, castingType: "spontaneous", tradition: "psychic" }],
  ]);
  for (const [id, profile] of expected) {
    const selected = archetype(id);
    assert.deepEqual(inferArchetypeSpellcastingProfile(selected), profile, id);
    const applied = applyArchetype(characterClass(selected.classId), selected, data.classes, data.spells);
    assert.equal(applied.spellListClassId, profile.spellListClassId, `${id} list`);
    assert.equal(spellcastingTradition(applied), profile.tradition, `${id} tradition`);
    if (profile.ability) assert.equal(applied.spellcasting?.ability, profile.ability, `${id} ability`);
    if (profile.castingType) assert.equal(applied.spellcasting?.castingType, profile.castingType, `${id} mode`);
    const spellFeature = selected.replacements.flatMap((replacement) => replacement.features).find((feature) => feature.name === "Spells");
    assert.equal(archetypeAutomationSummary(selected, data.feats, data.spells).manual.includes(`Spells (level ${spellFeature.level})`), false, id);
  }
});

test("Pearl Seeker uses gated Bloodrager spontaneous progression and its Paladin spell additions", () => {
  const selected = archetype("paladin-pearl-seeker");
  assert.deepEqual(inferArchetypeSpellcastingProfile(selected), {
    progressionClassId: "bloodrager",
    minimumLevel: 7,
    castingType: "spontaneous",
    tradition: "divine",
  });
  const applied = applyArchetype(characterClass("paladin"), selected, data.classes, data.spells);
  assert.equal(applied.spellcasting?.castingType, "spontaneous");
  assert.equal(spellcastingTradition(applied), "divine");
  assert.deepEqual(spontaneousSpellcastingProgression(applied, 6, { abilityScore: 18 })?.slots, []);
  assert.deepEqual(
    spontaneousSpellcastingProgression(applied, 7, { abilityScore: 18 })?.slots,
    spontaneousSpellcastingProgression(characterClass("bloodrager"), 7, { abilityScore: 18 })?.slots,
  );
  assert.equal(archetypeAutomationSummary(selected, data.feats, data.spells).manual.includes("Vision Magic (level 7)"), false);
});

test("partially covered spellcasting profiles retain unmodeled spell-table rules", () => {
  const selected = archetype("investigator-psychic-detective");
  const applied = applyArchetype(characterClass("investigator"), selected, data.classes, data.spells);
  assert.equal(applied.spellcasting?.castingType, "spontaneous");
  assert.equal(spellcastingTradition(applied), "psychic");
  assert.equal(applied.spellListClassId, "psychic");
  assert.equal(archetypeAutomationSummary(selected, data.feats, data.spells).manual.includes("Spells (level 5)"), true);
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
    "investigator-psychic-detective",
    "investigator-questioner",
    "magus-eldritch-scion",
    "magus-mindblade",
    "paladin-pearl-seeker",
    "ranger-dandy",
    "witch-ley-line-guardian",
  ]);
});
