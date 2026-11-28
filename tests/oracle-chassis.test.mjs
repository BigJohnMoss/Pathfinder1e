import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeKnownSpells, spontaneousSpellcastingProgression } from "../packages/engine/src/spontaneous-spellcasting.js";
import { spellsAvailableToClass } from "../packages/engine/src/index.js";
import { oracleCureInflictSpells } from "../packages/engine/src/oracle-spellcasting.js";

const oracle = JSON.parse(await readFile(new URL("../packages/data/src/classes/oracle.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const group = (id) => bundle.optionGroups.find((entry) => entry.id === id);

test("Oracle has its complete level 1-20 APG chassis", () => {
  assert.equal(oracle.hitDie, 8);
  assert.equal(oracle.babProgression, "three-quarters");
  assert.deepEqual(oracle.saves, { fortitude: "poor", reflex: "poor", will: "good" });
  assert.equal(oracle.skillRanksPerLevel, 4);
  assert.equal(oracle.spellcasting.ability, "charisma");
  assert.equal(oracle.spellcasting.castingType, "spontaneous");
  assert.equal(oracle.spellcasting.slotsByLevel.length, 20);
  assert.equal(oracle.spellcasting.knownByLevel.length, 20);
  assert.deepEqual(oracle.spellcasting.slotsByLevel[0], [3,0,0,0,0,0,0,0,0]);
  assert.deepEqual(oracle.spellcasting.knownByLevel[19], [9,5,5,4,4,4,3,3,3,3]);
  assert.deepEqual(oracle.features.filter((feature) => feature.id.startsWith("oracle-revelation-")).map((feature) => feature.level), [1,3,7,11,15,19]);
  assert.ok(oracle.features.some((feature) => feature.id === "oracle-final-revelation-20"));
});

test("Oracle casts its exact sourced spell list spontaneously", () => {
  const first = spontaneousSpellcastingProgression(oracle, 1, { abilityScore: 16 });
  assert.equal(first.maximumSpellLevel, 1);
  assert.deepEqual(first.known, [{ level: 0, count: 4 }, { level: 1, count: 2 }]);
  const oracleSpells = bundle.spells.filter((spell) => spell.levelByClass.oracle !== undefined);
  assert.equal(oracleSpells.length, 999);
  assert.equal(oracleSpells.find((spell) => spell.id === "detect-magic").levelByClass.oracle, 0);
});

test("Oracle learns the chosen wound spells at every castable rank without counting them against spells known", () => {
  for (const family of ["cure", "inflict"]) {
    const selection = { "oracle-cure-inflict-1": `oracle-${family}-spells` };
    const ranks = (maximumSpellLevel) => {
      const eligible = spellsAvailableToClass(bundle.spells, "oracle", maximumSpellLevel);
      const granted = oracleCureInflictSpells(eligible, oracle, selection);
      return granted.map((spell) => spell.levelByClass.oracle).sort((a, b) => a - b);
    };
    assert.deepEqual(ranks(0), []);
    assert.deepEqual(ranks(4), [1, 2, 3, 4]);
    assert.deepEqual(ranks(9), [1, 2, 3, 4, 5, 6, 7, 8]);

    const known = spontaneousSpellcastingProgression(oracle, 1, { abilityScore: 12 }).known;
    const eligible = spellsAvailableToClass(bundle.spells, "oracle", 1);
    const granted = oracleCureInflictSpells(eligible, oracle, selection).map(({ id }) => id);
    const knownWoundSpell = `${family}-light-wounds`;
    assert.deepEqual(granted, [knownWoundSpell]);
    assert.deepEqual(normalizeKnownSpells([knownWoundSpell, "detect-magic"], eligible, "oracle", known, granted), ["detect-magic"]);
    const withoutChoice = { ...oracle, features: oracle.features.filter(({ id }) => id !== "oracle-cure-inflict-1") };
    assert.deepEqual(oracleCureInflictSpells(eligible, withoutChoice, selection), []);
  }
});

test("Oracle exposes all APG mysteries, curses, and cure-or-inflict choice", () => {
  assert.equal(group("oracle-mysteries").options.length, 10);
  assert.deepEqual(group("oracle-curses").options.map((option) => option.id), [
    "oracle-curse-clouded-vision", "oracle-curse-deaf", "oracle-curse-haunted",
    "oracle-curse-lame", "oracle-curse-tongues", "oracle-curse-wasting"
  ]);
  assert.deepEqual(group("oracle-cure-inflict").options.map((option) => option.id), ["oracle-cure-spells", "oracle-inflict-spells"]);
});
