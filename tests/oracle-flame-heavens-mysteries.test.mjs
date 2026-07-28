import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mysteryBonusSpells, revelationsThroughLevel } from "../packages/engine/src/oracle-mysteries.js";

const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const mysteries = bundle.optionGroups.find((group) => group.id === "oracle-mysteries");
const revelations = bundle.optionGroups.find((group) => group.id === "oracle-revelations");
const flame = mysteries.options.find((option) => option.id === "oracle-mystery-flame");
const heavens = mysteries.options.find((option) => option.id === "oracle-mystery-heavens");

test("Flame and Heavens mysteries merge complete APG details", () => {
  for (const mystery of [flame, heavens]) {
    assert.equal(mystery.mysterySpells.length, 9);
    assert.equal(mystery.revelations.length, 10);
    assert.equal(mystery.classSkills.length, 4);
    assert.ok(mystery.finalRevelation.length > 100);
    assert.equal(revelations.options.filter((option) => option.mysteryId === mystery.id).length, 10);
  }
  assert.deepEqual(flame.classSkills, ["Acrobatics", "Climb", "Intimidate", "Perform"]);
  assert.deepEqual(heavens.classSkills, ["Fly", "Knowledge (arcana)", "Perception", "Survival"]);
});

test("Flame and Heavens mystery spells resolve and unlock at even Oracle levels", () => {
  assert.deepEqual(mysteryBonusSpells(bundle.spells, flame, 1), []);
  assert.deepEqual(mysteryBonusSpells(bundle.spells, heavens, 8).map((spell) => spell.name), ["color spray", "hypnotic pattern", "daylight", "rainbow pattern"]);
  for (const mystery of [flame, heavens]) {
    const spells = mysteryBonusSpells(bundle.spells, mystery, 20);
    assert.equal(spells.length, 9);
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.oracle, index + 1);
  }
});

test("Flame and Heavens revelations retain level and curse restrictions", () => {
  assert.equal(revelationsThroughLevel(flame, 6).length, 7);
  assert.equal(revelationsThroughLevel(flame, 7).length, 9);
  assert.equal(revelationsThroughLevel(flame, 11).length, 10);
  assert.equal(revelationsThroughLevel(heavens, 6).length, 8);
  assert.equal(revelationsThroughLevel(heavens, 7).length, 9);
  assert.equal(revelationsThroughLevel(heavens, 11).length, 10);
  assert.deepEqual(revelations.options.find((option) => option.id === "oracle-revelation-cinder-dance").incompatibleOptionIds, ["oracle-curse-lame"]);
});
