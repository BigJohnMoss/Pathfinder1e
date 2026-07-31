import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { apgClassResourceMaximums, classProgression } from "../packages/engine/src/index.js";

const cavalier = JSON.parse(await readFile(new URL("../packages/data/src/classes/cavalier.json", import.meta.url), "utf8"));
const orders = JSON.parse(await readFile(new URL("../packages/data/src/options/cavalier-orders.json", import.meta.url), "utf8"));
const teamwork = JSON.parse(await readFile(new URL("../packages/data/src/options/cavalier-teamwork-feats.json", import.meta.url), "utf8"));

test("Cavalier reaches level 20 with challenge, order, banner, charge, and tactician progressions", () => {
  const progression = classProgression(cavalier, 20);
  assert.equal(progression.baseAttackBonus, 20);
  assert.ok(progression.features.some(feature => feature.id === "cavalier-supreme-charge-20"));
  assert.ok(progression.features.filter(feature => feature.optionGroupId === "cavalier-teamwork-feats").length >= 3);
  assert.deepEqual(apgClassResourceMaximums("cavalier", 20, {}), { challenges: 7, tactician: 3 });
});

test("Cavalier exposes every APG order and a sourced teamwork-feat selection", () => {
  assert.equal(orders.options.length, 6);
  assert.ok(orders.options.every(order => (order.source?.url ?? orders.optionDefaults.source?.url) && order.benefit));
  assert.ok(teamwork.options.length >= 8);
  assert.ok(teamwork.options.every(option => option.featId && (option.source?.url ?? teamwork.optionDefaults.source?.url)));
});
