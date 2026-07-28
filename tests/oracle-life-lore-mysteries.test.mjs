import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mysteryBonusSpells, revelationsThroughLevel } from "../packages/engine/src/oracle-mysteries.js";

const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const mysteries = bundle.optionGroups.find((group) => group.id === "oracle-mysteries");
const revelations = bundle.optionGroups.find((group) => group.id === "oracle-revelations");
const life = mysteries.options.find((option) => option.id === "oracle-mystery-life");
const lore = mysteries.options.find((option) => option.id === "oracle-mystery-lore");

test("Life and Lore merge their complete APG mystery progressions", () => {
  for (const mystery of [life, lore]) {
    assert.equal(mystery.mysterySpells.length, 9);
    assert.equal(mystery.revelations.length, 10);
    assert.ok(mystery.finalRevelation.length > 150);
    assert.equal(revelations.options.filter((option) => option.mysteryId === mystery.id).length, 10);
  }
  assert.deepEqual(life.classSkills, ["Handle Animal", "Knowledge (nature)", "Survival"]);
  assert.equal(lore.classSkills.length, 11);
});

test("Life and Lore mystery spells resolve at their assigned Oracle levels", () => {
  for (const mystery of [life, lore]) {
    const spells = mysteryBonusSpells(bundle.spells, mystery, 20);
    assert.equal(spells.length, 9);
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.oracle, index + 1);
  }
  assert.equal(mysteryBonusSpells(bundle.spells, life, 10).at(-1).name, "breath of life");
  assert.equal(mysteryBonusSpells(bundle.spells, lore, 12).at(-1).name, "mass owl's wisdom");
});

test("Life and Lore revelations retain their APG minimum levels", () => {
  assert.equal(revelationsThroughLevel(life, 6).length, 8);
  assert.equal(revelationsThroughLevel(life, 7).length, 9);
  assert.equal(revelationsThroughLevel(life, 11).length, 10);
  assert.equal(revelationsThroughLevel(lore, 6).length, 7);
  assert.equal(revelationsThroughLevel(lore, 7).length, 8);
  assert.equal(revelationsThroughLevel(lore, 11).length, 10);
});
