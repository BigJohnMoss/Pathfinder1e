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
  assert.equal(screen.getByRole("status").textContent, "Fast healing restored 2 hit points.");
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

function RegenerationHarness() {
  const [hitPoints, setHitPoints] = useState(10);
  const [nonlethalDamage, setNonlethalDamage] = useState(0);
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  return <ActivePlayPanel
    maximumHitPoints={10}
    currentHitPoints={hitPoints}
    temporaryHitPoints={0}
    nonlethalDamage={nonlethalDamage}
    attacks={[]}
    checks={[]}
    skills={[]}
    effects={effects}
    recurringHealing={[{
      id: "perfect-bastion",
      kind: "regeneration",
      label: "Perfect Bastion",
      value: 10,
      condition: "against damage caused by the active Bastion of Good target",
      source: "Sacred Shield",
    }]}
    onCurrentHitPointsChange={setHitPoints}
    onTemporaryHitPointsChange={() => {}}
    onNonlethalDamageChange={setNonlethalDamage}
    onEffectsChange={setEffects}
  />;
}

test("regeneration converts damage, removes nonlethal damage, and respects bypass damage", async () => {
  const user = userEvent.setup();
  render(<RegenerationHarness />);
  await user.click(screen.getByRole("button", { name: "Activate Perfect Bastion" }));
  fireEvent.change(screen.getByLabelText("Hit point adjustment"), { target: { value: "10" } });
  await user.click(screen.getByRole("button", { name: "Take 10 damage" }));
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "10");
  assert.equal((screen.getByLabelText("Nonlethal damage") as HTMLInputElement).value, "10");
  assert.ok(screen.getByRole("alert").textContent?.includes("unconscious"));
  await user.click(screen.getByRole("button", { name: "Next round" }));
  assert.equal((screen.getByLabelText("Nonlethal damage") as HTMLInputElement).value, "0");
  assert.equal(screen.getByRole("status").textContent, "Regeneration removed 10 nonlethal damage.");
  await user.click(screen.getByLabelText("Damage bypasses regeneration"));
  fireEvent.change(screen.getByLabelText("Hit point adjustment"), { target: { value: "4" } });
  await user.click(screen.getByRole("button", { name: "Take 4 damage" }));
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "6");
  assert.equal((screen.getByLabelText("Nonlethal damage") as HTMLInputElement).value, "0");
});

test("Sacred Shield exposes Perfect Bastion regeneration in the live character path", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "paladin");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "paladin-sacred-shield");
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.equal(screen.getAllByText("Regeneration 10").length, 2);
  assert.ok(screen.getAllByText(/active Bastion of Good target/i).length >= 1);
  assert.ok(screen.getByRole("button", { name: "Activate Perfect Bastion" }));
});
