import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mysteryBonusSpells, revelationsThroughLevel } from "../packages/engine/src/oracle-mysteries.js";

const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const mysteries = bundle.optionGroups.find((group) => group.id === "oracle-mysteries");
const revelations = bundle.optionGroups.find((group) => group.id === "oracle-revelations");
const nature = mysteries.options.find((option) => option.id === "oracle-mystery-nature");
const stone = mysteries.options.find((option) => option.id === "oracle-mystery-stone");

test("Nature and Stone merge their complete APG mystery progressions", () => {
  for (const mystery of [nature, stone]) {
    assert.equal(mystery.mysterySpells.length, 9);
    assert.equal(mystery.revelations.length, 10);
    assert.ok(mystery.finalRevelation.length > 140);
    assert.equal(revelations.options.filter((option) => option.mysteryId === mystery.id).length, 10);
  }
  assert.deepEqual(nature.classSkills, ["Climb", "Fly", "Knowledge (nature)", "Ride", "Survival", "Swim"]);
  assert.deepEqual(stone.classSkills, ["Appraise", "Climb", "Intimidate", "Survival"]);
});

test("Nature and Stone mystery spells resolve at their assigned Oracle levels", () => {
  for (const mystery of [nature, stone]) {
    const spells = mysteryBonusSpells(bundle.spells, mystery, 20);
    assert.equal(spells.length, 9);
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.oracle, index + 1);
  }
  assert.equal(mysteryBonusSpells(bundle.spells, nature, 18).at(-1).name, "world wave");
  assert.equal(mysteryBonusSpells(bundle.spells, stone, 18).at(-1).name, "clashing rocks");
});

test("Nature and Stone revelations retain their APG minimum levels", () => {
  assert.equal(revelationsThroughLevel(nature, 6).length, 8);
  assert.equal(revelationsThroughLevel(nature, 7).length, 9);
  assert.equal(revelationsThroughLevel(nature, 11).length, 10);
  assert.equal(revelationsThroughLevel(stone, 6).length, 8);
  assert.equal(revelationsThroughLevel(stone, 7).length, 10);
});
