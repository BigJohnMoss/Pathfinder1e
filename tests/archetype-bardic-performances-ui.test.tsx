import test, { before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";

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

const applied = (id: string) => applyArchetype(
  data.classes.find((candidate: { id: string }) => candidate.id === "bard"),
  archetypes.find((candidate: { id: string }) => candidate.id === id),
  data.classes,
  data.spells,
);

test("Thundercaller renders level-gated performance cards and usable combat controls", () => {
  const characterClass = applied("bard-thundercaller");
  render(<ClassFeatures level={8} className={characterClass.name} features={featuresThroughLevel(characterClass, 8)} classLevels={{ bard: 8 }} abilityModifiers={{ charisma: 4 }} dailyResources={[{ id: "bardicPerformance", label: "Bardic Performance", unit: "round", maximum: 20, used: 0, onUsedChange: () => {} }]} />);
  const region = screen.getByRole("region", { name: "Bardic Performance performance rules" });
  for (const name of ["Thunder Call", "Incite Rage", "Call Lightning"]) assert.match(region.textContent ?? "", new RegExp(name));
  assert.doesNotMatch(region.textContent ?? "", /Call Lightning Storm/);
  assert.match(screen.getByLabelText("Use Thunder Call attack profile").textContent ?? "", /3d8/);
  assert.equal(screen.getByRole("button", { name: "Begin Call Lightning" }).hasAttribute("disabled"), false);
  cleanup();
});

test("page memorization is capped at half bard level and spends the selected rounds", () => {
  const characterClass = applied("bard-impervious-messenger");
  let used = 0;
  const { rerender } = render(<ClassFeatures level={6} className={characterClass.name} features={featuresThroughLevel(characterClass, 6)} classLevels={{ bard: 6 }} dailyResources={[{ id: "bardicPerformance", label: "Bardic Performance", unit: "round", maximum: 20, used, onUsedChange: (next) => { used = next; } }]} />);
  const input = screen.getByLabelText("Memorize pages pages and performance rounds") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "99" } });
  assert.equal(input.value, "3");
  fireEvent.click(screen.getByRole("button", { name: "Memorize pages" }));
  assert.equal(used, 3);
  rerender(<ClassFeatures level={6} className={characterClass.name} features={featuresThroughLevel(characterClass, 6)} classLevels={{ bard: 6 }} dailyResources={[{ id: "bardicPerformance", label: "Bardic Performance", unit: "round", maximum: 20, used, onUsedChange: (next) => { used = next; } }]} />);
  assert.match(screen.getByLabelText("Memorize pages result").textContent ?? "", /Memorize Page activated/);
  cleanup();
});
