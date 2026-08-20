import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";
import type { ActiveEffect } from "../packages/types/src/index.js";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let ClassFeatures: typeof import("../apps/web/app/class-features").ClassFeatures;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
});

test.afterEach(() => cleanup());

test("save-effect actions roll the target save and apply Hit-Dice upgrades", async () => {
  const baseClass = data.classes.find((item) => item.id === "cavalier");
  const archetype = archetypes.find((item) => item.id === "cavalier-fell-rider");
  const applied = applyArchetype(baseClass, archetype, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    render(<ClassFeatures level={14} className={applied.name} features={featuresThroughLevel(applied, 14)} classLevels={{ cavalier: 14 }} abilityModifiers={{ charisma: 3 }} onAddEffect={(effect) => effects.push(effect)} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Use Terror target Hit Dice"));
    await user.type(screen.getByLabelText("Use Terror target Hit Dice"), "7");
    await user.click(screen.getByRole("button", { name: "Use Terror" }));
    assert.equal(effects[0].name, "Frightened — Target");
    assert.equal(effects[0].roundsRemaining, 14);
    assert.match(screen.getByLabelText("Use Terror result").textContent ?? "", /failure; frightened for 14 rounds/i);
  } finally {
    Math.random = originalRandom;
  }
});

test("successful saves add the published 24-hour immunity tracker", async () => {
  const baseClass = data.classes.find((item) => item.id === "cavalier");
  const archetype = archetypes.find((item) => item.id === "cavalier-fell-rider");
  const applied = applyArchetype(baseClass, archetype, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  const originalRandom = Math.random;
  Math.random = () => 0.95;
  try {
    render(<ClassFeatures level={14} className={applied.name} features={featuresThroughLevel(applied, 14)} classLevels={{ cavalier: 14 }} abilityModifiers={{ charisma: 3 }} onAddEffect={(effect) => effects.push(effect)} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Use Terror" }));
    assert.equal(effects[0].name, "Terror immunity — Target");
    assert.equal(effects[0].roundsRemaining, 999);
    assert.match(screen.getByLabelText("Use Terror result").textContent ?? "", /success; effect negated and immunity tracked/i);
  } finally {
    Math.random = originalRandom;
  }
});

test("a named target's tracked immunity prevents another activation", async () => {
  const baseClass = data.classes.find((item) => item.id === "cavalier");
  const archetype = archetypes.find((item) => item.id === "cavalier-fell-rider");
  const applied = applyArchetype(baseClass, archetype, data.classes, data.spells);
  render(<ClassFeatures level={14} className={applied.name} features={featuresThroughLevel(applied, 14)} classLevels={{ cavalier: 14 }} abilityModifiers={{ charisma: 3 }} activeEffects={[{ id: "immune", name: "Terror immunity — Ogre", target: "enemy", bonus: 0, description: "Immune", roundsRemaining: 999 }]} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Use Terror target name"), "Ogre");
  assert.equal((screen.getByRole("button", { name: "Use Terror" }) as HTMLButtonElement).disabled, true);
  assert.match(screen.getByText(/Ogre is immune to this ability/).textContent ?? "", /Ogre/);
});

test("Dazing Charm enforces its trigger and tracks immunity after a failed save", async () => {
  const baseClass = data.classes.find((item) => item.id === "swashbuckler");
  const archetype = archetypes.find((item) => item.id === "swashbuckler-dashing-thief");
  const applied = applyArchetype(baseClass, archetype, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  let used = 0;
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    render(<ClassFeatures level={3} className={applied.name} features={featuresThroughLevel(applied, 3)} classLevels={{ swashbuckler: 3 }} abilityModifiers={{ charisma: 3 }} dailyResources={[{ id: "panache", label: "Panache", unit: "point", maximum: 3, used: 0, onUsedChange: (value) => { used = value; } }]} onAddEffect={(effect) => effects.push(effect)} />);
    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: "Use Dazing Charm Deed" }) as HTMLButtonElement;
    assert.equal(button.disabled, true);
    await user.click(screen.getByLabelText("Use Dazing Charm Deed Successfully feinted the target"));
    await user.click(screen.getByLabelText("Use Dazing Charm Deed Target is eligible for this effect"));
    await user.type(screen.getByLabelText("Use Dazing Charm Deed target name"), "Orc");
    await user.click(button);
    assert.equal(used, 1);
    assert.deepEqual(effects.map((effect) => effect.name), ["Dazed — Orc", "Dazing Charm Deed immunity — Orc"]);
    assert.match(screen.getByLabelText("Use Dazing Charm Deed result").textContent ?? "", /failure; dazed for 1 round and immunity tracked/i);
  } finally {
    Math.random = originalRandom;
  }
});
