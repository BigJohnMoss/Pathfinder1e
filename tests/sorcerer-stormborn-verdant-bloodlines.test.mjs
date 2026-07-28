import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bloodlineBonusSpells, bloodlineClassSkills, bloodlinePowersThroughLevel } from "../packages/engine/src/sorcerer-bloodlines.js";

const details = JSON.parse(await readFile(new URL("../packages/data/src/bloodline-details/apg-stormborn-verdant.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const group = bundle.optionGroups.find((entry) => entry.id === "sorcerer-bloodlines");
const stormborn = group.options.find((entry) => entry.id === "sorcerer-bloodline-stormborn");
const verdant = group.options.find((entry) => entry.id === "sorcerer-bloodline-verdant");

test("Stormborn and Verdant complete the ten-entry APG catalogue", () => {
  assert.equal(details.bloodlines.length, 2);
  const apgIds = group.options.filter((entry) => entry.source?.title === "Advanced Player's Guide").map((entry) => entry.id);
  assert.deepEqual(apgIds, [
    "sorcerer-bloodline-aquatic", "sorcerer-bloodline-boreal", "sorcerer-bloodline-deep-earth",
    "sorcerer-bloodline-dreamspun", "sorcerer-bloodline-protean", "sorcerer-bloodline-serpentine",
    "sorcerer-bloodline-shadow", "sorcerer-bloodline-starsoul", "sorcerer-bloodline-stormborn",
    "sorcerer-bloodline-verdant"
  ]);
  for (const bloodline of [stormborn, verdant]) {
    assert.equal(bloodline.bonusSpells.length, 9);
    assert.equal(bloodline.bonusFeats.length, 8);
    assert.deepEqual(bloodline.powers.map((power) => power.level), [1, 3, 9, 15, 20]);
  }
});

test("every Stormborn and Verdant bonus spell resolves at its assigned level", () => {
  for (const bloodline of [stormborn, verdant]) {
    const spells = bloodlineBonusSpells(bundle.spells, bloodline, 19);
    assert.equal(spells.length, 9, `${bloodline.id} resolved spell count`);
    assert.deepEqual(spells.map((spell) => spell.name), bloodline.bonusSpells.map((entry) => entry.name));
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.sorcerer, index + 1);
  }
});

test("Stormborn and Verdant class skills and powers reach their capstones", () => {
  assert.deepEqual(bloodlineClassSkills(["Bluff"], stormborn), ["Bluff", "Knowledge (nature)"]);
  assert.deepEqual(bloodlineClassSkills(["Knowledge (nature)"], verdant), ["Knowledge (nature)"]);
  assert.deepEqual(bloodlinePowersThroughLevel(stormborn, 9).map((power) => power.name), ["Thunderstaff", "Stormchild", "Thunderbolt"]);
  assert.equal(bloodlinePowersThroughLevel(stormborn, 20).at(-1).name, "Storm Lord");
  assert.equal(bloodlinePowersThroughLevel(verdant, 20).at(-1).name, "Shepherd of the Trees");
});
