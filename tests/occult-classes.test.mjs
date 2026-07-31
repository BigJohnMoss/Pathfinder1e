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

test("Mesmerist integrates stare choices, tricks, treatments, and daily implants", async () => {
  const entry = JSON.parse(await readFile(new URL("../packages/data/src/classes/mesmerist.json", import.meta.url), "utf8"));
  assert.deepEqual(entry.spellcasting.spellLevelUnlocks, [1, 4, 7, 10, 13, 16]);
  assert.ok(entry.features.some(feature => feature.optionGroupId === "mesmerist-tricks"));
  assert.ok(entry.features.some(feature => feature.optionGroupId === "mesmerist-bold-stares"));
  assert.ok(entry.features.some(feature => feature.id === "mesmerist-rule-minds-20"));
  assert.deepEqual(apgClassResourceMaximums("mesmerist", 10, { charisma: 4 }), { mesmeristTrick: 7 });
});

test("Occultist integrates implements, focus powers, mental focus, and mastery", async () => {
  const entry = JSON.parse(await readFile(new URL("../packages/data/src/classes/occultist.json", import.meta.url), "utf8"));
  const implementsGroup = JSON.parse(await readFile(new URL("../packages/data/src/options/occultist-implements.json", import.meta.url), "utf8"));
  assert.equal(implementsGroup.options.length, 8);
  assert.ok(entry.features.some(feature => feature.optionGroupId === "occultist-focus-powers"));
  assert.ok(entry.features.some(feature => feature.id === "occultist-implement-mastery-20"));
  assert.deepEqual(apgClassResourceMaximums("occultist", 12, { intelligence: 5 }), { mentalFocus: 17 });
});

test("Psychic integrates disciplines, amplifications, phrenic pool, and ninth-level spells", async () => {
  const entry = JSON.parse(await readFile(new URL("../packages/data/src/classes/psychic.json", import.meta.url), "utf8"));
  const disciplines = JSON.parse(await readFile(new URL("../packages/data/src/options/psychic-disciplines.json", import.meta.url), "utf8"));
  assert.equal(disciplines.options.length, 10);
  assert.deepEqual(entry.spellcasting.spellLevelUnlocks, [1, 4, 6, 8, 10, 12, 14, 16, 18]);
  assert.ok(entry.features.some(feature => feature.id === "psychic-remade-self-20"));
  assert.deepEqual(apgClassResourceMaximums("psychic", 20, { intelligence: 7 }), { phrenicPool: 17 });
});

test("Spiritualist integrates emotional focus, phantom progression, and manifestation", async () => {
  const entry = JSON.parse(await readFile(new URL("../packages/data/src/classes/spiritualist.json", import.meta.url), "utf8"));
  const focuses = JSON.parse(await readFile(new URL("../packages/data/src/options/spiritualist-emotional-focuses.json", import.meta.url), "utf8"));
  assert.equal(focuses.options.length, 7);
  assert.ok(entry.features.some(feature => feature.optionGroupId === "spiritualist-emotional-focuses"));
  assert.ok(entry.features.some(feature => feature.id === "spiritualist-empowered-consciousness-20"));
  assert.deepEqual(apgClassResourceMaximums("spiritualist", 20), { bondedManifestation: 23 });
});
