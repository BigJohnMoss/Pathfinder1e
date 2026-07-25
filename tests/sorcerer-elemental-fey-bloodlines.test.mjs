import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bloodlineBonusSpells, bloodlineClassSkills, bloodlinePowersThroughLevel } from "../packages/engine/src/sorcerer-bloodlines.js";

const details = JSON.parse(await readFile(new URL("../packages/data/src/bloodline-details/core-elemental-fey.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const group = bundle.optionGroups.find((optionGroup) => optionGroup.id === "sorcerer-bloodlines");
const elemental = group.options.find((option) => option.id === "sorcerer-bloodline-elemental");
const fey = group.options.find((option) => option.id === "sorcerer-bloodline-fey");

test("Elemental and Fey details merge into the generated catalogue", () => {
  assert.equal(details.bloodlines.length, 2);
  for (const bloodline of [elemental, fey]) {
    assert.ok(bloodline);
    assert.equal(typeof bloodline.classSkill, "string");
    assert.equal(typeof bloodline.arcana, "string");
    assert.equal(bloodline.bonusSpells.length, 9);
    assert.equal(bloodline.bonusFeats.length, 8);
    assert.deepEqual(bloodline.powers.map((power) => power.level), [1, 3, 9, 15, 20]);
  }
  assert.equal(elemental.classSkill, "Knowledge (planes)");
  assert.equal(fey.classSkill, "Knowledge (nature)");
});

test("Elemental exposes the four Core elements with energy and movement benefits", () => {
  assert.deepEqual(elemental.variants, [
    { id: "air-element", name: "Air", energyType: "electricity", movement: "Fly 60 feet (average)" },
    { id: "earth-element", name: "Earth", energyType: "acid", movement: "Burrow 30 feet" },
    { id: "fire-element", name: "Fire", energyType: "fire", movement: "+30 feet base speed" },
    { id: "water-element", name: "Water", energyType: "cold", movement: "Swim 60 feet" }
  ]);
});

test("every Elemental and Fey bonus spell resolves from the generated catalogue", () => {
  const missing = Object.fromEntries([elemental, fey].map((bloodline) => {
    const resolvedNames = new Set(bloodlineBonusSpells(bundle.spells, bloodline, 19).map((spell) => spell.name));
    return [bloodline.id, bloodline.bonusSpells.map((entry) => entry.name).filter((name) => !resolvedNames.has(name))];
  }));
  assert.deepEqual(missing, {
    "sorcerer-bloodline-elemental": [],
    "sorcerer-bloodline-fey": []
  });
});

test("Elemental and Fey spells use assigned levels and class skills", () => {
  for (const bloodline of [elemental, fey]) {
    const spells = bloodlineBonusSpells(bundle.spells, bloodline, 19);
    assert.equal(spells.length, 9);
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.sorcerer, index + 1);
  }
  assert.deepEqual(bloodlineClassSkills(["Bluff"], elemental), ["Bluff", "Knowledge (planes)"]);
  assert.deepEqual(bloodlineClassSkills(["Bluff"], fey), ["Bluff", "Knowledge (nature)"]);
});

test("Elemental and Fey power progression exposes earned powers", () => {
  assert.deepEqual(bloodlinePowersThroughLevel(elemental, 9).map((power) => power.name), ["Elemental Ray", "Elemental Resistance", "Elemental Blast"]);
  assert.deepEqual(bloodlinePowersThroughLevel(fey, 15).map((power) => power.name), ["Laughing Touch", "Woodland Stride", "Fleeting Glance", "Fey Magic"]);
  assert.equal(bloodlinePowersThroughLevel(fey, 20).at(-1).name, "Soul of the Fey");
});
