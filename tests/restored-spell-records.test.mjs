import assert from "node:assert/strict";
import test from "node:test";
import spells from "../generated/pf1e-spells.mjs";

const byId = new Map(spells.map((spell) => [spell.id, spell]));

test("shared missing spells have rules details and retain their published class ranks", () => {
  for (const [id, ranks] of [
    ["venomous-bite", { alchemist: 2, ranger: 2, summoner: 2 }],
    ["entice-fey-lesser", { bard: 4, druid: 5, medium: 3 }],
    ["blistering-invective", { alchemist: 2, bard: 2, mesmerist: 2 }],
    ["heroic-fortune", { oracle: 2, paladin: 3, skald: 2 }],
    ["murderous-command", { cleric: 1, medium: 1, psychic: 1 }],
    ["curse-water", { cleric: 1, oracle: 1, warpriest: 1 }],
    ["desecrate", { cleric: 2, oracle: 2, warpriest: 2 }],
    ["glyph-of-warding", { inquisitor: 3, oracle: 3, witch: 3 }],
  ]) {
    const spell = byId.get(id);
    assert.ok(spell?.description && spell.components?.length && spell.source?.url, id);
    for (const [classId, rank] of Object.entries(ranks)) {
      assert.equal(spell.levelByClass[classId], rank, `${id} ${classId}`);
    }
  }
});

test("high-rank divine and occult spells retain the printed ranks and spell variants", () => {
  for (const [id, ranks] of [
    ["glyph-of-warding-greater", { cleric: 6, inquisitor: 6, oracle: 6, warpriest: 6 }],
    ["forbiddance", { cleric: 6, occultist: 6 }],
    ["blasphemy", { cleric: 7, inquisitor: 6 }],
    ["dictum", { inquisitor: 6, oracle: 7 }],
    ["word-of-chaos", { cleric: 7, oracle: 7 }],
    ["cloak-of-chaos", { cleric: 8, oracle: 8 }],
    ["shield-of-law", { cleric: 8, oracle: 8 }],
    ["prognostication", { medium: 4, oracle: 6, spiritualist: 6 }],
  ]) {
    const spell = byId.get(id);
    assert.ok(spell?.description && spell.source?.url, id);
    for (const [classId, rank] of Object.entries(ranks)) {
      assert.equal(spell.levelByClass[classId], rank, `${id} ${classId}`);
    }
  }
  assert.ok(byId.get("glyph-of-warding-greater").components.some((entry) => entry.includes("400 gp")));
  assert.notEqual(byId.get("prognostication").levelByClass.oracle, byId.get("divination").levelByClass.oracle);
});

test("divine support spells have sourced casting details and separate holy and unholy variants", () => {
  for (const [id, ranks] of [
    ["sun-metal", { cleric: 1, paladin: 1, ranger: 1 }],
    ["crusaders-edge", { cleric: 4, inquisitor: 4, paladin: 4 }],
    ["symbol-of-healing", { cleric: 3, occultist: 3, paladin: 4, witch: 4 }],
    ["blessing-of-fervor", { cleric: 4, oracle: 4, warpriest: 4 }],
    ["holy-ice-weapon", { cleric: 2, oracle: 2 }],
    ["unholy-ice-weapon", { cleric: 2, oracle: 2 }],
    ["holy-ice", { cleric: 5, warpriest: 5 }],
    ["unholy-ice", { cleric: 5, warpriest: 5 }],
  ]) {
    const spell = byId.get(id);
    assert.ok(spell?.description && spell.source?.url, id);
    for (const [classId, rank] of Object.entries(ranks)) {
      assert.equal(spell.levelByClass[classId], rank, `${id} ${classId}`);
    }
  }
  assert.deepEqual(byId.get("holy-ice-weapon").descriptors, ["cold", "good", "water"]);
  assert.deepEqual(byId.get("unholy-ice-weapon").descriptors, ["cold", "evil", "water"]);
});
