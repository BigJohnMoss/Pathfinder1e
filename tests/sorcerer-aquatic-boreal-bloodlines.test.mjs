import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bloodlineBonusSpells, bloodlineClassSkills, bloodlinePowersThroughLevel } from "../packages/engine/src/sorcerer-bloodlines.js";

const details = JSON.parse(await readFile(new URL("../packages/data/src/bloodline-details/apg-aquatic-boreal.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const group = bundle.optionGroups.find((optionGroup) => optionGroup.id === "sorcerer-bloodlines");
const aquatic = group.options.find((option) => option.id === "sorcerer-bloodline-aquatic");
const boreal = group.options.find((option) => option.id === "sorcerer-bloodline-boreal");

test("Aquatic and Boreal details merge into the generated catalogue", () => {
  assert.equal(details.bloodlines.length, 2);
  for (const bloodline of [aquatic, boreal]) {
    assert.ok(bloodline);
    assert.equal(typeof bloodline.classSkill, "string");
    assert.equal(typeof bloodline.arcana, "string");
    assert.equal(bloodline.bonusSpells.length, 9);
    assert.equal(bloodline.bonusFeats.length, 8);
    assert.deepEqual(bloodline.powers.map((power) => power.level), [1, 3, 9, 15, 20]);
  }
  assert.equal(aquatic.classSkill, "Swim");
  assert.equal(boreal.classSkill, "Survival");
});

test("every Aquatic and Boreal bonus spell resolves at its assigned level", () => {
  for (const bloodline of [aquatic, boreal]) {
    const spells = bloodlineBonusSpells(bundle.spells, bloodline, 19);
    assert.equal(spells.length, 9, `${bloodline.id} resolved spell count`);
    assert.deepEqual(spells.map((spell) => spell.name), bloodline.bonusSpells.map((entry) => entry.name));
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.sorcerer, index + 1, `${spell.name} spell level`);
  }
});

test("Aquatic and Boreal add their class skills without duplicates", () => {
  assert.deepEqual(bloodlineClassSkills(["Bluff"], aquatic), ["Bluff", "Swim"]);
  assert.deepEqual(bloodlineClassSkills(["Bluff"], boreal), ["Bluff", "Survival"]);
  assert.deepEqual(bloodlineClassSkills(["Swim"], aquatic), ["Swim"]);
});

test("Aquatic and Boreal powers unlock through their capstones", () => {
  assert.deepEqual(bloodlinePowersThroughLevel(aquatic, 9).map((power) => power.name), ["Dehydrating Touch", "Aquatic Adaptation", "Aquatic Telepathy"]);
  assert.deepEqual(bloodlinePowersThroughLevel(boreal, 15).map((power) => power.name), ["Cold Steel", "Icewalker", "Snow Shroud", "Blizzard"]);
  assert.equal(bloodlinePowersThroughLevel(aquatic, 20).at(-1).name, "Deep One");
  assert.equal(bloodlinePowersThroughLevel(boreal, 20).at(-1).name, "Child of Ancient Winters");
});
