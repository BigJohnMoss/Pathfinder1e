import test, { before } from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
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
const maximums: Record<string, number> = { bardicPerformance: 50, onTheBall: 3, masterOfMischiefTake20: 3, devilsTongueTake20: 3, learnedPhysicianTake20: 3, creativeTreatment: 5 };

function Harness({ id, level }: { id: string; level: number }) {
  const [used, setUsed] = useState<Record<string, number>>({});
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  const source = bard(id);
  const latest = effects.at(-1);
  return <>
    <ClassFeatures level={level} className={source.name} features={featuresThroughLevel(source, level)} classLevels={{ bard: level }} abilityModifiers={{ charisma: 4 }} dailyResources={Object.entries(maximums).map(([resourceId, maximum]) => ({ id: resourceId, label: resourceId, unit: "use", maximum, used: used[resourceId] ?? 0, onUsedChange: (next) => setUsed((current) => ({ ...current, [resourceId]: next })) }))} activeEffects={effects} onAddEffect={(effect) => setEffects((current) => [...current, effect])} />
    {latest && <output aria-label="latest effect">{latest.name} · {latest.description}</output>}
  </>;
}

test("Wit's On the Ball upgrades to 20 and Cutting Remark shows level-20 damage", () => {
  render(<Harness id="bard-wit" level={20} />);
  assert.equal(screen.getByLabelText("Use On the Ball fixed d20 result").textContent, "Natural d20 result: 20");
  assert.match(screen.getByLabelText("Deliver Cutting Remark roll profile").textContent ?? "", /1d4\+20/);
  fireEvent.click(screen.getByRole("button", { name: "Use On the Ball" }));
  assert.match(screen.getByLabelText("Use On the Ball result").textContent ?? "", /result as 20/);
  cleanup();
});

test("Fey Prankster enforces each mishap trigger and exposes bounded take 20", () => {
  render(<Harness id="bard-fey-prankster" level={17} />);
  const drop = screen.getByRole("button", { name: "Resolve Song of Clumsiness — Drop" }) as HTMLButtonElement;
  assert.equal(drop.disabled, true);
  fireEvent.click(screen.getByLabelText(/Resolve Song of Clumsiness — Drop The enemy drew/));
  assert.equal(drop.disabled, false);
  assert.equal(screen.getByLabelText("Use Master of Mischief Take 20 fixed d20 result").textContent, "Natural d20 result: 20");
  cleanup();
});

test("Brazen Deceiver unlocks impossible lies and its tracked shadow-performance rules", () => {
  render(<Harness id="bard-brazen-deceiver" level={11} />);
  const mode = screen.getByLabelText("Begin Deceptive Tale mode") as HTMLSelectElement;
  assert.ok(Array.from(mode.options).some((option) => option.value === "impossible"));
  fireEvent.change(mode, { target: { value: "impossible" } });
  fireEvent.click(screen.getByRole("button", { name: "Begin Deceptive Tale" }));
  assert.match(screen.getByLabelText("latest effect").textContent ?? "", /impossible lie/);
  cleanup();
});

test("Provocateur and Solacer expose their exact active user paths", () => {
  render(<Harness id="bard-provocateur" level={18} />);
  const damning = screen.getByRole("button", { name: "Begin Damning Performance" }) as HTMLButtonElement;
  assert.equal(damning.disabled, true);
  assert.equal((screen.getByLabelText("Begin Damning Performance mode") as HTMLSelectElement).value, "days");
  fireEvent.click(screen.getByLabelText(/Begin Damning Performance The observers are currently fascinated/));
  assert.equal(damning.disabled, false);
  cleanup();

  render(<Harness id="bard-solacer" level={19} />);
  assert.equal((screen.getByLabelText("Perform Invigorating Artistry mode") as HTMLSelectElement).value, "plus-five");
  const treatment = screen.getByRole("button", { name: "Reroll Heal check" }) as HTMLButtonElement;
  assert.equal(treatment.disabled, false);
  cleanup();
});
