import test, { before } from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { JSDOM } from "jsdom";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";
import type { ActiveEffect } from "../packages/types/src/index";

let ClassFeatures: typeof import("../apps/web/app/class-features").ClassFeatures;
let ClassOptions: typeof import("../apps/web/app/class-options").ClassOptions;
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
  ClassOptions = (await import("../apps/web/app/class-options")).ClassOptions;
});

const bard = (id: string) => applyArchetype(data.classes.find((candidate: { id: string }) => candidate.id === "bard"), archetypes.find((candidate: { id: string }) => candidate.id === id), data.classes, data.spells);
const resource = (spent: number[], effects: ActiveEffect[]) => ({ dailyResources: [{ id: "bardicPerformance", label: "Bardic Performance", unit: "round", maximum: 50, used: 0, onUsedChange: (value: number) => spent.push(value) }], activeEffects: effects, onAddEffect: (effect: ActiveEffect) => effects.push(effect) });

test("Waterstrike rolls three normal-AC iterative attacks with Charisma at level 20", () => {
  const source = bard("bard-watersinger");
  const spent: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={20} className={source.name} features={featuresThroughLevel(source, 20)} classLevels={{ bard: 20 }} baseAttackBonus={15} abilityModifiers={{ charisma: 4 }} {...resource(spent, effects)} />);
  assert.match(screen.getByLabelText("Command Waterstrike attack profile").textContent ?? "", /3 attacks/);
  fireEvent.change(screen.getByLabelText("Command Waterstrike target AC"), { target: { value: "10" } });
  fireEvent.click(screen.getByLabelText("Command Waterstrike Watersong is currently manipulating the attacking water"));
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try { fireEvent.click(screen.getByRole("button", { name: "Command Waterstrike" })); } finally { Math.random = originalRandom; }
  const result = screen.getByLabelText("Command Waterstrike result").textContent ?? "";
  assert.match(result, /Attack 1:.*\+ 19/);
  assert.match(result, /Attack 2:.*\+ 14/);
  assert.match(result, /Attack 3:.*\+ 9/);
  assert.deepEqual(spent, [1]);
  cleanup();
});

test("Lifewater rolls and tracks its random sickened duration", () => {
  const source = bard("bard-watersinger");
  const spent: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={5} className={source.name} features={featuresThroughLevel(source, 5)} classLevels={{ bard: 5 }} {...resource(spent, effects)} />);
  assert.match(screen.getByText(/1d4 rounds \(rolled on activation\)/).textContent ?? "", /1d4/);
  fireEvent.click(screen.getByLabelText("Use Lifewater — Sicken The target is within 30 feet, contains fluid, and is not immune to critical hits"));
  const originalRandom = Math.random;
  Math.random = () => 0;
  try { fireEvent.click(screen.getByRole("button", { name: "Use Lifewater — Sicken" })); } finally { Math.random = originalRandom; }
  assert.equal(effects.at(-1)?.roundsRemaining, 1);
  assert.match(screen.getByLabelText("Use Lifewater — Sicken result").textContent ?? "", /1 round/);
  cleanup();
});

test("Plant Speaker shows the hour-long capstone activation", () => {
  const source = bard("bard-plant-speaker");
  const spent: number[] = []; const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={17} className={source.name} features={featuresThroughLevel(source, 17)} classLevels={{ bard: 17 }} {...resource(spent, effects)} />);
  assert.match(screen.getByText("Activation: 1-hour action.").textContent ?? "", /1-hour/);
  assert.ok(screen.getByRole("button", { name: "Perform Mystical Allegory — Legend Lore" }));
  cleanup();
});

function FaithSingerChoices() {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const source = bard("bard-faith-singer");
  const features = featuresThroughLevel(source, 18).filter((candidate: any) => candidate.choiceRequired && candidate.optionGroupId);
  const choices = features.map((candidate: any) => {
    const options = data.optionGroups.find((group: any) => group.id === candidate.optionGroupId)?.options ?? [];
    return { id: candidate.id, name: candidate.name, level: candidate.level, options, selected: options.find((option: any) => option.id === selectedOptions[candidate.id]) };
  });
  return <ClassOptions choices={choices} selectedOptions={selectedOptions} classLevel={18} charismaModifier={4} onOptionChange={(id, optionId) => setSelectedOptions((current) => ({ ...current, [id]: optionId }))} />;
}

test("Faith Singer choices unlock only legal alignments, domains, and domain spells", () => {
  render(<FaithSingerChoices />);
  fireEvent.change(screen.getByLabelText(/Faithful Deity/), { target: { value: "deity-sarenrae" } });
  const alignment = screen.getByLabelText(/Faithful Alignment/) as HTMLSelectElement;
  assert.deepEqual(Array.from(alignment.options).slice(1).map((option) => option.text), ["Lawful Good", "Neutral Good", "Chaotic Good", "Neutral"]);
  fireEvent.change(alignment, { target: { value: "alignment-neutral-good" } });
  const domain = screen.getAllByLabelText(/Devout Domain/)[0] as HTMLSelectElement;
  const domainNames = Array.from(domain.options).slice(1).map((option) => option.text);
  for (const expected of ["Fire Domain", "Glory Domain", "Good Domain", "Healing Domain", "Sun Domain", "Ash Subdomain (Fire)"]) {
    assert.ok(domainNames.includes(expected), `${expected} should be available to a Sarenrae worshipper`);
  }
  assert.equal(domainNames.includes("Trickery Domain"), false);
  fireEvent.change(domain, { target: { value: "domain-fire" } });
  const firstSpell = screen.getByLabelText(/1st-level Devout Domain Spell/) as HTMLSelectElement;
  assert.deepEqual(Array.from(firstSpell.options).slice(1).map((option) => option.text), ["burning hands"]);
  fireEvent.change(firstSpell, { target: { value: "domain-spell-1-burning-hands" } });
  assert.equal(screen.getByLabelText("1st-level Devout Domain Spell status").textContent, "Available");
  cleanup();
});
