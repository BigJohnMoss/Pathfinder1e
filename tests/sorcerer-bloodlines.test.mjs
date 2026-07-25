import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bloodlineBonusSpells, bloodlineClassSkills, bloodlinePowersThroughLevel } from "../packages/engine/src/sorcerer-bloodlines.js";
import { normalizeKnownSpells } from "../packages/engine/src/spontaneous-spellcasting.js";

const details = JSON.parse(await readFile(new URL("../packages/data/src/bloodline-details/core-aberrant-abyssal.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const group = bundle.optionGroups.find((optionGroup) => optionGroup.id === "sorcerer-bloodlines");
const aberrant = group.options.find((option) => option.id === "sorcerer-bloodline-aberrant");
const abyssal = group.options.find((option) => option.id === "sorcerer-bloodline-abyssal");
const sorcererSpells = bundle.spells.filter((spell) => spell.levelByClass.sorcerer !== undefined);

test("Aberrant and Abyssal details merge into the generated bloodline catalogue", () => {
  assert.equal(details.bloodlines.length, 2);
  for (const bloodline of [aberrant, abyssal]) {
    assert.ok(bloodline);
    assert.equal(typeof bloodline.classSkill, "string");
    assert.equal(typeof bloodline.arcana, "string");
    assert.equal(bloodline.bonusSpells.length, 9);
    assert.equal(bloodline.bonusFeats.length, 8);
    assert.deepEqual(bloodline.powers.map((power) => power.level), [1, 3, 9, 15, 20]);
  }
  assert.equal(aberrant.classSkill, "Knowledge (dungeoneering)");
  assert.equal(abyssal.classSkill, "Knowledge (planes)");
});

test("bloodline bonus spells unlock at the correct Sorcerer levels", () => {
  assert.deepEqual(bloodlineBonusSpells(sorcererSpells, aberrant, 2), []);
  assert.deepEqual(bloodlineBonusSpells(sorcererSpells, aberrant, 3).map((spell) => spell.name), ["Enlarge Person"]);
  assert.deepEqual(bloodlineBonusSpells(sorcererSpells, abyssal, 3).map((spell) => spell.name), ["Cause Fear"]);
  assert.deepEqual(bloodlineBonusSpells(sorcererSpells, aberrant, 19).map((spell) => spell.name), aberrant.bonusSpells.map((entry) => entry.name));
  assert.deepEqual(bloodlineBonusSpells(sorcererSpells, abyssal, 19).map((spell) => spell.name), abyssal.bonusSpells.map((entry) => entry.name));
});

test("every listed bonus spell resolves to the generated Sorcerer catalogue", () => {
  for (const bloodline of [aberrant, abyssal]) {
    const resolved = bloodlineBonusSpells(sorcererSpells, bloodline, 20);
    assert.equal(resolved.length, 9, `${bloodline.id} resolved spell count`);
    for (const [index, spell] of resolved.entries()) assert.equal(spell.levelByClass.sorcerer, bloodline.bonusSpells[index].spellLevel, `${spell.name} spell level`);
  }
});

test("bloodline class skills augment rather than replace Sorcerer skills", () => {
  const base = ["Bluff", "Spellcraft"];
  assert.deepEqual(bloodlineClassSkills(base, aberrant), ["Bluff", "Spellcraft", "Knowledge (dungeoneering)"]);
  assert.deepEqual(bloodlineClassSkills(base, abyssal), ["Bluff", "Spellcraft", "Knowledge (planes)"]);
  assert.deepEqual(bloodlineClassSkills(["Knowledge (planes)"], abyssal), ["Knowledge (planes)"]);
});

test("bloodline power progression exposes only earned powers", () => {
  assert.deepEqual(bloodlinePowersThroughLevel(aberrant, 1).map((power) => power.name), ["Acidic Ray"]);
  assert.deepEqual(bloodlinePowersThroughLevel(aberrant, 14).map((power) => power.name), ["Acidic Ray", "Long Limbs", "Unusual Anatomy"]);
  assert.deepEqual(bloodlinePowersThroughLevel(abyssal, 20).map((power) => power.name), ["Claws", "Demon Resistances", "Strength of the Abyss", "Added Summonings", "Demonic Might"]);
});

test("granted bloodline spells do not consume normal spells-known capacity", () => {
  const enlargePerson = sorcererSpells.find((spell) => spell.name === "Enlarge Person");
  const magicMissile = sorcererSpells.find((spell) => spell.name === "Magic Missile");
  const mageArmor = sorcererSpells.find((spell) => spell.name === "Mage Armor");
  assert.ok(enlargePerson && magicMissile && mageArmor);
  const normalized = normalizeKnownSpells([enlargePerson.id, magicMissile.id, mageArmor.id], sorcererSpells, "sorcerer", [{ level: 1, count: 2 }], [enlargePerson.id]);
  assert.deepEqual(normalized, [magicMissile.id, mageArmor.id]);
});
