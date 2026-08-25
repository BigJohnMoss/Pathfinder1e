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

test("Sound Striker spends one round and rolls one attack for every selected Weird Word", () => {
  const random = Math.random;
  Math.random = () => 0.5;
  const source = bard("bard-sound-striker");
  const used: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={12} className={source.name} features={featuresThroughLevel(source, 12)} classLevels={{ bard: 12 }} baseAttackBonus={9} abilityModifiers={{ dexterity: 3, charisma: 4 }} {...performance(used, effects)} />);
  fireEvent.change(screen.getByLabelText("Unleash Weird Words words"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("Unleash Weird Words mode"), { target: { value: "same-target" } });
  fireEvent.click(screen.getByRole("button", { name: "Unleash Weird Words" }));
  assert.deepEqual(used, [3]);
  const result = screen.getByText(/Word 3: Ranged touch attack/).textContent ?? "";
  assert.match(result, /Word 1:/);
  assert.match(result, /Word 2:/);
  assert.match(result, /Word 3:/);
  assert.match(result, /Word 1: 4d6 \+ 4 sonic damage/);
  assert.match(result, /Word 2: 4d6 sonic damage/);
  cleanup();
  Math.random = random;
});

test("Songhealer requires the continuous-performance confirmation before spending five rounds", () => {
  const source = bard("bard-songhealer");
  const used: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={14} className={source.name} features={featuresThroughLevel(source, 14)} classLevels={{ bard: 14 }} {...performance(used, effects)} />);
  const button = screen.getByRole("button", { name: "Complete Healing Performance — living target" });
  assert.equal(button.hasAttribute("disabled"), true);
  fireEvent.click(screen.getByLabelText("Complete Healing Performance — living target The target saw and heard all 5 continuous rounds"));
  fireEvent.click(button);
  assert.deepEqual(used, [5]);
  cleanup();
});

test("Voice of Brigh spends one round for each maintained construct", () => {
  const source = bard("bard-voice-of-brigh");
  const used: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={12} className={source.name} features={featuresThroughLevel(source, 12)} classLevels={{ bard: 12 }} {...performance(used, effects)} />);
  fireEvent.change(screen.getByLabelText("Maintain Brigh's Spark constructs maintained"), { target: { value: "2" } });
  fireEvent.click(screen.getByLabelText("Maintain Brigh's Spark Each target is a destroyed construct within 60 feet"));
  fireEvent.click(screen.getByRole("button", { name: "Maintain Brigh's Spark" }));
  assert.deepEqual(used, [2]);
  assert.match(effects[0]?.description ?? "", /Bard level/);
  cleanup();
});

test("Silver Balladeer calculates Holy Vibration's level-based duration", () => {
  const source = bard("bard-silver-balladeer");
  const used: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={18} className={source.name} features={featuresThroughLevel(source, 18)} classLevels={{ bard: 18 }} {...performance(used, effects)} />);
  fireEvent.click(screen.getByLabelText("Create Holy Vibration A silver or silver-stringed masterwork instrument is in use"));
  fireEvent.click(screen.getByRole("button", { name: "Create Holy Vibration" }));
  assert.deepEqual(used, [1]);
  assert.equal(effects[0]?.roundsRemaining, 180);
  cleanup();
});
