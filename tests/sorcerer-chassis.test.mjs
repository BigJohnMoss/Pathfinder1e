import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeKnownSpells, spontaneousSpellcastingProgression } from "../packages/engine/src/spontaneous-spellcasting.js";

const sorcerer = JSON.parse(await readFile(new URL("../packages/data/src/classes/sorcerer.json", import.meta.url), "utf8"));
const bloodlines = JSON.parse(await readFile(new URL("../packages/data/src/options/sorcerer-bloodlines.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const sorcererSpells = bundle.spells.filter((spell) => spell.levelByClass.sorcerer !== undefined);
const wizardSpells = bundle.spells.filter((spell) => spell.levelByClass.wizard !== undefined);

test("Sorcerer has the complete Core chassis", () => {
  assert.equal(sorcerer.hitDie, 6);
  assert.equal(sorcerer.babProgression, "half");
  assert.deepEqual(sorcerer.saves, { fortitude: "poor", reflex: "poor", will: "good" });
  assert.equal(sorcerer.skillRanksPerLevel, 2);
  assert.equal(sorcerer.spellcasting.ability, "charisma");
  assert.equal(sorcerer.spellcasting.castingType, "spontaneous");
  assert.equal(sorcerer.spellcasting.slotsByLevel.length, 20);
  assert.equal(sorcerer.spellcasting.knownByLevel.length, 20);
  assert.deepEqual(sorcerer.spellcasting.knownByLevel[0], [4,2,0,0,0,0,0,0,0,0]);
  assert.deepEqual(sorcerer.spellcasting.knownByLevel[17], [9,5,5,4,4,4,3,3,2,1]);
  assert.deepEqual(sorcerer.spellcasting.knownByLevel[19], [9,5,5,4,4,4,3,3,3,3]);
});

test("Sorcerer progression calculates spontaneous slots and spells known", () => {
  const first = spontaneousSpellcastingProgression(sorcerer, 1, { abilityScore: 12 });
  assert.equal(first.maximumSpellLevel, 1);
  assert.deepEqual(first.slots, [{ level: 1, base: 3, bonus: 1, count: 4 }]);
  assert.deepEqual(first.known, [{ level: 0, count: 4 }, { level: 1, count: 2 }]);

  const fourth = spontaneousSpellcastingProgression(sorcerer, 4, { abilityScore: 14 });
  assert.equal(fourth.maximumSpellLevel, 2);
  assert.deepEqual(fourth.slots, [
    { level: 1, base: 6, bonus: 1, count: 7 },
    { level: 2, base: 3, bonus: 1, count: 4 }
  ]);
  assert.deepEqual(fourth.known, [{ level: 0, count: 6 }, { level: 1, count: 3 }, { level: 2, count: 1 }]);

  const eighteenth = spontaneousSpellcastingProgression(sorcerer, 18, { abilityScore: 28 });
  assert.equal(eighteenth.maximumSpellLevel, 9);
  assert.equal(eighteenth.slots.find((entry) => entry.level === 9).base, 3);
  assert.equal(eighteenth.known.find((entry) => entry.level === 9).count, 1);
});

test("Sorcerer receives the complete shared Sorcerer/Wizard spell list", () => {
  assert.ok(sorcererSpells.length > 1000, `expected broad Sorcerer spell coverage, found ${sorcererSpells.length}`);
  assert.equal(sorcererSpells.length, wizardSpells.length);
  const sorcererLevels = new Map(sorcererSpells.map((spell) => [spell.id, spell.levelByClass.sorcerer]));
  const mismatches = wizardSpells.filter((spell) => sorcererLevels.get(spell.id) !== spell.levelByClass.wizard).map((spell) => spell.id);
  assert.deepEqual(mismatches, []);
});

test("Core Sorcerer bloodline selection exposes ten identities", () => {
  assert.equal(bloodlines.id, "sorcerer-bloodlines");
  assert.equal(bloodlines.options.length, 10);
  assert.deepEqual(bloodlines.options.map((option) => option.id), [
    "sorcerer-bloodline-aberrant",
    "sorcerer-bloodline-abyssal",
    "sorcerer-bloodline-arcane",
    "sorcerer-bloodline-celestial",
    "sorcerer-bloodline-destined",
    "sorcerer-bloodline-draconic",
    "sorcerer-bloodline-elemental",
    "sorcerer-bloodline-fey",
    "sorcerer-bloodline-infernal",
    "sorcerer-bloodline-undead"
  ]);
  assert.ok(bloodlines.options.every((option) => option.classIds.includes("sorcerer") && option.minimumLevel === 1));
});

test("Sorcerer bloodline milestones reach level 20", () => {
  const powerLevels = sorcerer.features.filter((feature) => feature.id.startsWith("sorcerer-bloodline-power-")).map((feature) => feature.level);
  const spellLevels = sorcerer.features.filter((feature) => feature.id.startsWith("sorcerer-bloodline-spell-")).map((feature) => feature.level);
  const featLevels = sorcerer.features.filter((feature) => feature.id.startsWith("sorcerer-bloodline-feat-")).map((feature) => feature.level);
  assert.deepEqual(powerLevels, [1,3,9,15,20]);
  assert.deepEqual(spellLevels, [3,5,7,9,11,13,15,17,19]);
  assert.deepEqual(featLevels, [7,13,19]);
  assert.ok(sorcerer.features.some((feature) => feature.id === "eschew-materials-1"));
});

test("known-spell normalization enforces unique per-level limits", () => {
  const spells = [
    { id: "cantrip-a", levelByClass: { sorcerer: 0 } },
    { id: "cantrip-b", levelByClass: { sorcerer: 0 } },
    { id: "spell-a", levelByClass: { sorcerer: 1 } },
    { id: "spell-b", levelByClass: { sorcerer: 1 } },
    { id: "spell-c", levelByClass: { sorcerer: 1 } }
  ];
  assert.deepEqual(normalizeKnownSpells(["cantrip-a", "cantrip-a", "cantrip-b", "spell-a", "spell-b", "spell-c", "missing"], spells, "sorcerer", [{ level: 0, count: 2 }, { level: 1, count: 2 }]), ["cantrip-a", "cantrip-b", "spell-a", "spell-b"]);
});
