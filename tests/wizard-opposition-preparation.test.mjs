import test from "node:test";
import assert from "node:assert/strict";
import { normalizePreparedSpellsWithOpposition, preparedSpellSlotUsage, spellPreparationCost } from "../packages/engine/src/wizard-opposition-preparation.js";

const spells = [
  { id: "magic-missile", school: "evocation", levelByClass: { wizard: 1 } },
  { id: "mage-armor", school: "conjuration", levelByClass: { wizard: 1 } },
  { id: "lissalan-snake-sigil", school: "multiple", schools: ["abjuration", "enchantment"], levelByClass: { wizard: 1 } },
  { id: "detect-magic", school: "divination", levelByClass: { wizard: 0 } }
];

const limits = [{ level: 0, count: 3 }, { level: 1, count: 2 }];

test("opposition-school spells cost two prepared slots", () => {
  assert.equal(spellPreparationCost(spells[0], ["wizard-opposition-conjuration"]), 1);
  assert.equal(spellPreparationCost(spells[1], ["wizard-opposition-conjuration"]), 2);
  assert.equal(spellPreparationCost(spells[2], ["wizard-opposition-abjuration"]), 2);
  assert.equal(spellPreparationCost(spells[2], ["wizard-school-divination"]), 1);
  assert.equal(spellPreparationCost(spells[3], []), 1);
});

test("prepared spell usage counts opposition costs by spell level", () => {
  assert.deepEqual(preparedSpellSlotUsage(["mage-armor", "detect-magic", "detect-magic"], spells, "wizard", ["wizard-opposition-conjuration"]), { 0: 2, 1: 2 });
  assert.deepEqual(preparedSpellSlotUsage(["missing"], spells, "wizard", ["wizard-opposition-conjuration"]), {});
});

test("normalization enforces weighted prepared capacity in selection order", () => {
  assert.deepEqual(normalizePreparedSpellsWithOpposition(["mage-armor", "magic-missile"], spells, "wizard", limits, ["wizard-opposition-conjuration"]), ["mage-armor"]);
  assert.deepEqual(normalizePreparedSpellsWithOpposition(["magic-missile", "mage-armor"], spells, "wizard", limits, ["wizard-opposition-conjuration"]), ["magic-missile"]);
  assert.deepEqual(normalizePreparedSpellsWithOpposition(["magic-missile", "magic-missile"], spells, "wizard", limits, ["wizard-opposition-conjuration"]), ["magic-missile", "magic-missile"]);
  assert.deepEqual(normalizePreparedSpellsWithOpposition(["mage-armor"], spells, "wizard", limits, []), ["mage-armor"]);
});

test("normalization rejects invalid and over-capacity records safely", () => {
  assert.deepEqual(normalizePreparedSpellsWithOpposition(["missing", "detect-magic", "detect-magic", "detect-magic", "detect-magic"], spells, "wizard", limits, ["wizard-opposition-divination"]), ["detect-magic"]);
  assert.deepEqual(normalizePreparedSpellsWithOpposition(null, spells, "wizard", limits, []), []);
  assert.deepEqual(normalizePreparedSpellsWithOpposition([], spells, "wizard", null, []), []);
});
