import test, { before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";
import type { ActiveEffect } from "../packages/types/src/index";

let ClassFeatures: typeof import("../apps/web/app/class-features").ClassFeatures;
let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let cleanup: typeof import("@testing-library/react").cleanup;

before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, fireEvent, cleanup } = await import("@testing-library/react"));
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
});

const bard = (id: string) => applyArchetype(data.classes.find((candidate: { id: string }) => candidate.id === "bard"), archetypes.find((candidate: { id: string }) => candidate.id === id), data.classes, data.spells);
const performance = (spent: number[], effects: ActiveEffect[], maximum = 50) => ({ dailyResources: [{ id: "bardicPerformance", label: "Bardic Performance", unit: "round", maximum, used: 0, onUsedChange: (value: number) => spent.push(value) }], activeEffects: effects, onAddEffect: (effect: ActiveEffect) => effects.push(effect) });

test("Tea Ceremony multiplies the selected ally count by four", () => {
  const source = bard("bard-geisha");
  const spent: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={15} className={source.name} features={featuresThroughLevel(source, 15)} classLevels={{ bard: 15 }} {...performance(spent, effects)} />);
  fireEvent.change(screen.getByLabelText("Complete Tea Ceremony allies affected"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("Complete Tea Ceremony mode"), { target: { value: "heroics" } });
  fireEvent.click(screen.getByRole("button", { name: "Complete Tea Ceremony" }));
  assert.deepEqual(spent, [12]);
  assert.equal(effects[0]?.roundsRemaining, 100);
  assert.match(effects[0]?.description ?? "", /3 selected allies/);
  cleanup();
});

test("Combat Juggling uses its level-based maximum without requiring a resource", () => {
  const source = bard("bard-juggler");
  const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={18} className={source.name} features={featuresThroughLevel(source, 18)} classLevels={{ bard: 18 }} onAddEffect={(effect) => effects.push(effect)} />);
  const input = screen.getByLabelText("Begin Combat Juggling objects juggled") as HTMLInputElement;
  assert.equal(input.max, "7");
  fireEvent.change(input, { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Begin Combat Juggling" }));
  assert.match(effects[0]?.description ?? "", /Juggling 7/);
  cleanup();
});

test("Swap resolves its CMD and CMD-plus-10 outcome bands", () => {
  const source = bard("bard-prankster");
  render(<ClassFeatures level={1} className={source.name} features={featuresThroughLevel(source, 1)} classLevels={{ bard: 1 }} />);
  fireEvent.change(screen.getByLabelText("Attempt Swap sleight of hand modifier"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Attempt Swap target cmd"), { target: { value: "10" } });
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try { fireEvent.click(screen.getByRole("button", { name: "Attempt Swap" })); } finally { Math.random = originalRandom; }
  assert.match(screen.getByLabelText("Attempt Swap result").textContent ?? "", /swap succeeds and target remains unaware/);
  cleanup();
});

test("failed Mock saves add both numeric penalties and successful saves add immunity", () => {
  const source = bard("bard-prankster");
  const spent: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={10} className={source.name} features={featuresThroughLevel(source, 10)} classLevels={{ bard: 10 }} abilityModifiers={{ charisma: 4 }} {...performance(spent, effects)} />);
  fireEvent.change(screen.getByLabelText("Resolve Mock target target name"), { target: { value: "Goblin" } });
  fireEvent.change(screen.getByLabelText("Resolve Mock target target will modifier"), { target: { value: "-20" } });
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try { fireEvent.click(screen.getByRole("button", { name: "Resolve Mock target" })); } finally { Math.random = originalRandom; }
  assert.ok(effects.some((effect) => effect.target === "attackRolls" && effect.bonus === -2));
  assert.ok(effects.some((effect) => effect.target === "skillChecks" && effect.bonus === -2));
  assert.match(screen.getByLabelText("Resolve Mock target result").textContent ?? "", /failure/);
  cleanup();
});
