import test, { before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";
import type { ActiveEffect } from "../packages/types/src/index.js";

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

test("level 18 Tactical Leader grants two selected teamwork feats with scaled duration", () => {
  const source = archetypes.find((candidate: { id: string }) => candidate.id === "inquisitor-tactical-leader");
  const base = data.classes.find((candidate: { id: string }) => candidate.id === "inquisitor");
  const applied = applyArchetype(base, source, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  let used = 0;
  render(<ClassFeatures
    level={18}
    className={applied.name}
    features={featuresThroughLevel(applied, 18)}
    classLevels={{ inquisitor: 18 }}
    selectedFeats={[{ id: "outflank", name: "Outflank", type: "teamwork" }, { id: "precise-strike", name: "Precise Strike", type: "teamwork" }]}
    dailyResources={[{ id: "archetype-inquisitor-tactical-leader-tactician-ex-3", label: "Tactician", unit: "use", maximum: 5, used, onUsedChange: (next) => { used = next; } }]}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  assert.equal((screen.getByLabelText("Grant Tactician teamwork feat 1") as HTMLSelectElement).value, "outflank");
  assert.equal((screen.getByLabelText("Grant Tactician teamwork feat 2") as HTMLSelectElement).value, "precise-strike");
  fireEvent.click(screen.getByRole("button", { name: "Grant Tactician" }));
  assert.equal(used, 1);
  assert.equal(effects[0].roundsRemaining, 12);
  assert.match(effects[0].description ?? "", /Outflank, Precise Strike/);
  assert.match(screen.getByLabelText("Grant Tactician result").textContent ?? "", /swift action/);
  cleanup();
});

test("Holy Guide requires the non-evil recipient confirmation", () => {
  const source = archetypes.find((candidate: { id: string }) => candidate.id === "paladin-holy-guide");
  const base = data.classes.find((candidate: { id: string }) => candidate.id === "paladin");
  const applied = applyArchetype(base, source, data.classes, data.spells);
  render(<ClassFeatures level={6} className={applied.name} features={featuresThroughLevel(applied, 6)} classLevels={{ paladin: 6 }} selectedFeats={[{ id: "outflank", name: "Outflank", type: "teamwork" }]} dailyResources={[{ id: "smiteEvil", label: "Smite Evil", unit: "use", maximum: 2, used: 0, onUsedChange: () => {} }]} />);
  const button = screen.getByRole("button", { name: "Grant Teamwork Feat" });
  assert.equal(button.hasAttribute("disabled"), true);
  fireEvent.click(screen.getByLabelText("Grant Teamwork Feat All recipients are non-evil allies"));
  assert.equal(button.hasAttribute("disabled"), false);
  cleanup();
});
