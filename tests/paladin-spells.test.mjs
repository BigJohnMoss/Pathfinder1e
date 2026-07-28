import assert from "node:assert/strict";
import test from "node:test";
import bundle from "../generated/pf1e-data.mjs";

const paladinSpells = bundle.spells.filter((spell) => spell.levelByClass.paladin !== undefined);

test("Paladin receives the complete Core spell list", () => {
  assert.deepEqual(Object.fromEntries([1, 2, 3, 4].map((level) => [
    level,
    paladinSpells.filter((spell) => spell.levelByClass.paladin === level).length
  ])), { 1: 20, 2: 9, 3: 11, 4: 9 });
  assert.equal(paladinSpells.length, 49);
  for (const id of ["detect-chaos", "detect-evil", "detect-good", "detect-law"]) {
    assert.equal(paladinSpells.find((spell) => spell.id === id)?.levelByClass.paladin, 1, id);
  }
});

test("Paladin class-level overlays reuse shared spell records", () => {
  for (const [id, level] of [["read-magic", 1], ["resist-energy", 2], ["dispel-magic", 3], ["break-enchantment", 4]]) {
    const matches = bundle.spells.filter((spell) => spell.id === id);
    assert.equal(matches.length, 1, id);
    assert.equal(matches[0].levelByClass.paladin, level, id);
  }
});

test("signature Paladin spells retain their Core levels", () => {
  assert.equal(paladinSpells.find((spell) => spell.id === "bless-weapon").levelByClass.paladin, 1);
  assert.equal(paladinSpells.find((spell) => spell.id === "heal-mount").levelByClass.paladin, 3);
  assert.equal(paladinSpells.find((spell) => spell.id === "holy-sword").levelByClass.paladin, 4);
});
