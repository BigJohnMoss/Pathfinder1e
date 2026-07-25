import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { availableOptions, classProgression } from "../packages/engine/src/index.js";

const paladin = JSON.parse(await readFile(new URL("../packages/data/src/classes/paladin.json", import.meta.url), "utf8"));
const mercies = JSON.parse(await readFile(new URL("../packages/data/src/options/paladin-mercies.json", import.meta.url), "utf8"));
const bonds = JSON.parse(await readFile(new URL("../packages/data/src/options/paladin-divine-bonds.json", import.meta.url), "utf8"));

test("Paladin gains six selectable Mercy slots at the Core milestones", () => {
  assert.deepEqual(
    paladin.features.filter((feature) => feature.progressionKey === "paladin-mercy").map((feature) => [feature.id, feature.level, feature.optionGroupId]),
    [
      ["paladin-mercy-3", 3, "paladin-mercies"],
      ["paladin-mercy-6", 6, "paladin-mercies"],
      ["paladin-mercy-9", 9, "paladin-mercies"],
      ["paladin-mercy-12", 12, "paladin-mercies"],
      ["paladin-mercy-15", 15, "paladin-mercies"],
      ["paladin-mercy-18", 18, "paladin-mercies"]
    ]
  );
  assert.equal(classProgression(paladin, 2).features.some((feature) => feature.progressionKey === "paladin-mercy"), false);
  assert.equal(classProgression(paladin, 18).features.filter((feature) => feature.progressionKey === "paladin-mercy").length, 6);
});

test("Core Mercy catalogue enforces levels and prerequisite mercies", () => {
  assert.equal(mercies.options.length, 15);
  assert.deepEqual(availableOptions(mercies, "paladin", 3).map((option) => option.id), [
    "paladin-mercy-fatigued",
    "paladin-mercy-shaken",
    "paladin-mercy-sickened"
  ]);
  const ninthWithoutPrerequisites = availableOptions(mercies, "paladin", 9, [], { featureIds: [] });
  assert.equal(ninthWithoutPrerequisites.some((option) => option.id === "paladin-mercy-exhausted"), false);
  assert.equal(ninthWithoutPrerequisites.some((option) => option.id === "paladin-mercy-frightened"), false);
  assert.equal(ninthWithoutPrerequisites.some((option) => option.id === "paladin-mercy-nauseated"), false);
  const ninthWithFatigued = availableOptions(mercies, "paladin", 9, [], { featureIds: ["paladin-mercy-fatigued"] });
  assert.equal(ninthWithFatigued.some((option) => option.id === "paladin-mercy-exhausted"), true);
  assert.equal(ninthWithFatigued.some((option) => option.id === "paladin-mercy-frightened"), false);
  assert.equal(availableOptions(mercies, "paladin", 12, [], { featureIds: [] }).some((option) => option.id === "paladin-mercy-stunned"), true);
});

test("Divine Bond exposes the permanent weapon and mount paths", () => {
  const feature = paladin.features.find((item) => item.id === "paladin-divine-bond-5");
  assert.equal(feature.choiceRequired, true);
  assert.equal(feature.optionGroupId, "paladin-divine-bonds");
  assert.deepEqual(bonds.options.map((option) => option.id), ["paladin-divine-bond-weapon", "paladin-divine-bond-mount"]);
  assert.equal(availableOptions(bonds, "paladin", 4).length, 0);
  assert.equal(availableOptions(bonds, "paladin", 5).length, 2);
  assert.deepEqual(bonds.options.find((option) => option.id === "paladin-divine-bond-mount").powers.map((power) => power.level), [5, 11, 15]);
});
