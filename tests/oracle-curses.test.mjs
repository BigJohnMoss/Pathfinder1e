import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applyArchetype, characterLandSpeed } from "../packages/engine/src/index.js";
import { hauntedCurseSpells, oracleCurseBenefits } from "../packages/engine/src/oracle-curses.js";

const readData = async (path) => JSON.parse(await readFile(new URL(`../packages/data/src/${path}.json`, import.meta.url), "utf8"));
const [oracle, dualCursed, cyclopeanSeer, coreCurses, cyclopeanCurses] = await Promise.all([
  readData("classes/oracle"),
  readData("archetypes/oracle-dual-cursed-oracle"),
  readData("archetypes/oracle-cyclopean-seer"),
  readData("options/oracle-curses"),
  readData("options/cyclopean-seer-curses"),
]);
const options = [coreCurses, cyclopeanCurses];

test("the progressing curse counts half of combined non-oracle levels and the fixed curse stays at level one", () => {
  const modifiedOracle = applyArchetype(oracle, dualCursed);
  const selections = {
    "oracle-dual-cursed-oracle-oracle-s-curse-1": "oracle-curse-clouded-vision",
    "oracle-dual-cursed-oracle-fixed-curse-1": "oracle-curse-wasting",
    "oracle-curse-1": "oracle-curse-lame",
  };
  const benefits = (oracleLevel, fighter) => oracleCurseBenefits(
    [modifiedOracle], { oracle: oracleLevel, fighter, rogue: 1 }, selections, options,
  );
  assert.deepEqual(benefits(4, 0).senses.map(({ range }) => range), [30]);
  assert.deepEqual(benefits(4, 1).senses.map(({ range }) => range), [60]);
  assert.deepEqual(benefits(9, 1).senses.map(({ range }) => range), [60, 30]);
  const final = benefits(14, 1);
  assert.deepEqual(final.senses.map(({ range }) => range), [60, 30, 15]);
  assert.equal(final.charismaSkillPenalty, -4);
  assert.deepEqual(final.defenses, []);
  assert.equal(final.lame, 0);
});

test("Powerless Prophecy follows curse thresholds and respects the archetype's restricted options", () => {
  const modifiedOracle = applyArchetype(oracle, cyclopeanSeer);
  const feature = "oracle-cyclopean-seer-oracle-s-curse-1";
  const benefits = (oracleLevel, option = "oracle-curse-powerless-prophecy") => oracleCurseBenefits(
    [modifiedOracle], { oracle: oracleLevel, fighter: 2 }, { [feature]: option }, options,
  );
  assert.equal(benefits(3).initiative, 0);
  assert.equal(benefits(4).initiative, 4);
  assert.equal(benefits(8).defenses[0].kind, "uncannyDodge");
  assert.equal(benefits(9).defenses[0].kind, "improvedUncannyDodge");
  assert.match(benefits(9).defenses[0].condition, /9 oracle levels/);
  assert.equal(benefits(13).conditionalModifiers.length, 0);
  assert.equal(benefits(14).conditionalModifiers[0].bonus, 4);
  assert.equal(benefits(14, "oracle-curse-wasting").charismaSkillPenalty, 0);
  assert.equal(oracleCurseBenefits([oracle], { oracle: 20 }, { "oracle-curse-1": "oracle-curse-powerless-prophecy" }, options).initiative, 0);
});

test("Lame adjusts base speed and bypasses load and armor reductions at the correct levels", () => {
  const speed = (base, armor, load, curseLevel) => characterLandSpeed(base, armor, load, [], {}, curseLevel).speed;
  assert.equal(speed(30, "none", "heavy", 0), 20);
  assert.equal(speed(30, "none", "heavy", 1), 20);
  assert.equal(speed(20, "none", "medium", 1), 15);
  assert.equal(speed(30, "heavy", "heavy", 9), 15);
  assert.equal(speed(30, "heavy", "heavy", 10), 20);
  assert.equal(speed(30, "heavy", "overloaded", 15), 0);
});

test("Haunted grants its staged spells at Oracle spell levels and fixed Haunted only grants its cantrips", () => {
  const haunted = "oracle-curse-haunted";
  const benefits = (oracleLevel, fighter = 0) => oracleCurseBenefits(
    [oracle], { oracle: oracleLevel, fighter }, { "oracle-curse-1": haunted }, options,
  ).hauntedSpellAdditions;
  const cantrips = { "mage-hand": 0, "ghost-sound": 0 };
  assert.deepEqual(benefits(4), cantrips);
  assert.deepEqual(benefits(4, 2), { ...cantrips, levitate: 2, "minor-image": 2 });
  assert.equal(benefits(10).telekinesis, 5);
  assert.equal(benefits(14)["reverse-gravity"], undefined);
  assert.equal(benefits(15)["reverse-gravity"], 7);

  const fixed = oracleCurseBenefits([applyArchetype(oracle, dualCursed)], { oracle: 20 }, {
    "oracle-dual-cursed-oracle-fixed-curse-1": haunted,
  }, options);
  assert.deepEqual(fixed.hauntedSpellAdditions, cantrips);
  const catalogue = Object.keys(benefits(15)).map((id) => ({ id, levelByClass: { wizard: benefits(15)[id] } }));
  const spells = hauntedCurseSpells(catalogue, benefits(15), "oracle", 2);
  assert.equal(spells.length, 4);
  assert.equal(spells.find(({ id }) => id === "minor-image").levelByClass.oracle, 2);
  assert.deepEqual(hauntedCurseSpells(catalogue, benefits(15), "wizard", 9), []);
});

test("Deaf removes its initiative penalty in stages and grants non-hearing senses", () => {
  const selections = { "oracle-curse-1": "oracle-curse-deaf" };
  const benefits = (level) => oracleCurseBenefits([oracle], { oracle: level }, selections, options);
  assert.equal(benefits(1).silentCasting, true);
  assert.equal(benefits(4).initiative, -4);
  assert.equal(benefits(5).initiative, -2);
  assert.equal(benefits(5).conditionalModifiers.find(({ bonus }) => bonus === 3).source, "Deaf");
  assert.equal(benefits(9).initiative, -2);
  assert.equal(benefits(10).initiative, 0);
  assert.deepEqual(benefits(14).senses.map(({ sense }) => sense), ["scent"]);
  assert.deepEqual(benefits(15).senses.map(({ sense, range }) => [sense, range]), [["scent", undefined], ["tremorsense", 30]]);
  assert.equal(oracleCurseBenefits([oracle], { oracle: 1 }, {}, options).silentCasting, false);
});
