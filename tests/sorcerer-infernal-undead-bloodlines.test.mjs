import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bloodlineBonusSpells, bloodlineClassSkills, bloodlinePowersThroughLevel } from "../packages/engine/src/sorcerer-bloodlines.js";

const details = JSON.parse(await readFile(new URL("../packages/data/src/bloodline-details/core-infernal-undead.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const group = bundle.optionGroups.find((optionGroup) => optionGroup.id === "sorcerer-bloodlines");
const infernal = group.options.find((option) => option.id === "sorcerer-bloodline-infernal");
const undead = group.options.find((option) => option.id === "sorcerer-bloodline-undead");

test("Infernal and Undead details merge into the generated catalogue", () => {
  assert.equal(details.bloodlines.length, 2);
  for (const bloodline of [infernal, undead]) {
    assert.ok(bloodline);
    assert.equal(typeof bloodline.classSkill, "string");
    assert.equal(typeof bloodline.arcana, "string");
    assert.equal(bloodline.bonusSpells.length, 9);
    assert.equal(bloodline.bonusFeats.length, 8);
    assert.deepEqual(bloodline.powers.map((power) => power.level), [1, 3, 9, 15, 20]);
  }
  assert.equal(infernal.classSkill, "Diplomacy");
  assert.equal(undead.classSkill, "Knowledge (religion)");
});

test("every Infernal and Undead bonus spell resolves from the generated catalogue", () => {
  const missing = Object.fromEntries([infernal, undead].map((bloodline) => {
    const resolvedNames = new Set(bloodlineBonusSpells(bundle.spells, bloodline, 19).map((spell) => spell.name));
    return [bloodline.id, bloodline.bonusSpells.map((entry) => entry.name).filter((name) => !resolvedNames.has(name))];
  }));
  assert.deepEqual(missing, {
    "sorcerer-bloodline-infernal": [],
    "sorcerer-bloodline-undead": []
  });
});

test("Infernal and Undead spells use assigned levels and class skills", () => {
  for (const bloodline of [infernal, undead]) {
    const spells = bloodlineBonusSpells(bundle.spells, bloodline, 19);
    assert.equal(spells.length, 9);
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.sorcerer, index + 1);
  }
  assert.deepEqual(bloodlineClassSkills(["Bluff"], infernal), ["Bluff", "Diplomacy"]);
  assert.deepEqual(bloodlineClassSkills(["Bluff"], undead), ["Bluff", "Knowledge (religion)"]);
});

test("Infernal and Undead power progression exposes earned powers", () => {
  assert.deepEqual(bloodlinePowersThroughLevel(infernal, 9).map((power) => power.name), ["Corrupting Touch", "Infernal Resistances", "Hellfire"]);
  assert.deepEqual(bloodlinePowersThroughLevel(undead, 15).map((power) => power.name), ["Grave Touch", "Death's Gift", "Grasp of the Dead", "Incorporeal Form"]);
  assert.equal(bloodlinePowersThroughLevel(infernal, 20).at(-1).name, "Power of the Pit");
  assert.equal(bloodlinePowersThroughLevel(undead, 20).at(-1).name, "One of Us");
});
