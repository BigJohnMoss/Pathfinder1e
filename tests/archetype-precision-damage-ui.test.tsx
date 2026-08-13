import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let ActivePlayPanel: typeof import("../apps/web/app/active-play-panel").ActivePlayPanel;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ActivePlayPanel = (await import("../apps/web/app/active-play-panel")).ActivePlayPanel;
});

test.afterEach(() => cleanup());

const props = {
  maximumHitPoints: 10, currentHitPoints: 10, temporaryHitPoints: 0,
  attacks: [{ id: "bow", name: "Shortbow", attack: 4, damage: "1d6", damageBonus: 0, critical: "x3", range: 60 }],
  checks: [], skills: [], effects: [], onCurrentHitPointsChange: () => {}, onTemporaryHitPointsChange: () => {}, onEffectsChange: () => {},
  precisionDamageRules: [{ id: "sniper", label: "Ranged Sneak Attack", dice: 3, dieSides: 6 as const, condition: "target is denied Dexterity", attackMode: "ranged" as const, maximumRange: 50, source: "Woodland Sniper" }],
};

test("active play adds selected eligible precision dice to weapon damage", async () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    render(<ActivePlayPanel {...props} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Apply Ranged Sneak Attack from Woodland Sniper"));
    await user.click(screen.getByRole("button", { name: "Roll Shortbow damage" }));
    assert.match(screen.getByText(/1d6 \+ 3d6 precision/).textContent ?? "", /1d6 \+ 3d6 precision/);
    assert.equal(screen.getByLabelText("Shortbow damage total").textContent, "4");
  } finally { Math.random = originalRandom; }
});

test("active play excludes precision dice when the target is beyond their range", async () => {
  render(<ActivePlayPanel {...props} />);
  const user = userEvent.setup();
  await user.click(screen.getByLabelText("Apply Ranged Sneak Attack from Woodland Sniper"));
  await user.clear(screen.getByLabelText("Target distance in feet"));
  await user.type(screen.getByLabelText("Target distance in feet"), "60");
  await user.click(screen.getByRole("button", { name: "Roll Shortbow damage" }));
  assert.doesNotMatch(screen.getByText(/^1d6/).textContent ?? "", /precision/);
});
