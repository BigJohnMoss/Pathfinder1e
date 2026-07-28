import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mysteryBonusSpells, revelationsThroughLevel } from "../packages/engine/src/oracle-mysteries.js";

const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const mysteries = bundle.optionGroups.find((group) => group.id === "oracle-mysteries");
const revelations = bundle.optionGroups.find((group) => group.id === "oracle-revelations");
const waves = mysteries.options.find((option) => option.id === "oracle-mystery-waves");
const wind = mysteries.options.find((option) => option.id === "oracle-mystery-wind");

test("Waves and Wind complete the ten APG Oracle mysteries", () => {
  assert.equal(mysteries.options.filter((option) => option.mysterySpells?.length === 9).length, 10);
  for (const mystery of [waves, wind]) {
    assert.equal(mystery.mysterySpells.length, 9);
    assert.equal(mystery.revelations.length, 10);
    assert.equal(mystery.classSkills.length, 4);
    assert.ok(mystery.finalRevelation.length > 140);
    assert.equal(revelations.options.filter((option) => option.mysteryId === mystery.id).length, 10);
  }
});

test("Waves and Wind mystery spells resolve at their assigned Oracle levels", () => {
  for (const mystery of [waves, wind]) {
    const spells = mysteryBonusSpells(bundle.spells, mystery, 20);
    assert.equal(spells.length, 9);
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.oracle, index + 1);
  }
  assert.equal(mysteryBonusSpells(bundle.spells, waves, 18).at(-1).name, "tsunami");
  assert.equal(mysteryBonusSpells(bundle.spells, wind, 18).at(-1).name, "winds of vengeance");
});

test("Waves and Wind revelations retain their APG minimum levels", () => {
  assert.equal(revelationsThroughLevel(waves, 6).length, 7);
  assert.equal(revelationsThroughLevel(waves, 7).length, 9);
  assert.equal(revelationsThroughLevel(waves, 11).length, 10);
  assert.equal(revelationsThroughLevel(wind, 2).length, 6);
  assert.equal(revelationsThroughLevel(wind, 3).length, 7);
  assert.equal(revelationsThroughLevel(wind, 7).length, 10);
});

