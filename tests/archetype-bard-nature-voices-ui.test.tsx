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

function FeatureHarness({ id, level, charisma = 0 }: { id: string; level: number; charisma?: number }) {
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  const [used, setUsed] = useState(0);
  const source = bard(id);
  const latest = effects.at(-1);
  return <>
    <ClassFeatures
      level={level}
      className={source.name}
      features={featuresThroughLevel(source, level)}
      classLevels={{ bard: level }}
      abilityModifiers={{ charisma }}
      dailyResources={[{ id: "bardicPerformance", label: "Bardic Performance", unit: "round", maximum: 50, used, onUsedChange: setUsed }]}
      activeEffects={effects}
      onAddEffect={(effect) => setEffects((current) => [...current, effect])}
    />
    {latest && <output aria-label="latest effect">{latest.name} · {latest.target} {latest.bonus >= 0 ? "+" : ""}{latest.bonus} · {latest.description}</output>}
  </>;
}

test("Song of the Wild exposes its level-17 target cap and applies the Stag speed bonus", () => {
  render(<FeatureHarness id="bard-voice-of-the-wild" level={17} />);
  const mode = screen.getByLabelText("Begin Song of the Wild mode") as HTMLSelectElement;
  fireEvent.change(mode, { target: { value: "stag" } });
  assert.equal(screen.getByLabelText("Begin Song of the Wild maximum targets").textContent, "Up to 3 targets");
  fireEvent.click(screen.getByRole("button", { name: "Begin Song of the Wild" }));
  assert.match(screen.getByLabelText("latest effect").textContent ?? "", /Song of the Wild — Stag · landSpeed \+20/);
  cleanup();
});

test("Song of Growth enforces the Charisma-plus-half-level barrier limit", () => {
  render(<FeatureHarness id="bard-cultivator" level={5} charisma={2} />);
  const button = screen.getByRole("button", { name: "Create Song of Growth Barrier" }) as HTMLButtonElement;
  assert.equal(screen.getByLabelText("Create Song of Growth Barrier active limit").textContent, "0/4 active");
  for (let index = 0; index < 4; index += 1) fireEvent.click(button);
  assert.equal(screen.getByLabelText("Create Song of Growth Barrier active limit").textContent, "4/4 active");
  assert.equal(button.disabled, true);
  assert.match(screen.getAllByText(/10 hit points/).at(-1)?.textContent ?? "", /10 hit points/);
  cleanup();
});

function AnimalKindChoices() {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const source = bard("bard-animal-speaker");
  const choices = featuresThroughLevel(source, 17).filter((feature: any) => feature.choiceRequired && feature.optionGroupId).map((feature: any) => {
    const options = data.optionGroups.find((group: any) => group.id === feature.optionGroupId)?.options ?? [];
    return { id: feature.id, name: feature.name, level: feature.level, options, selected: options.find((option: any) => option.id === selectedOptions[feature.id]) };
  });
  return <ClassOptions choices={choices} selectedOptions={selectedOptions} classLevel={17} charismaModifier={0} onOptionChange={(id, optionId) => setSelectedOptions((current) => ({ ...current, [id]: optionId }))} />;
}

test("Animal Speaker accepts four named animal kinds and rejects duplicate details", () => {
  render(<AnimalKindChoices />);
  const selectors = screen.getAllByRole("combobox") as HTMLSelectElement[];
  for (const selector of selectors) fireEvent.change(selector, { target: { value: "bard-animal-friend-kind" } });
  const values = ["Cats", "Dogs", "Horses", "Ravens"];
  values.forEach((value, index) => fireEvent.change(screen.getByLabelText(`Animal Friend Kind ${index + 1} Animal kind`), { target: { value } }));
  values.forEach((value, index) => assert.equal((screen.getByLabelText(`Animal Friend Kind ${index + 1} Animal kind`) as HTMLInputElement).value, value));
  fireEvent.change(screen.getByLabelText("Animal Friend Kind 2 Animal kind"), { target: { value: "Cats" } });
  assert.equal((screen.getByLabelText("Animal Friend Kind 2 Animal kind") as HTMLInputElement).value, "");
  cleanup();
});
