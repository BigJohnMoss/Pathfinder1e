import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { alignmentsWithinOneStep, channelEnergyChoices } from "../packages/engine/src/cleric-alignment.js";

const alignments = JSON.parse(await readFile(new URL("../packages/data/src/options/cleric-alignments.json", import.meta.url), "utf8")).options;
const channels = JSON.parse(await readFile(new URL("../packages/data/src/options/cleric-channel-energy.json", import.meta.url), "utf8")).options;
const deities = JSON.parse(await readFile(new URL("../packages/data/src/options/cleric-deities.json", import.meta.url), "utf8")).options;
const deity = (id) => deities.find((option) => option.id === id);

test("Cleric alignments remain within one orthogonal step of the deity", () => {
  assert.deepEqual(alignmentsWithinOneStep(alignments, deity("deity-iomedae").alignment).map((option) => option.alignment), ["lawful-good", "neutral-good", "lawful-neutral"]);
  assert.deepEqual(alignmentsWithinOneStep(alignments, deity("deity-abadar").alignment).map((option) => option.alignment), ["lawful-good", "lawful-neutral", "neutral", "lawful-evil"]);
  assert.deepEqual(alignmentsWithinOneStep(alignments, deity("deity-gozreh").alignment).map((option) => option.alignment), ["neutral-good", "lawful-neutral", "neutral", "chaotic-neutral", "neutral-evil"]);
});

test("Channel energy polarity follows Cleric and deity morality", () => {
  assert.deepEqual(channelEnergyChoices(channels, "lawful-good", "lawful-neutral").map((option) => option.polarity), ["positive"]);
  assert.deepEqual(channelEnergyChoices(channels, "lawful-neutral", "lawful-good").map((option) => option.polarity), ["positive"]);
  assert.deepEqual(channelEnergyChoices(channels, "lawful-neutral", "lawful-evil").map((option) => option.polarity), ["negative"]);
  assert.deepEqual(channelEnergyChoices(channels, "lawful-neutral", "lawful-neutral").map((option) => option.polarity), ["positive", "negative"]);
});

test("all Core deity records declare a valid alignment", () => {
  const valid = new Set(alignments.map((option) => option.alignment));
  assert.equal(deities.length, 20);
  assert.ok(deities.every((option) => valid.has(option.alignment)));
});
