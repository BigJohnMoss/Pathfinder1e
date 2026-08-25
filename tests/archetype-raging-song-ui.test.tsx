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

const characterClass = applyArchetype(
  data.classes.find((candidate: { id: string }) => candidate.id === "skald"),
  archetypes.find((candidate: { id: string }) => candidate.id === "skald-urban-skald"),
  data.classes,
  data.spells,
);

const resources = (onUsedChange: (used: number) => void) => [{ id: "ragingSongRounds", label: "Raging Song", unit: "round", maximum: 30, used: 0, onUsedChange }];

test("Urban Skald renders exact level-gated song controls", () => {
  render(<ClassFeatures level={1} className={characterClass.name} features={featuresThroughLevel(characterClass, 1)} classLevels={{ skald: 1 }} dailyResources={resources(() => {})} />);
  const region = screen.getByRole("region", { name: "Raging Song (Su) performance rules" });
  assert.match(region.textContent ?? "", /Controlled Inspired Rage/);
  assert.match(region.textContent ?? "", /raging song round/);
  assert.doesNotMatch(region.textContent ?? "", /Infuriating Mockery/);
  assert.equal((screen.getByLabelText("Begin Controlled Inspired Rage mode") as HTMLSelectElement).options.length, 3);
  cleanup();

  render(<ClassFeatures level={10} className={characterClass.name} features={featuresThroughLevel(characterClass, 10)} classLevels={{ skald: 10 }} abilityModifiers={{ charisma: 4 }} dailyResources={resources(() => {})} />);
  assert.equal((screen.getByLabelText("Begin Controlled Inspired Rage mode") as HTMLSelectElement).options.length, 9);
  assert.equal(screen.getByRole("button", { name: "Begin Infuriating Mockery" }).hasAttribute("disabled"), false);
  assert.match(screen.getByLabelText("Begin Infuriating Mockery save DC").textContent ?? "", /19/);
  assert.equal(screen.getByRole("button", { name: "Begin Humiliating Defamation" }).hasAttribute("disabled"), false);
  cleanup();
});

test("changing a rage allocation replaces stale bonuses and spends one round", () => {
  const added: ActiveEffect[] = [];
  const removed: string[] = [];
  const spent: number[] = [];
  render(<ClassFeatures
    level={8}
    className={characterClass.name}
    features={featuresThroughLevel(characterClass, 8)}
    classLevels={{ skald: 8 }}
    dailyResources={resources((used) => spent.push(used))}
    onAddEffect={(effect) => added.push(effect)}
    onRemoveEffectByName={(name) => removed.push(name)}
  />);
  const select = screen.getByLabelText("Begin Controlled Inspired Rage mode") as HTMLSelectElement;
  fireEvent.change(select, { target: { value: "strength-2-dexterity-2" } });
  fireEvent.click(screen.getByRole("button", { name: "Begin Controlled Inspired Rage" }));
  assert.deepEqual(spent, [1]);
  assert.deepEqual(added.filter((effect) => ["strength", "dexterity", "constitution"].includes(effect.target)).map(({ target, bonus }) => ({ target, bonus })), [
    { target: "strength", bonus: 2 },
    { target: "dexterity", bonus: 2 },
  ]);
  for (const ability of ["Strength", "Dexterity", "Constitution"]) assert.ok(removed.includes(`Controlled Inspired Rage — ${ability}`));
  cleanup();
});
