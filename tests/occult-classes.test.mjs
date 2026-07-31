import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { apgClassResourceMaximums } from "../packages/engine/src/apg-class-resources.js";

test("Kineticist reaches Omnikinesis with complete wild-talent slots and bounded burn", async () => {
  const entry = JSON.parse(await readFile(new URL("../packages/data/src/classes/kineticist.json", import.meta.url), "utf8"));
  assert.equal(entry.features.filter(feature => feature.optionGroupId === "kineticist-infusions").length, 8);
  assert.equal(entry.features.filter(feature => feature.optionGroupId === "kineticist-utility-talents").length, 10);
  assert.ok(entry.features.some(feature => feature.id === "kineticist-omnikinesis-20"));
  assert.deepEqual(apgClassResourceMaximums("kineticist", 1, { constitution: 4 }), { burn: 7 });
  assert.deepEqual(apgClassResourceMaximums("kineticist", 20, { constitution: 8 }), { burn: 11 });
});

test("Medium exposes its spirits, psychic spell progression, influence, and capstone", async () => {
  const entry = JSON.parse(await readFile(new URL("../packages/data/src/classes/medium.json", import.meta.url), "utf8"));
  const spirits = JSON.parse(await readFile(new URL("../packages/data/src/options/medium-spirits.json", import.meta.url), "utf8"));
  assert.equal(entry.spellcasting.castingType, "spontaneous");
  assert.equal(entry.spellcasting.tradition, "psychic");
  assert.deepEqual(entry.spellcasting.spellLevelUnlocks, [1, 4, 7, 10]);
  assert.equal(spirits.options.length, 6);
  assert.ok(entry.features.some(feature => feature.optionGroupId === "medium-spirits"));
  assert.ok(entry.features.some(feature => feature.id === "medium-astral-beacon-20"));
  assert.deepEqual(apgClassResourceMaximums("medium", 20), { influence: 5 });
});
