import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bloodlineBonusSpells, bloodlineClassSkills, bloodlinePowersThroughLevel } from "../packages/engine/src/sorcerer-bloodlines.js";

const details = JSON.parse(await readFile(new URL("../packages/data/src/bloodline-details/core-arcane-celestial.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const group = bundle.optionGroups.find((optionGroup) => optionGroup.id === "sorcerer-bloodlines");
const arcane = group.options.find((option) => option.id === "sorcerer-bloodline-arcane");
const celestial = group.options.find((option) => option.id === "sorcerer-bloodline-celestial");

 test("Arcane and Celestial details merge into the generated bloodline catalogue", () => {
  assert.equal(details.bloodlines.length, 2);
  for (const bloodline of [arcane, celestial]) {
    assert.ok(bloodline);
    assert.equal(typeof bloodline.classSkill, "string");
    assert.equal(typeof bloodline.arcana, "string");
    assert.equal(bloodline.bonusSpells.length, 9);
    assert.equal(bloodline.bonusFeats.length, 8);
    assert.deepEqual(bloodline.powers.map((power) => power.level), [1, 3, 9, 15, 20]);
  }
  assert.equal(arcane.classSkill, "Knowledge (any one)");
  assert.equal(arcane.classSkillChoices.length, 10);
  assert.equal(celestial.classSkill, "Heal");
});

test("Arcane requires a legal selected Knowledge class skill", () => {
  const base = ["Bluff", "Spellcraft"];
  assert.deepEqual(bloodlineClassSkills(base, arcane), base);
  assert.deepEqual(bloodlineClassSkills(base, arcane, "Knowledge (history)"), [...base, "Knowledge (history)"]);
  assert.deepEqual(bloodlineClassSkills(base, arcane, "Heal"), base);
  assert.deepEqual(bloodlineClassSkills(base, celestial), [...base, "Heal"]);
});

test("Arcane and Celestial bonus spells resolve at their bloodline spell levels", () => {
  for (const bloodline of [arcane, celestial]) {
    assert.deepEqual(bloodlineBonusSpells(bundle.spells, bloodline, 2), []);
    const first = bloodlineBonusSpells(bundle.spells, bloodline, 3);
    assert.equal(first.length, 1);
    assert.equal(first[0].name, bloodline.bonusSpells[0].name);
    assert.equal(first[0].levelByClass.sorcerer, 1);

    const all = bloodlineBonusSpells(bundle.spells, bloodline, 19);
    assert.equal(all.length, 9, `${bloodline.id} resolved spell count`);
    assert.deepEqual(all.map((spell) => spell.name), bloodline.bonusSpells.map((entry) => entry.name));
    for (const [index, spell] of all.entries()) assert.equal(spell.levelByClass.sorcerer, index + 1, `${spell.name} bloodline spell level`);
  }
});

test("Celestial injects divine-only bloodline spells into the Sorcerer list", () => {
  const baseBless = bundle.spells.find((spell) => spell.name === "Bless");
  assert.ok(baseBless);
  const [grantedBless] = bloodlineBonusSpells(bundle.spells, celestial, 3);
  assert.equal(grantedBless.name, "Bless");
  assert.equal(grantedBless.levelByClass.sorcerer, 1);
  assert.equal(grantedBless.levelByClass.cleric, baseBless.levelByClass.cleric);
});

test("Arcane and Celestial power progression exposes earned powers", () => {
  assert.deepEqual(bloodlinePowersThroughLevel(arcane, 3).map((power) => power.name), ["Arcane Bond", "Metamagic Adept"]);
  assert.deepEqual(bloodlinePowersThroughLevel(celestial, 14).map((power) => power.name), ["Heavenly Fire", "Celestial Resistances", "Wings of Heaven"]);
  assert.equal(bloodlinePowersThroughLevel(celestial, 20).at(-1).name, "Ascension");
});
