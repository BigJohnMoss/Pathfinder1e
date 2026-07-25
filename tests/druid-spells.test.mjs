import assert from "node:assert/strict";
import test from "node:test";
import bundle from "../generated/pf1e-data.mjs";

const druidSpells = bundle.spells.filter((spell) => spell.levelByClass.druid !== undefined);

test("Druid receives the complete Core spell list", () => {
  assert.deepEqual(Object.fromEntries(Array.from({ length: 10 }, (_, level) => [
    level,
    druidSpells.filter((spell) => spell.levelByClass.druid === level).length
  ])), { 0: 13, 1: 20, 2: 26, 3: 22, 4: 17, 5: 19, 6: 18, 7: 13, 8: 11, 9: 10 });
  assert.equal(druidSpells.length, 169);
});

test("Druid class-level overlays reuse shared spell records", () => {
  for (const [id, level] of [["detect-magic", 0], ["entangle", 1], ["barkskin", 2], ["call-lightning", 3], ["freedom-of-movement", 4], ["wall-of-thorns", 5], ["find-the-path", 6], ["heal", 7], ["earthquake", 8], ["shapechange", 9]]) {
    const matches = bundle.spells.filter((spell) => spell.id === id);
    assert.equal(matches.length, 1, id);
    assert.equal(matches[0].levelByClass.druid, level, id);
  }
});

test("signature Druid spells retain their Core levels", () => {
  assert.equal(druidSpells.find((spell) => spell.id === "summon-natures-ally-1").levelByClass.druid, 1);
  assert.equal(druidSpells.find((spell) => spell.id === "flame-blade").levelByClass.druid, 2);
  assert.equal(druidSpells.find((spell) => spell.id === "spike-growth").levelByClass.druid, 3);
  assert.equal(druidSpells.find((spell) => spell.id === "reincarnate").levelByClass.druid, 4);
  assert.equal(druidSpells.find((spell) => spell.id === "commune-with-nature").levelByClass.druid, 5);
  assert.equal(druidSpells.find((spell) => spell.id === "transport-via-plants").levelByClass.druid, 6);
  assert.equal(druidSpells.find((spell) => spell.id === "sunbeam").levelByClass.druid, 7);
  assert.equal(druidSpells.find((spell) => spell.id === "animal-shapes").levelByClass.druid, 8);
  assert.equal(druidSpells.find((spell) => spell.id === "storm-of-vengeance").levelByClass.druid, 9);
});
