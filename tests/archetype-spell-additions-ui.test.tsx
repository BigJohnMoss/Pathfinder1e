import assert from "node:assert/strict";
import test from "node:test";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { spellsFromArchetypeGrants } from "../apps/web/app/archetype-spell-grants";
import { applyArchetype } from "../packages/engine/src/index.js";
import { mysteryBonusSpells } from "../packages/engine/src/oracle-mysteries.js";

const sorcerer = data.classes.find((item) => item.id === "sorcerer")!;
const razmiranPriest = archetypes.find((item) => item.id === "sorcerer-razmiran-priest")!;
const applied = applyArchetype(sorcerer, razmiranPriest, data.classes, data.spells);

test("the spellbook receives inferred bonus spells only at their class-level unlock", () => {
  const atTwo = spellsFromArchetypeGrants(data.spells, applied.spellGrants, "sorcerer", 2, 2, "known");
  const atThree = spellsFromArchetypeGrants(data.spells, applied.spellGrants, "sorcerer", 3, 2, "known");
  assert.ok(!atTwo.some((spell) => spell.id === "later-spell-aid"));
  assert.equal(atThree.find((spell) => spell.id === "later-spell-aid")?.levelByClass.sorcerer, 2);
});

test("grant mode and maximum spell level are both enforced", () => {
  assert.deepEqual(spellsFromArchetypeGrants(data.spells, applied.spellGrants, "sorcerer", 20, 2, "known").filter((spell) => spell.levelByClass.sorcerer > 2), []);
  assert.deepEqual(spellsFromArchetypeGrants(data.spells, applied.spellGrants, "sorcerer", 20, 9, "list"), []);
});

test("Oracle archetype bonus spells replace only matching mystery milestones", () => {
  const oracle = data.classes.find((item) => item.id === "oracle")!;
  const oceansEcho = archetypes.find((item) => item.id === "oracle-ocean-s-echo")!;
  const battle = {
    id: "oracle-mystery-battle",
    name: "Battle",
    mysterySpells: [
      { name: "enlarge person", oracleLevel: 2, spellLevel: 1 },
      { name: "fog cloud", oracleLevel: 4, spellLevel: 2 },
      { name: "magic vestment", oracleLevel: 6, spellLevel: 3 },
      { name: "wall of fire", oracleLevel: 8, spellLevel: 4 },
    ],
  };
  const appliedOracle = applyArchetype(oracle, oceansEcho, data.classes, data.spells);
  const mysterySpells = mysteryBonusSpells(
    data.spells,
    battle,
    8,
    "oracle",
    appliedOracle.bonusSpellReplacementClassLevels,
  );
  const archetypeSpells = spellsFromArchetypeGrants(data.spells, appliedOracle.spellGrants, "oracle", 8, 4, "known");

  assert.deepEqual(mysterySpells.map((spell) => spell.name), ["enlarge person", "magic vestment"]);
  assert.ok(archetypeSpells.some((spell) => spell.id === "sound-burst"));
  assert.ok(archetypeSpells.some((spell) => spell.id === "shout"));
  assert.ok(!archetypeSpells.some((spell) => spell.id === "song-of-discord"));
});
