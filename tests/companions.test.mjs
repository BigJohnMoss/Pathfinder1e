import test from "node:test";
import assert from "node:assert/strict";
import { animalCompanionProgression, familiarProgression, normalizeCharacterDraft, normalizeCompanionState } from "../packages/engine/src/index.js";

test("animal companions advance from effective level 1 through 20", () => {
  assert.deepEqual(animalCompanionProgression(1), {
    effectiveLevel: 1, hitDice: 2, baseAttackBonus: 1,
    saves: { fortitude: 3, reflex: 3, will: 0 }, skillRanks: 2, feats: 1,
    naturalArmorBonus: 0, strengthDexterityBonus: 0, bonusTricks: 1,
    specialAbilities: ["Link", "Share spells"],
  });
  const level20 = animalCompanionProgression(20);
  assert.equal(level20.hitDice, 16);
  assert.equal(level20.naturalArmorBonus, 12);
  assert.ok(level20.specialAbilities.includes("Improved evasion"));
});

test("familiars derive hit points and unlock master-level abilities", () => {
  assert.equal(familiarProgression(1, 13).hitPoints, 6);
  assert.equal(familiarProgression(11, 40).intelligence, 11);
  assert.ok(familiarProgression(13, 40).specialAbilities.includes("Scry on familiar"));
});

test("companion state and character drafts discard unsafe values", () => {
  const companions = normalizeCompanionState({ familiar: { kind: "familiar", optionId: "wizard-familiar-cat", name: "  Miso  ", currentHitPoints: 12, skillRanks: { Stealth: 3, bad: -1 }, featIds: ["alertness", "alertness", 4] }, bad: { kind: "dragon" } });
  assert.deepEqual(companions, { familiar: { kind: "familiar", optionId: "wizard-familiar-cat", name: "Miso", currentHitPoints: 12, skillRanks: { Stealth: 3 }, featIds: ["alertness"] } });
  const draft = normalizeCharacterDraft({ name: "Test", classId: "wizard", level: 1, baseAbilities: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }, companions });
  assert.deepEqual(draft.companions, companions);
});
