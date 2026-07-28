import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { availableOptions } from "../packages/engine/src/index.js";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const ragePowers = await read("../packages/data/src/options/rage-powers.json");
const rogueTalents = await read("../packages/data/src/options/rogue-talents.json");

test("the complete Core rage-power catalogue is available at the correct level gates", () => {
  assert.equal(ragePowers.options.length, 28);
  assert.equal(availableOptions(ragePowers, "barbarian", 2).some((option) => option.id === "renewed-vigor"), false);
  assert.equal(availableOptions(ragePowers, "barbarian", 4).some((option) => option.id === "renewed-vigor"), true);
  assert.equal(availableOptions(ragePowers, "barbarian", 7).some((option) => option.id === "terrifying-howl"), false);
  assert.equal(availableOptions(ragePowers, "barbarian", 8, [], { featureIds: [] }).some((option) => option.id === "terrifying-howl"), false);
  assert.equal(availableOptions(ragePowers, "barbarian", 8, ["intimidating-glare"], { featureIds: ["intimidating-glare"] }).some((option) => option.id === "terrifying-howl"), true);
  assert.equal(ragePowers.options.find((option) => option.id === "swift-foot").selectionLimit, 3);
});

test("the complete Core rogue-talent catalogue separates basic and advanced talents", () => {
  assert.equal(rogueTalents.options.length, 23);
  assert.equal(availableOptions(rogueTalents, "rogue", 9, [], { abilities: { intelligence: 12 }, featureIds: [] }).some((option) => option.id === "crippling-strike"), false);
  assert.equal(availableOptions(rogueTalents, "rogue", 10, [], { abilities: { intelligence: 12 }, featureIds: [] }).some((option) => option.id === "crippling-strike"), true);
  assert.equal(availableOptions(rogueTalents, "rogue", 2, [], { abilities: { intelligence: 10 }, featureIds: [] }).some((option) => option.id === "major-magic"), false);
  assert.equal(availableOptions(rogueTalents, "rogue", 2, ["minor-magic"], { abilities: { intelligence: 11 }, featureIds: ["minor-magic"] }).some((option) => option.id === "major-magic"), true);
  assert.equal(rogueTalents.options.find((option) => option.id === "feat").repeatable, true);
  assert.equal(rogueTalents.options.find((option) => option.id === "skill-mastery").repeatable, true);
});
