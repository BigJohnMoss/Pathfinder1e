import assert from "node:assert/strict";
import test from "node:test";
import bundle from "../generated/pf1e-data.mjs";

const bardSpells = bundle.spells.filter((spell) => spell.levelByClass.bard !== undefined);

test("Bard receives the complete Core spell list", () => {
  assert.deepEqual(Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((level) => [
    level,
    bardSpells.filter((spell) => spell.levelByClass.bard === level).length
  ])), { 0: 16, 1: 26, 2: 35, 3: 30, 4: 21, 5: 16, 6: 20 });
  assert.equal(bardSpells.length, 164);
});

test("Bard class-level overlays reuse shared spell records", () => {
  for (const [id, level] of [["detect-magic", 0], ["alarm", 1], ["animal-messenger", 2], ["haste", 3], ["freedom-of-movement", 4], ["heroism-greater", 5], ["analyze-dweomer", 6]]) {
    const matches = bundle.spells.filter((spell) => spell.id === id);
    assert.equal(matches.length, 1, id);
    assert.equal(matches[0].levelByClass.bard, level, id);
  }
});

test("signature Bard spells retain their Core levels", () => {
  assert.equal(bardSpells.find((spell) => spell.id === "summon-instrument").levelByClass.bard, 0);
  assert.equal(bardSpells.find((spell) => spell.id === "hideous-laughter").levelByClass.bard, 1);
  assert.equal(bardSpells.find((spell) => spell.id === "sound-burst").levelByClass.bard, 2);
  assert.equal(bardSpells.find((spell) => spell.id === "good-hope").levelByClass.bard, 3);
  assert.equal(bardSpells.find((spell) => spell.id === "modify-memory").levelByClass.bard, 4);
  assert.equal(bardSpells.find((spell) => spell.id === "song-of-discord").levelByClass.bard, 5);
  assert.equal(bardSpells.find((spell) => spell.id === "irresistible-dance").levelByClass.bard, 6);
});
