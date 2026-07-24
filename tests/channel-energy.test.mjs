import test from "node:test";
import assert from "node:assert/strict";
import { channelEnergyProgression } from "../packages/engine/src/channel-energy.js";

test("channel energy scales dice every odd Cleric level", () => {
  assert.deepEqual(channelEnergyProgression(1, 2), { dice: 1, saveDC: 12, usesPerDay: 5 });
  assert.deepEqual(channelEnergyProgression(5, 2), { dice: 3, saveDC: 14, usesPerDay: 5 });
  assert.deepEqual(channelEnergyProgression(20, 4), { dice: 10, saveDC: 24, usesPerDay: 7 });
});

test("channel energy daily uses follow Charisma and never become negative", () => {
  assert.equal(channelEnergyProgression(1, -5).usesPerDay, 0);
  assert.equal(channelEnergyProgression(1, 0).usesPerDay, 3);
  assert.equal(channelEnergyProgression(1, 6).usesPerDay, 9);
});
