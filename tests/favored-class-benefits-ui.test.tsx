import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import { activeFavoredClassBenefits, alternateFavoredClassRewards, alternateRewardValue, FavoredClassBenefits } from "../apps/web/app/favored-class-bonus";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
test.before(async () => { const dom = new JSDOM("<!doctype html><html><body></body></html>"); Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, React }); ({ render, screen, cleanup } = await import("@testing-library/react")); });
test.afterEach(() => cleanup());

test("favoured rewards enforce fractions, increments, and published caps", () => {
  const speed = alternateFavoredClassRewards.find(reward => reward.id === "elf-barbarian-speed")!;
  const critical = alternateFavoredClassRewards.find(reward => reward.id === "elf-ranger-critical")!;
  assert.equal(alternateRewardValue(speed, 4), 0);
  assert.equal(alternateRewardValue(speed, 5), 5);
  assert.equal(alternateRewardValue(critical, 20), 4);
  assert.equal(activeFavoredClassBenefits({ "human-cavalier-banner": 8 })[0].value, 2);
});

test("active benefits make pending fractional rewards explicit", () => {
  render(<FavoredClassBenefits allocations={{ "human-cavalier-banner": 3 }} />);
  assert.ok(screen.getByText("Banner pending"));
  assert.ok(screen.getByText(/Allocate 4 levels/));
});
