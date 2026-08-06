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
let ActivePlayPanel: typeof import("../apps/web/app/active-play-panel").ActivePlayPanel;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ActivePlayPanel = (await import("../apps/web/app/active-play-panel")).ActivePlayPanel;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

function Harness({ initialEffects = [] }: { initialEffects?: ActiveEffect[] }) {
  const [hitPoints, setHitPoints] = useState(3);
  const [effects, setEffects] = useState(initialEffects);
  return <ActivePlayPanel
    maximumHitPoints={10}
    currentHitPoints={hitPoints}
    temporaryHitPoints={0}
    attacks={[]}
    checks={[]}
    skills={[]}
    effects={effects}
    recurringHealing={[{
      id: "blood-of-life",
      kind: "fastHealing",
      label: "Blood of Life",
      value: 2,
      condition: "while bloodraging",
      source: "Spelleater",
    }]}
    onCurrentHitPointsChange={setHitPoints}
    onTemporaryHitPointsChange={() => {}}
    onEffectsChange={setEffects}
  />;
}

test("conditional archetype fast healing activates, heals each round, and deactivates", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "3");
  await user.click(screen.getByRole("button", { name: "Activate Blood of Life" }));
  await user.click(screen.getByRole("button", { name: "Next round" }));
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "5");
  assert.equal(screen.getByRole("status").textContent, "Recurring healing restored 2 hit points.");
  await user.click(screen.getByRole("button", { name: "Deactivate Blood of Life" }));
  await user.click(screen.getByRole("button", { name: "Next round" }));
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "5");
});

test("timed ally fast healing applies for every remaining round and then expires", async () => {
  const user = userEvent.setup();
  render(<Harness initialEffects={[{
    id: "white-mage-fast-healing",
    name: "Fast Healing",
    target: "allies",
    bonus: 2,
    fastHealing: 2,
    description: "Allies within 30 feet gain fast healing 2",
    roundsRemaining: 2,
  }]} />);
  await user.click(screen.getByRole("button", { name: "Next round" }));
  await user.click(screen.getByRole("button", { name: "Next round" }));
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "7");
  assert.equal(screen.queryByText(/Allies within 30 feet gain fast healing 2/), null);
  await user.click(screen.getByRole("button", { name: "Next round" }));
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "7");
});

test("selected archetype exposes its current fast-healing progression in live combat", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bloodrager");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "7" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "bloodrager-spelleater");
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.equal(screen.getAllByText("Fast healing 2").length, 2);
  assert.ok(screen.getAllByText(/while bloodraging/i).length >= 1);
  fireEvent.change(screen.getByLabelText("Current HP"), { target: { value: "1" } });
  await user.click(screen.getByRole("button", { name: "Activate Blood of Life" }));
  await user.click(screen.getByRole("button", { name: "Next round" }));
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "3");
});
