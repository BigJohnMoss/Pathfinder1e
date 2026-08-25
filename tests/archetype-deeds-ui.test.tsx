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
let cleanup: typeof import("@testing-library/react").cleanup;

before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
});

const applied = (id: string, classId: string) => applyArchetype(
  data.classes.find((candidate: { id: string }) => candidate.id === classId),
  archetypes.find((candidate: { id: string }) => candidate.id === id),
  data.classes,
  data.spells,
);

test("Deeds render as readable level-gated cards beside their usable actions", () => {
  const characterClass = applied("gunslinger-maverick", "gunslinger");
  render(<ClassFeatures
    level={3}
    className={characterClass.name}
    features={featuresThroughLevel(characterClass, 3)}
    classLevels={{ gunslinger: 3 }}
    dailyResources={[{ id: "grit", label: "Grit", unit: "point", maximum: 3, used: 0, onUsedChange: () => {} }]}
  />);
  const region = screen.getByRole("region", { name: "Deeds deed rules" });
  assert.match(region.textContent ?? "", /Stacked Deck/);
  assert.match(region.textContent ?? "", /Fist Fighter/);
  assert.match(region.textContent ?? "", /Gun Twirl/);
  assert.equal(screen.getByRole("button", { name: "Roll Stacked Deck" }).hasAttribute("disabled"), false);
  cleanup();
});

test("a maintain-panache deed cannot activate after the last point is spent", () => {
  const characterClass = applied("swashbuckler-mouser", "swashbuckler");
  render(<ClassFeatures
    level={7}
    className={characterClass.name}
    features={featuresThroughLevel(characterClass, 7)}
    classLevels={{ swashbuckler: 7 }}
    dailyResources={[{ id: "panache", label: "Panache", unit: "point", maximum: 1, used: 1, onUsedChange: () => {} }]}
  />);
  assert.equal(screen.getByRole("button", { name: "Attempt Hamstring" }).hasAttribute("disabled"), true);
  assert.equal(screen.queryByText("Cat's Charge"), null, "level 11 deed remains hidden");
  cleanup();
});
