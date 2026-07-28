import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bloodlineBonusSpells, bloodlineClassSkills, bloodlinePowersThroughLevel } from "../packages/engine/src/sorcerer-bloodlines.js";

const details = JSON.parse(await readFile(new URL("../packages/data/src/bloodline-details/apg-deep-earth-dreamspun.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const group = bundle.optionGroups.find((optionGroup) => optionGroup.id === "sorcerer-bloodlines");
const deepEarth = group.options.find((option) => option.id === "sorcerer-bloodline-deep-earth");
const dreamspun = group.options.find((option) => option.id === "sorcerer-bloodline-dreamspun");

test("Deep Earth and Dreamspun details merge into the generated catalogue", () => {
  assert.equal(details.bloodlines.length, 2);
  for (const bloodline of [deepEarth, dreamspun]) {
    assert.ok(bloodline);
    assert.equal(bloodline.bonusSpells.length, 9);
    assert.equal(bloodline.bonusFeats.length, 8);
    assert.deepEqual(bloodline.powers.map((power) => power.level), [1, 3, 9, 15, 20]);
  }
  assert.equal(deepEarth.classSkill, "Knowledge (dungeoneering)");
  assert.equal(dreamspun.classSkill, "Sense Motive");
});

test("every Deep Earth and Dreamspun bonus spell resolves at its assigned level", () => {
  for (const bloodline of [deepEarth, dreamspun]) {
    const spells = bloodlineBonusSpells(bundle.spells, bloodline, 19);
    assert.equal(spells.length, 9, `${bloodline.id} resolved spell count`);
    assert.deepEqual(spells.map((spell) => spell.name), bloodline.bonusSpells.map((entry) => entry.name));
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.sorcerer, index + 1, `${spell.name} spell level`);
  }
});

test("Deep Earth and Dreamspun add class skills and unlock capstones", () => {
  assert.deepEqual(bloodlineClassSkills(["Bluff"], deepEarth), ["Bluff", "Knowledge (dungeoneering)"]);
  assert.deepEqual(bloodlineClassSkills(["Bluff"], dreamspun), ["Bluff", "Sense Motive"]);
  assert.deepEqual(bloodlinePowersThroughLevel(deepEarth, 9).map((power) => power.name), ["Tremor", "Rockseer", "Crystal Shard"]);
  assert.equal(bloodlinePowersThroughLevel(deepEarth, 20).at(-1).name, "Strength of Stone");
  assert.equal(bloodlinePowersThroughLevel(dreamspun, 20).at(-1).name, "Solipsism");
});
