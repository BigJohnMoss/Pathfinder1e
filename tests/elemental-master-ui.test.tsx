import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { JSDOM } from "jsdom";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";
import type { ActiveEffect, CharacterArchetype, CharacterClass } from "../packages/types/src/index.js";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let ClassFeatures: typeof import("../apps/web/app/class-features").ClassFeatures;

const arcanist = JSON.parse(readFileSync(new URL("../packages/data/src/classes/arcanist.json", import.meta.url), "utf8")) as CharacterClass;
const elementalMaster = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/arcanist-elemental-master.json", import.meta.url), "utf8")) as CharacterArchetype;
const applied = applyArchetype(arcanist, elementalMaster);

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
});

test.afterEach(() => cleanup());

function renderElement(optionId: string, effects: ActiveEffect[] = [], spent: number[] = []) {
  render(<ClassFeatures
    level={20}
    className="Arcanist (Elemental Master)"
    features={featuresThroughLevel(applied, 20)}
    dailyResources={[{ id: "arcaneReservoir", label: "Arcane Reservoir", unit: "point", maximum: 20, used: 0, onUsedChange: (used) => spent.push(used) }]}
    abilityModifiers={{ charisma: 4, dexterity: 2 }}
    saveModifiers={{ fortitude: 8, reflex: 7, will: 12 }}
    baseAttackBonus={10}
    classLevels={{ arcanist: 20 }}
    selectedOptionIds={[optionId]}
    onAddEffect={(effect) => effects.push(effect)}
  />);
}

test("Elemental Master exposes only the selected element's attacks and movement", () => {
  renderElement("wizard-school-fire");
  assert.ok(screen.getByRole("button", { name: "Use Flame Arc" }));
  assert.ok(screen.getByRole("button", { name: "Use Burning Flame" }));
  assert.equal(screen.queryByRole("button", { name: "Use Lightning Lance" }), null);
  assert.equal(screen.queryByRole("button", { name: "Use Acid Jet" }), null);
  assert.equal(screen.queryByRole("button", { name: "Use Ice Missile" }), null);
  assert.match(screen.getByRole("region", { name: "Fire elemental movement" }).textContent ?? "", /Land speed \+30 feet/);
});

test("Dancing Electricity rolls touch attack, upgraded damage, save, and adjacent damage", async () => {
  const user = userEvent.setup();
  const effects: ActiveEffect[] = [];
  const spent: number[] = [];
  renderElement("wizard-school-air", effects, spent);
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    await user.click(screen.getByRole("button", { name: "Use Dancing Electricity" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.deepEqual(spent, [2]);
  const result = screen.getByLabelText("Use Dancing Electricity result").textContent ?? "";
  assert.match(result, /Ranged touch attack: 11 \+ 12 = 23.*hit/);
  assert.match(result, /11d8 \+ 4 electricity damage.*= 59/);
  assert.match(result, /Fortitude save: 11 = 11 vs DC 24.*failure/);
  assert.match(result, /Adjacent dancing electricity: 27 damage.*27 damage after save/);
  assert.equal(effects[0]?.name, "Lightning Lance impaired vision");
  assert.equal(effects[0]?.roundsRemaining, 1);
  assert.match(screen.getByRole("region", { name: "Air elemental movement" }).textContent ?? "", /Fly 90 feet \(average\)/);
});

test("Lingering Acid calculates its diminishing d6 sequence", async () => {
  const user = userEvent.setup();
  const effects: ActiveEffect[] = [];
  renderElement("wizard-school-earth", effects);
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    await user.click(screen.getByRole("button", { name: "Use Lingering Acid" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.match(screen.getByLabelText("Use Lingering Acid result").textContent ?? "", /Lingering Acid applied for 3 rounds/);
  const lingering = effects.find((effect) => effect.name === "Lingering Acid");
  assert.equal(lingering?.roundsRemaining, 3);
  assert.match(lingering?.description ?? "", /5d6 → 2d6 → 1d6/);
  assert.match(screen.getByRole("region", { name: "Earth elemental movement" }).textContent ?? "", /Burrow 30 feet/);
});

test("Burning Flame applies ongoing fire only after a failed Reflex save", async () => {
  const user = userEvent.setup();
  const effects: ActiveEffect[] = [];
  renderElement("wizard-school-fire", effects);
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    await user.click(screen.getByRole("button", { name: "Use Burning Flame" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.match(screen.getByLabelText("Use Burning Flame result").textContent ?? "", /11d8 \+ 4 fire damage.*= 59.*Reflex save.*failure.*Burning Flame applied until ended/);
  assert.equal(effects[0]?.name, "Burning Flame");
  assert.equal(effects[0]?.roundsRemaining, 999);
  assert.match(effects[0]?.description ?? "", /3d6 fire damage/);
});

test("Icy Tomb applies stagger and the level-scaled rime condition", async () => {
  const user = userEvent.setup();
  const effects: ActiveEffect[] = [];
  renderElement("wizard-school-water", effects);
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    await user.click(screen.getByRole("button", { name: "Use Icy Tomb" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.deepEqual(effects.map((effect) => effect.name), ["Ice Missile staggered", "Icy Tomb"]);
  assert.equal(effects[1]?.roundsRemaining, 200);
  assert.match(effects[1]?.description ?? "", /Strength check DC 14/);
  assert.match(effects[1]?.description ?? "", /1 Dexterity damage/);
  assert.match(screen.getByRole("region", { name: "Water elemental movement" }).textContent ?? "", /Swim 60 feet/);
});
