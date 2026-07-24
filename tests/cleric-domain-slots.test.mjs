import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classProgression } from "../packages/engine/src/index.js";

const cleric = JSON.parse(await readFile(new URL("../packages/data/src/classes/cleric.json", import.meta.url), "utf8"));

test("Cleric gains one domain spell slot for each spell level", () => {
  const slots = cleric.features.filter((feature) => feature.progressionKey === "cleric-domain-spell-slots");
  assert.deepEqual(slots.map((feature) => [feature.id, feature.level]), [
    ["cleric-domain-spell-1",1],["cleric-domain-spell-2",3],["cleric-domain-spell-3",5],
    ["cleric-domain-spell-4",7],["cleric-domain-spell-5",9],["cleric-domain-spell-6",11],
    ["cleric-domain-spell-7",13],["cleric-domain-spell-8",15],["cleric-domain-spell-9",17]
  ]);
  assert.ok(slots.every((feature) => feature.choiceRequired && feature.optionGroupId === "cleric-domains"));
});

test("Cleric progression exposes only domain slots earned by the current level", () => {
  assert.deepEqual(classProgression(cleric, 1).features.filter((feature) => feature.progressionKey === "cleric-domain-spell-slots").map((feature) => feature.id), ["cleric-domain-spell-1"]);
  assert.deepEqual(classProgression(cleric, 5).features.filter((feature) => feature.progressionKey === "cleric-domain-spell-slots").map((feature) => feature.id), ["cleric-domain-spell-1","cleric-domain-spell-2","cleric-domain-spell-3"]);
  assert.equal(classProgression(cleric, 17).features.filter((feature) => feature.progressionKey === "cleric-domain-spell-slots").length, 9);
});
