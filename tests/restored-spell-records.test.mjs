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
