import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mysteryBonusSpells, revelationsThroughLevel } from "../packages/engine/src/oracle-mysteries.js";

const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const mysteries = bundle.optionGroups.find((group) => group.id === "oracle-mysteries");
const revelations = bundle.optionGroups.find((group) => group.id === "oracle-revelations");
const battle = mysteries.options.find((option) => option.id === "oracle-mystery-battle");
const bones = mysteries.options.find((option) => option.id === "oracle-mystery-bones");

test("Battle and Bones mysteries merge complete APG details", () => {
  for (const mystery of [battle, bones]) {
    assert.equal(mystery.mysterySpells.length, 9);
    assert.equal(mystery.revelations.length, 10);
    assert.equal(mystery.classSkills.length, 4);
    assert.ok(mystery.finalRevelation.length > 80);
  }
  assert.deepEqual(battle.classSkills, ["Intimidate", "Knowledge (engineering)", "Perception", "Ride"]);
  assert.deepEqual(bones.classSkills, ["Bluff", "Disguise", "Intimidate", "Stealth"]);
  assert.equal(revelations.options.filter((option) => option.mysteryId === battle.id).length, 10);
  assert.equal(revelations.options.filter((option) => option.mysteryId === bones.id).length, 10);
});

test("Battle and Bones mystery spells unlock at even Oracle levels without consuming known limits", () => {
  assert.deepEqual(mysteryBonusSpells(bundle.spells, battle, 1), []);
  assert.deepEqual(mysteryBonusSpells(bundle.spells, battle, 8).map((spell) => spell.name), ["enlarge person", "fog cloud", "magic vestment", "wall of fire"]);
  assert.deepEqual(mysteryBonusSpells(bundle.spells, battle, 8, "oracle", [4, 8]).map((spell) => spell.name), ["enlarge person", "magic vestment"]);
  assert.deepEqual(mysteryBonusSpells(bundle.spells, bones, 18).map((spell) => spell.name), bones.mysterySpells.map((entry) => entry.name));
  for (const mystery of [battle, bones]) {
    const spells = mysteryBonusSpells(bundle.spells, mystery, 20);
    assert.equal(spells.length, 9);
    for (const [index, spell] of spells.entries()) assert.equal(spell.levelByClass.oracle, index + 1);
  }
});

test("level-gated revelations expose only powers the Oracle may select", () => {
  assert.equal(revelationsThroughLevel(battle, 1).length, 8);
  assert.equal(revelationsThroughLevel(battle, 7).length, 9);
  assert.equal(revelationsThroughLevel(battle, 11).length, 10);
  assert.equal(revelationsThroughLevel(bones, 6).length, 8);
  assert.equal(revelationsThroughLevel(bones, 7).length, 9);
  assert.equal(revelationsThroughLevel(bones, 11).length, 10);
});
