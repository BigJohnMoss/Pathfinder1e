import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { effectiveSpellcastingLevels, multiclassProgression } from "../packages/engine/src/index.js";

const load = async (id) => JSON.parse(await readFile(new URL(`../packages/data/src/classes/${id}.json`, import.meta.url)));

test("Duelist, Eldritch Knight, and Loremaster expose complete Core prestige tables", async () => {
  const [wizard, cleric, duelist, eldritchKnight, loremaster] = await Promise.all([
    load("wizard"),
    load("cleric"),
    load("duelist"),
    load("eldritch-knight"),
    load("loremaster")
  ]);
  for (const prestige of [duelist, eldritchKnight, loremaster]) {
    assert.equal(prestige.classType, "prestige");
    assert.equal(prestige.maximumLevel, 10);
    assert.equal(prestige.baseAttackBonusByLevel.length, 10);
    assert.equal(prestige.savesByLevel.length, 10);
    assert.ok(prestige.features.some((feature) => feature.level === 10));
  }
  assert.equal(multiclassProgression([duelist], [{ classId: "duelist", level: 10 }]).baseAttackBonus, 10);
  assert.deepEqual(effectiveSpellcastingLevels([wizard, eldritchKnight], [{ classId: "wizard", level: 5 }, { classId: "eldritch-knight", level: 10 }]), { wizard: 14 });
  assert.deepEqual(effectiveSpellcastingLevels([cleric, loremaster], [{ classId: "cleric", level: 7 }, { classId: "loremaster", level: 10 }]), { cleric: 17 });
});

test("Mystic Theurge advances one arcane and one divine class while the final Core prestige tables remain complete", async () => {
  const [wizard, sorcerer, cleric, mysticTheurge, pathfinderChronicler, shadowdancer] = await Promise.all([
    load("wizard"),
    load("sorcerer"),
    load("cleric"),
    load("mystic-theurge"),
    load("pathfinder-chronicler"),
    load("shadowdancer")
  ]);
  for (const prestige of [mysticTheurge, pathfinderChronicler, shadowdancer]) {
    assert.equal(prestige.classType, "prestige");
    assert.equal(prestige.maximumLevel, 10);
    assert.equal(prestige.baseAttackBonusByLevel.length, 10);
    assert.equal(prestige.savesByLevel.length, 10);
    assert.ok(prestige.features.some((feature) => feature.level === 10));
  }
  assert.deepEqual(effectiveSpellcastingLevels([wizard, cleric, mysticTheurge], [{ classId: "wizard", level: 3 }, { classId: "cleric", level: 3 }, { classId: "mystic-theurge", level: 10 }]), { wizard: 13, cleric: 13 });
  assert.deepEqual(effectiveSpellcastingLevels([wizard, sorcerer, cleric, mysticTheurge], [{ classId: "wizard", level: 3 }, { classId: "sorcerer", level: 3 }, { classId: "cleric", level: 3 }, { classId: "mystic-theurge", level: 6 }], { "mystic-theurge": ["sorcerer", "cleric"] }), { wizard: 3, sorcerer: 9, cleric: 9 });
});
