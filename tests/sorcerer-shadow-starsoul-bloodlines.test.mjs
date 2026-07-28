import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bloodlineBonusSpells, bloodlineClassSkills, bloodlinePowersThroughLevel } from "../packages/engine/src/sorcerer-bloodlines.js";

const details = JSON.parse(await readFile(new URL("../packages/data/src/bloodline-details/apg-shadow-starsoul.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const group = bundle.optionGroups.find((entry) => entry.id === "sorcerer-bloodlines");
const shadow = group.options.find((entry) => entry.id === "sorcerer-bloodline-shadow");
const starsoul = group.options.find((entry) => entry.id === "sorcerer-bloodline-starsoul");

test("Shadow and Starsoul details merge with complete progressions", () => {
  assert.equal(details.bloodlines.length, 2);
  for (const bloodline of [shadow, starsoul]) {
    assert.ok(bloodline);
    assert.equal(bloodline.bonusSpells.length, 9);
    assert.deepEqual(bloodline.powers.map((power) => power.level), [1, 3, 9, 15, 20]);
  }
  assert.equal(shadow.bonusFeats.length, 8);
  assert.equal(starsoul.bonusFeats.length, 10);
  assert.deepEqual(bloodlineClassSkills(["Bluff"], shadow), ["Bluff", "Stealth"]);
  assert.deepEqual(bloodlineClassSkills(["Bluff"], starsoul), ["Bluff", "Knowledge (nature)"]);
});

test("every Shadow and Starsoul bonus spell resolves at its assigned level", () => {
  for (const bloodline of [shadow, starsoul]) {
    const spells = bloodlineBonusSpells(bundle.spells, bloodline, 19);
    assert.equal(spells.length, 9, `${bloodline.id} resolved spell count`);
    assert.deepEqual(spells.map((spell) => spell.name), bloodline.bonusSpells.map((entry) => entry.name));
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.sorcerer, index + 1);
  }
});

test("Shadow and Starsoul powers unlock through their capstones", () => {
  assert.deepEqual(bloodlinePowersThroughLevel(shadow, 9).map((power) => power.name), ["Shadowstrike", "Nighteye", "Shadow Well"]);
  assert.deepEqual(bloodlinePowersThroughLevel(starsoul, 15).map((power) => power.name), ["Minute Meteors", "Voidwalker", "Aurora Borealis", "Breaching the Gulf"]);
  assert.equal(bloodlinePowersThroughLevel(shadow, 20).at(-1).name, "Shadow Master");
  assert.equal(bloodlinePowersThroughLevel(starsoul, 20).at(-1).name, "Starborn");
});
