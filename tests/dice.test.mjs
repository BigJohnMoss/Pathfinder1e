import test from "node:test";
import assert from "node:assert/strict";
import { parseDiceExpression, rollD20Check, rollDice, rollDiceExpression } from "../packages/engine/src/index.js";

test("rolls bounded dice and applies modifiers", () => {
  assert.deepEqual(rollDice(3, 6, 2, () => 0.5), {
    count: 3, sides: 6, modifier: 2, rolls: [4, 4, 4], subtotal: 12, total: 14,
  });
});

test("parses common damage expressions and adds an external modifier", () => {
  assert.deepEqual(parseDiceExpression("2d8 + 3"), { count: 2, sides: 8, modifier: 3 });
  assert.equal(rollDiceExpression("1d6-1", 2, () => 0).total, 2);
  assert.throws(() => parseDiceExpression("fireball"), /must look like/);
});

test("labels natural d20 results without discarding the calculated total", () => {
  assert.deepEqual(rollD20Check(7, () => 0), {
    count: 1, sides: 20, modifier: 7, rolls: [1], subtotal: 1, total: 8, natural: 1, outcome: "natural-1",
  });
  assert.equal(rollD20Check(-2, () => 0.999).outcome, "natural-20");
});

test("rejects unsafe dice sizes and modifiers", () => {
  assert.throws(() => rollDice(0, 6), /Dice count/);
  assert.throws(() => rollDice(1, 1), /Die sides/);
  assert.throws(() => rollDice(1, 20, 1000), /Modifier/);
});
