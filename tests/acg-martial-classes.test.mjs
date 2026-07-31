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
