import assert from "node:assert/strict";
import test from "node:test";
import bundle from "../generated/pf1e-data.mjs";

const rangerSpells = bundle.spells.filter((spell) => spell.levelByClass.ranger !== undefined);

test("Ranger receives the complete Core spell list", () => {
  assert.deepEqual(Object.fromEntries([1, 2, 3, 4].map((level) => [
    level,
    rangerSpells.filter((spell) => spell.levelByClass.ranger === level).length
  ])), { 1: 19, 2: 12, 3: 13, 4: 7 });
  assert.equal(rangerSpells.length, 51);
});

test("Ranger class-level overlays reuse shared spell records", () => {
  for (const [id, level] of [["alarm", 1], ["cure-light-wounds", 2], ["darkvision", 3], ["animal-growth", 4]]) {
    const matches = bundle.spells.filter((spell) => spell.id === id);
    assert.equal(matches.length, 1, id);
    assert.equal(matches[0].levelByClass.ranger, level, id);
  }
});

test("Ranger overlays preserve other classes on shared spells", () => {
  const readMagic = bundle.spells.find((spell) => spell.id === "read-magic");
  assert.equal(readMagic.levelByClass.paladin, 1);
  assert.equal(readMagic.levelByClass.ranger, 1);
  assert.equal(readMagic.levelByClass.wizard, 0);
});

test("signature Ranger spells retain their Core levels", () => {
  assert.equal(rangerSpells.find((spell) => spell.id === "entangle").levelByClass.ranger, 1);
  assert.equal(rangerSpells.find((spell) => spell.id === "barkskin").levelByClass.ranger, 2);
  assert.equal(rangerSpells.find((spell) => spell.id === "magic-fang-greater").levelByClass.ranger, 3);
  assert.equal(rangerSpells.find((spell) => spell.id === "commune-with-nature").levelByClass.ranger, 4);
});
