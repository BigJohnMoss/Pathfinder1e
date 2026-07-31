import test from "node:test";
import assert from "node:assert/strict";
import { normalizePreparedSourceSpells, preparedSourceAvailableSpells, preparedSourceSpellCapacity } from "../packages/engine/src/prepared-source-spells.js";

const spells = [
  { id: "cantrip", levelByClass: { witch: 0, alchemist: 0 } },
  { id: "one", levelByClass: { witch: 1, alchemist: 1 } },
  { id: "two", levelByClass: { witch: 2, alchemist: 2 } },
  { id: "patron", levelByClass: { witch: 1 } },
];

test("Alchemist formula and Witch familiar capacities follow class rules", () => {
  assert.equal(preparedSourceSpellCapacity("alchemist", 1, 3), 5);
  assert.equal(preparedSourceSpellCapacity("alchemist", 20, 3), 24);
  assert.equal(preparedSourceSpellCapacity("witch", 1, 3), 6);
  assert.equal(preparedSourceSpellCapacity("witch", 20, 3), 44);
  assert.equal(preparedSourceSpellCapacity("wizard", 1, 3), null);
});

test("source spell normalization enforces level, uniqueness, grants, and capacity", () => {
  assert.deepEqual(normalizePreparedSourceSpells(["one", "one", "two", "patron", "bad"], spells, "witch", 1, 1, ["patron"]), ["one"]);
  assert.deepEqual(preparedSourceAvailableSpells(spells, "witch", ["one"], ["patron"]).map((spell) => spell.id), ["cantrip", "one", "patron"]);
});
