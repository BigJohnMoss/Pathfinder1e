import test from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { JSDOM } from "jsdom";
import type { ActiveEffect } from "../packages/types/src/index.js";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;
let ActivePlayPanel: typeof import("../apps/web/app/active-play-panel").ActivePlayPanel;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
  ActivePlayPanel = (await import("../apps/web/app/active-play-panel")).ActivePlayPanel;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

function Harness() {
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  return <ActivePlayPanel
    maximumHitPoints={10}
    currentHitPoints={10}
    temporaryHitPoints={0}
    attacks={[]}
    checks={[]}
    skills={[{ id: "Spellcraft", name: "Spellcraft", modifier: 12 }, { id: "Craft", name: "Craft", modifier: 8 }]}
    effects={effects}
    craftingOppositionSchools={[{ id: "evocation", name: "Evocation" }, { id: "necromancy", name: "Necromancy" }]}
    onCurrentHitPointsChange={() => {}}
    onTemporaryHitPointsChange={() => {}}
    onEffectsChange={setEffects}
  />;
}

test("School Savant crafting automatically applies the opposition-school penalty", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.selectOptions(screen.getByLabelText("Magic-item prerequisite spell school"), "evocation");
  fireEvent.change(screen.getByLabelText("Crafted item caster level"), { target: { value: "10" } });
  assert.ok(screen.getByText("−4 opposition-school penalty"));
  assert.ok(screen.getByText("DC 15"));
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    await user.click(screen.getByRole("button", { name: "Roll crafting check" }));
  } finally {
    Math.random = originalRandom;
  }
  const total = screen.getByLabelText("Evocation magic-item crafting check total");
  assert.equal(total.textContent, "19");
  assert.match(total.closest("li")?.textContent ?? "", /\+12 skill − 4 opposition school/);

  await user.selectOptions(screen.getByLabelText("Magic-item prerequisite spell school"), "conjuration");
  assert.ok(screen.getByText("No opposition-school penalty"));
  Math.random = () => 0.5;
  try {
    await user.click(screen.getByRole("button", { name: "Roll crafting check" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(screen.getByLabelText("Conjuration magic-item crafting check total").textContent, "23");
});

test("School Savant exposes selected opposition schools in the full character journey", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "arcanist");
  await user.selectOptions(screen.getByLabelText("Archetype"), "arcanist-school-savant");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("School Focus level 1"), "wizard-school-abjuration");
  await user.selectOptions(screen.getByLabelText("First Opposition School level 1"), "wizard-opposition-evocation");
  await user.selectOptions(screen.getByLabelText("Second Opposition School level 1"), "wizard-opposition-necromancy");
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByRole("option", { name: "Evocation — opposition" }));
  assert.ok(screen.getByRole("option", { name: "Necromancy — opposition" }));
});
