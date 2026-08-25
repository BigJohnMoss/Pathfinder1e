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

test("Court Fool exposes skill inputs, target growth, and tracked take 20 uses", () => {
  const source = bard("bard-court-fool");
  const used: number[] = [];
  render(<ClassFeatures level={19} className={source.name} features={featuresThroughLevel(source, 19)} classLevels={{ bard: 19 }} dailyResources={[{ id: "bardicPerformance", label: "Bardic Performance", unit: "round", maximum: 50, used: 0, onUsedChange: () => {} }, { id: "caperAndJeer", label: "Caper and Jeer", unit: "use", maximum: 3, used: 0, onUsedChange: (value) => used.push(value) }]} />);
  assert.equal(screen.getByLabelText("Defuse Tension maximum targets").textContent, "Up to 5 targets");
  fireEvent.change(screen.getByLabelText("Distracting Motley acrobatics modifier"), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Take 20" }));
  assert.deepEqual(used, [1]);
  assert.match(screen.getByLabelText("Take 20 result").textContent ?? "", /d20 result as 20/);
  cleanup();
});

test("Chelish Diva resolves half living-creature damage and tracks Prima Donna precisely", () => {
  const source = bard("bard-chelish-diva");
  const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={10} className={source.name} features={featuresThroughLevel(source, 10)} classLevels={{ bard: 10 }} dailyResources={[{ id: "bardicPerformance", label: "Bardic Performance", unit: "round", maximum: 50, used: 0, onUsedChange: () => {} }]} activeEffects={effects} onAddEffect={(effect) => effects.push(effect)} />);
  fireEvent.change(screen.getByLabelText("Use Prima Donna affected target"), { target: { value: "performanceSaveDc" } });
  fireEvent.click(screen.getByRole("button", { name: "Use Prima Donna" }));
  assert.equal(effects[0]?.target, "performanceSaveDc");
  assert.equal(effects[0]?.bonus, 2);
  fireEvent.change(screen.getByLabelText("Devastating Aria mode"), { target: { value: "living-creature" } });
  const originalRandom = Math.random;
  Math.random = () => 0.99;
  try { fireEvent.click(screen.getByRole("button", { name: "Devastating Aria" })); } finally { Math.random = originalRandom; }
  assert.match(screen.getByLabelText("Devastating Aria result").textContent ?? "", /= 7 damage/);
  cleanup();
});
