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
const performance = (used: number[], effects: ActiveEffect[]) => ({ dailyResources: [{ id: "bardicPerformance", label: "Bardic Performance", unit: "round", maximum: 50, used: 0, onUsedChange: (value: number) => used.push(value) }], activeEffects: effects, onAddEffect: (effect: ActiveEffect) => effects.push(effect) });

test("Arcane Healer enforces target eligibility and spends two rounds on the selected cure", () => {
  const source = bard("bard-arcane-healer");
  const used: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={17} className={source.name} features={featuresThroughLevel(source, 17)} classLevels={{ bard: 17 }} {...performance(used, effects)} />);
  const cast = screen.getByRole("button", { name: "Inspiring Healing — Cure Serious Wounds" });
  assert.equal(cast.hasAttribute("disabled"), true);
  fireEvent.click(screen.getByLabelText("Inspiring Healing — Cure Serious Wounds This target has not received Inspiring Healing in the last 24 hours"));
  fireEvent.click(cast);
  assert.deepEqual(used, [2]);
  assert.match(effects[0]?.name ?? "", /24-hour target limit/);
  cleanup();
});

test("Lotus Geisha applies the selected single-target enhancement at swift speed", () => {
  const source = bard("bard-lotus-geisha");
  const used: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={15} className={source.name} features={featuresThroughLevel(source, 15)} classLevels={{ bard: 15 }} {...performance(used, effects)} />);
  fireEvent.change(screen.getByLabelText("Begin Enrapturing Performance mode"), { target: { value: "inspire-heroics" } });
  const button = screen.getByRole("button", { name: "Begin Enrapturing Performance" });
  assert.match(button.closest("div")?.textContent ?? "", /swift action/);
  fireEvent.click(button);
  assert.deepEqual(used, [1]);
  assert.equal(effects.find((effect) => effect.name.includes("Heroics — AC"))?.bonus, 1);
  cleanup();
});

test("Sorrowsoul spends double rounds and creates a working fast-healing tracker", () => {
  const source = bard("bard-sorrowsoul");
  const used: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={17} className={source.name} features={featuresThroughLevel(source, 17)} classLevels={{ bard: 17 }} {...performance(used, effects)} />);
  fireEvent.change(screen.getByLabelText("Begin Lyric Sorrow mode"), { target: { value: "heroics" } });
  fireEvent.click(screen.getByRole("button", { name: "Begin Lyric Sorrow" }));
  assert.deepEqual(used, [2]);
  const healing = effects.find((effect) => effect.fastHealing === 5);
  assert.equal(healing?.target, "self");
  assert.match(healing?.description ?? "", /50% miss chance/);
  cleanup();
});
