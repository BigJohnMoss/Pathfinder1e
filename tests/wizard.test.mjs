import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classProgression, spellcastingProgression, spellsAvailableToClass } from "../packages/engine/src/index.js";

const wizard = JSON.parse(await readFile(new URL("../packages/data/src/classes/wizard.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));

test("Wizard records its Core chassis and stable feature identifiers", () => {
  assert.equal(wizard.hitDie, 6);
  assert.equal(wizard.babProgression, "half");
  assert.deepEqual(wizard.saves, { fortitude: "poor", reflex: "poor", will: "good" });
  assert.equal(wizard.skillRanksPerLevel, 2);
  assert.equal(wizard.spellcasting.ability, "intelligence");
  assert.ok(wizard.classSkills.includes("Knowledge"));
  const featureIds = wizard.features.map((feature) => feature.id);
  for (const id of ["wizard-spellcasting-1", "wizard-arcane-bond-1", "wizard-arcane-school-1", "wizard-cantrips-1", "scribe-scroll-1", "wizard-spellbook-1"]) {
    assert.ok(featureIds.includes(id), `missing ${id}`);
  }
  assert.deepEqual(featureIds.filter((id) => id.startsWith("wizard-bonus-feat-")), ["wizard-bonus-feat-5", "wizard-bonus-feat-10", "wizard-bonus-feat-15", "wizard-bonus-feat-20"]);
});

test("Wizard prepared spell progression reaches new spell levels on odd class levels", () => {
  const first = spellcastingProgression(wizard, 1, { abilityScore: 18 });
  assert.equal(first.maximumSpellLevel, 1);
  assert.deepEqual(first.slots.filter((slot) => slot.base > 0).map((slot) => [slot.level, slot.base]), [[1, 1]]);
  assert.deepEqual(first.prepared, [{ level: 0, count: 3 }, { level: 1, count: 1 }]);

  const fifth = spellcastingProgression(wizard, 5, { abilityScore: 18 });
  assert.equal(fifth.maximumSpellLevel, 3);
  assert.deepEqual(fifth.slots.filter((slot) => slot.base > 0).map((slot) => [slot.level, slot.base]), [[1, 3], [2, 2], [3, 1]]);

  const seventeenth = spellcastingProgression(wizard, 17, { abilityScore: 28 });
  assert.equal(seventeenth.maximumSpellLevel, 9);
  assert.equal(seventeenth.slots.find((slot) => slot.level === 9).base, 1);

  const twentieth = spellcastingProgression(wizard, 20, { abilityScore: 28 });
  assert.equal(twentieth.slots.find((slot) => slot.level === 9).base, 4);
  assert.equal(twentieth.prepared.find((entry) => entry.level === 0).count, 4);
});

test("Wizard class progression exposes bonus feats at the correct levels", () => {
  const fourth = classProgression(wizard, 4, { intelligenceScore: 18 });
  assert.equal(fourth.features.some((feature) => feature.id === "wizard-bonus-feat-5"), false);
  const twentieth = classProgression(wizard, 20, { intelligenceScore: 18 });
  assert.deepEqual(twentieth.features.filter((feature) => feature.id.startsWith("wizard-bonus-feat-")).map((feature) => feature.level), [5, 10, 15, 20]);
});

test("generated catalogue exposes the complete shared Arcanist and Wizard spell list", () => {
  assert.ok(bundle.classes.some((characterClass) => characterClass.id === "wizard"));
  const sharedSpells = bundle.spells.filter((spell) => spell.levelByClass.arcanist !== undefined);
  assert.ok(sharedSpells.length > 1000, `expected broad shared spell coverage, found ${sharedSpells.length}`);
  for (const spell of sharedSpells) {
    assert.equal(spell.levelByClass.wizard, spell.levelByClass.arcanist, `${spell.id} Wizard level`);
  }
  const wizardSpells = spellsAvailableToClass(bundle.spells, "wizard", 9);
  assert.ok(wizardSpells.some((spell) => spell.name === "Mage Armor"));
  assert.ok(wizardSpells.some((spell) => spell.name === "Magic Missile"));
  assert.ok(wizardSpells.some((spell) => spell.levelByClass.wizard === 9));
});
