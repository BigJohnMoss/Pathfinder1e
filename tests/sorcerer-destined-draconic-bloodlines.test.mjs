import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bloodlineBonusSpells, bloodlineClassSkills, bloodlinePowersThroughLevel } from "../packages/engine/src/sorcerer-bloodlines.js";

const details = JSON.parse(await readFile(new URL("../packages/data/src/bloodline-details/core-destined-draconic.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const group = bundle.optionGroups.find((optionGroup) => optionGroup.id === "sorcerer-bloodlines");
const destined = group.options.find((option) => option.id === "sorcerer-bloodline-destined");
const draconic = group.options.find((option) => option.id === "sorcerer-bloodline-draconic");

test("Destined and Draconic details merge into the generated catalogue", () => {
  assert.equal(details.bloodlines.length, 2);
  for (const bloodline of [destined, draconic]) {
    assert.ok(bloodline);
    assert.equal(typeof bloodline.classSkill, "string");
    assert.equal(typeof bloodline.arcana, "string");
    assert.equal(bloodline.bonusSpells.length, 9);
    assert.equal(bloodline.bonusFeats.length, 8);
    assert.deepEqual(bloodline.powers.map((power) => power.level), [1, 3, 9, 15, 20]);
  }
  assert.equal(destined.classSkill, "Knowledge (history)");
  assert.equal(draconic.classSkill, "Perception");
});

test("Draconic exposes all ten Core dragon types with energy and breath shapes", () => {
  assert.equal(draconic.variants.length, 10);
  assert.deepEqual(draconic.variants.map((variant) => variant.id), [
    "black-dragon", "blue-dragon", "green-dragon", "red-dragon", "white-dragon",
    "brass-dragon", "bronze-dragon", "copper-dragon", "gold-dragon", "silver-dragon"
  ]);
  assert.deepEqual(draconic.variants.find((variant) => variant.id === "red-dragon"), {
    id: "red-dragon", name: "Red Dragon", energyType: "fire", breathShape: "30-foot cone"
  });
  assert.deepEqual(draconic.variants.find((variant) => variant.id === "blue-dragon"), {
    id: "blue-dragon", name: "Blue Dragon", energyType: "electricity", breathShape: "60-foot line"
  });
});

test("every Destined and Draconic bonus spell resolves from the generated catalogue", () => {
  const missing = Object.fromEntries([destined, draconic].map((bloodline) => {
    const resolvedNames = new Set(bloodlineBonusSpells(bundle.spells, bloodline, 19).map((spell) => spell.name));
    return [bloodline.id, bloodline.bonusSpells.map((entry) => entry.name).filter((name) => !resolvedNames.has(name))];
  }));
  assert.deepEqual(missing, {
    "sorcerer-bloodline-destined": [],
    "sorcerer-bloodline-draconic": []
  });
});

test("Destined and Draconic spells use assigned levels and class skills", () => {
  for (const bloodline of [destined, draconic]) {
    const spells = bloodlineBonusSpells(bundle.spells, bloodline, 19);
    assert.equal(spells.length, 9);
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.sorcerer, index + 1);
  }
  assert.deepEqual(bloodlineClassSkills(["Bluff"], destined), ["Bluff", "Knowledge (history)"]);
  assert.deepEqual(bloodlineClassSkills(["Bluff"], draconic), ["Bluff", "Perception"]);
});

test("Destined and Draconic power progression exposes earned powers", () => {
  assert.deepEqual(bloodlinePowersThroughLevel(destined, 9).map((power) => power.name), ["Touch of Destiny", "Fated", "It Was Meant To Be"]);
  assert.deepEqual(bloodlinePowersThroughLevel(draconic, 15).map((power) => power.name), ["Claws", "Dragon Resistances", "Breath Weapon", "Wings"]);
  assert.equal(bloodlinePowersThroughLevel(draconic, 20).at(-1).name, "Power of Wyrms");
});
