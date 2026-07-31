import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { apgClassResourceMaximums } from "../packages/engine/src/apg-class-resources.js";
import { preparedSourceSpellCapacity } from "../packages/engine/src/prepared-source-spells.js";

const load = async (name) => JSON.parse(await readFile(new URL(`../packages/data/src/classes/${name}.json`, import.meta.url), "utf8"));

test("Brawler, Slayer, and Swashbuckler provide sourced level-20 hybrid chassis", async () => {
  for (const id of ["brawler", "slayer", "swashbuckler"]) {
    const entry = await load(id);
    assert.equal(entry.classType, "hybrid");
    assert.equal(entry.babProgression, "full");
    assert.ok(entry.features.some(feature => feature.level === 20));
    assert.match(entry.source.url, /^https:\/\/legacy\.aonprd\.com\//);
  }
});

test("Brawler and Swashbuckler daily resources scale and remain bounded", () => {
  assert.deepEqual(apgClassResourceMaximums("brawler", 1), { martialFlexibility: 3 });
  assert.deepEqual(apgClassResourceMaximums("brawler", 20), { martialFlexibility: 13, knockout: 3 });
  assert.deepEqual(apgClassResourceMaximums("swashbuckler", 1, { charisma: 4 }), { panache: 4 });
  assert.deepEqual(apgClassResourceMaximums("swashbuckler", 20, { charisma: 4 }), { panache: 4, charmedLife: 7 });
});

test("Bloodrager reaches mighty bloodrage with four spell levels and a bounded rage pool", async () => {
  const entry = await load("bloodrager");
  assert.equal(entry.spellcasting.castingType, "spontaneous");
  assert.deepEqual(entry.spellcasting.spellLevelUnlocks, [4, 8, 12, 16]);
  assert.equal(entry.features.at(-1).id, "bloodrager-mighty-bloodrage-20");
  assert.deepEqual(apgClassResourceMaximums("bloodrager", 1, { constitution: 3 }), { bloodrageRounds: 7 });
  assert.deepEqual(apgClassResourceMaximums("bloodrager", 20, { constitution: 3 }), { bloodrageRounds: 45 });
});

test("Hunter reaches master hunter with its companion, teamwork, focus, and spell progressions", async () => {
  const entry = await load("hunter");
  assert.equal(entry.spellcasting.castingType, "spontaneous");
  assert.deepEqual(entry.spellcasting.spellLevelUnlocks, [1, 4, 7, 10, 13, 16]);
  assert.ok(entry.features.some(feature => feature.optionGroupId === "hunter-animal-companions"));
  assert.equal(entry.features.filter(feature => feature.optionGroupId === "hunter-teamwork-feats").length, 6);
  assert.equal(entry.features.at(-1).id, "hunter-master-hunter-20");
});

test("Investigator integrates extracts, inspiration, studied combat, and ten talent slots", async () => {
  const entry = await load("investigator");
  assert.equal(entry.spellcasting.preparesFromSlots, true);
  assert.equal(entry.features.filter(feature => feature.optionGroupId === "investigator-talents").length, 9);
  assert.ok(entry.features.some(feature => feature.id === "investigator-studied-strike-4"));
  assert.equal(entry.features.at(-1).id, "investigator-true-inspiration-20");
  assert.equal(preparedSourceSpellCapacity("investigator", 20, 3), 43);
  assert.deepEqual(apgClassResourceMaximums("investigator", 20, { intelligence: 5 }), { inspiration: 15 });
});

test("Skald integrates six spell levels, raging song, rage powers, and spell kenning", async () => {
  const entry = await load("skald");
  assert.equal(entry.spellcasting.castingType, "spontaneous");
  assert.equal(entry.features.filter(feature => feature.optionGroupId === "skald-rage-powers").length, 6);
  assert.ok(entry.features.some(feature => feature.id === "skald-master-skald-20"));
  assert.deepEqual(apgClassResourceMaximums("skald", 1, { charisma: 3 }), { ragingSongRounds: 6 });
  assert.deepEqual(apgClassResourceMaximums("skald", 20, { charisma: 3 }), { ragingSongRounds: 44, spellKenning: 3 });
});
