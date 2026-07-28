import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bloodlineBonusSpells, bloodlineClassSkills, bloodlinePowersThroughLevel } from "../packages/engine/src/sorcerer-bloodlines.js";

const details = JSON.parse(await readFile(new URL("../packages/data/src/bloodline-details/apg-protean-serpentine.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const group = bundle.optionGroups.find((entry) => entry.id === "sorcerer-bloodlines");
const protean = group.options.find((entry) => entry.id === "sorcerer-bloodline-protean");
const serpentine = group.options.find((entry) => entry.id === "sorcerer-bloodline-serpentine");

test("Protean and Serpentine details merge with complete progressions", () => {
  assert.equal(details.bloodlines.length, 2);
  for (const bloodline of [protean, serpentine]) {
    assert.ok(bloodline);
    assert.equal(bloodline.bonusSpells.length, 9);
    assert.equal(bloodline.bonusFeats.length, 8);
    assert.deepEqual(bloodline.powers.map((power) => power.level), [1, 3, 9, 15, 20]);
  }
  assert.deepEqual(bloodlineClassSkills(["Bluff"], protean), ["Bluff", "Knowledge (planes)"]);
  assert.deepEqual(bloodlineClassSkills(["Bluff"], serpentine), ["Bluff", "Diplomacy"]);
});

test("every Protean and Serpentine bonus spell resolves at its assigned level", () => {
  for (const bloodline of [protean, serpentine]) {
    const spells = bloodlineBonusSpells(bundle.spells, bloodline, 19);
    assert.equal(spells.length, 9, `${bloodline.id} resolved spell count`);
    assert.deepEqual(spells.map((spell) => spell.name), bloodline.bonusSpells.map((entry) => entry.name));
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.sorcerer, index + 1);
  }
});

test("Protean and Serpentine powers unlock through their capstones", () => {
  assert.deepEqual(bloodlinePowersThroughLevel(protean, 9).map((power) => power.name), ["Protoplasm", "Protean Resistances", "Reality Wrinkle"]);
  assert.deepEqual(bloodlinePowersThroughLevel(serpentine, 15).map((power) => power.name), ["Serpent's Fang", "Serpentfriend", "Snakeskin", "Den of Vipers"]);
  assert.equal(bloodlinePowersThroughLevel(protean, 20).at(-1).name, "Avatar of Chaos");
  assert.equal(bloodlinePowersThroughLevel(serpentine, 20).at(-1).name, "Scaled Soul");
});
