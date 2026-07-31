import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { apgClassResourceMaximums } from "../packages/engine/src/apg-class-resources.js";

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
