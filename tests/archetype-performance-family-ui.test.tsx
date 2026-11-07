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
const resource = (onUsedChange: (used: number) => void) => [{ id: "bardicPerformance", label: "Bardic Performance", unit: "round", maximum: 50, used: 0, onUsedChange }];

test("Argent Voice exposes exact range, cost, bane tier, and Dedicated Performance multiplication", () => {
  const source = bard("bard-argent-voice");
  const spent: number[] = [];
  render(<ClassFeatures level={20} className={source.name} features={featuresThroughLevel(source, 20)} classLevels={{ bard: 20 }} dailyResources={resource((used) => spent.push(used))} />);
  fireEvent.change(screen.getByLabelText("Other fully ranked Perform skills"), { target: { value: "3" } });
  assert.equal(screen.getByLabelText("Perform (sing) bonus").textContent, "Perform (sing) bonus: 12");
  assert.match(screen.getByRole("button", { name: "Begin Limning Verse" }).closest("div")?.textContent ?? "", /Range: 60 feet/);
  assert.equal((screen.getByLabelText("Use Shattering Crescendo mode") as HTMLSelectElement).options.length, 2);
  fireEvent.click(screen.getByRole("button", { name: "Use Shattering Crescendo" }));
  assert.deepEqual(spent, [2]);
  assert.equal((screen.getByLabelText("Begin Devilbane Refrain mode") as HTMLSelectElement).value, "silver-and-bane");
  cleanup();
});

test("Celebrity calculates its current fame and Gather Crowd audience", () => {
  const source = bard("bard-celebrity");
  render(<ClassFeatures level={17} className={source.name} features={featuresThroughLevel(source, 17)} classLevels={{ bard: 17 }} dailyResources={resource(() => {})} />);
  const fame = screen.getByRole("region", { name: "Famous region" });
  assert.match(fame.textContent ?? "", /Most civilized folk/);
  assert.match(fame.textContent ?? "", /\+5/);
  fireEvent.change(screen.getByLabelText("Perform check result"), { target: { value: "20" } });
  assert.equal(screen.getByLabelText("Typical crowd size").textContent, "Typical crowd size: 160");
  assert.match(screen.getByRole("region", { name: "Bardic Performance performance rules" }).textContent ?? "", /Gather Crowd[\s\S]*Shining Star/);
  cleanup();
});

test("Demagogue enforces the fascinated-crowd confirmation and tracks Incite Violence", () => {
  const source = bard("bard-demagogue");
  const added: ActiveEffect[] = [];
  const spent: number[] = [];
  render(<ClassFeatures level={18} className={source.name} features={featuresThroughLevel(source, 18)} classLevels={{ bard: 18 }} abilityModifiers={{ charisma: 4 }} dailyResources={resource((used) => spent.push(used))} onAddEffect={(effect) => added.push(effect)} />);
  const incite = screen.getByRole("button", { name: "Incite Violence" });
  assert.equal(incite.hasAttribute("disabled"), true);
  assert.equal(screen.getByLabelText("Incite Violence maximum targets").textContent, "Up to 18 targets");
  assert.match(screen.getByLabelText("Incite Violence save DC").textContent ?? "", /23/);
  fireEvent.click(screen.getByLabelText("Incite Violence The selected crowd members are currently fascinated"));
  assert.equal(incite.hasAttribute("disabled"), false);
  fireEvent.change(screen.getByLabelText("Incite Violence target will modifier"), { target: { value: "-20" } });
  const originalRandom = Math.random;
  Math.random = () => 0.95;
  try { fireEvent.click(incite); } finally { Math.random = originalRandom; }
  assert.deepEqual(spent, [1]);
  assert.equal(added.find((effect) => /Incited Violence/.test(effect.name))?.roundsRemaining, 18);
  assert.equal(screen.getByRole("button", { name: "Righteous Cause" }).hasAttribute("disabled"), true);
  cleanup();
});
