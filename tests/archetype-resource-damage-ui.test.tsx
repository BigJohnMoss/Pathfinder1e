import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";
import type { ActiveEffect } from "../packages/types/src/index.js";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let ClassFeatures: typeof import("../apps/web/app/class-features").ClassFeatures;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
});

test.afterEach(() => cleanup());

test("resource damage rolls apply selected damage types, saves, and pool costs", async () => {
  const skald = data.classes.find((item) => item.id === "skald");
  const wyrmSinger = archetypes.find((item) => item.id === "skald-wyrm-singer");
  const applied = applyArchetype(skald, wyrmSinger, data.classes, data.spells);
  const spent: number[] = [];
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    render(<ClassFeatures
      level={12}
      className={applied.name}
      features={featuresThroughLevel(applied, 12)}
      classLevels={{ skald: 12 }}
      abilityModifiers={{ charisma: 3 }}
      dailyResources={[{ id: "archetype-skald-wyrm-singer-breath-weapon-su-12", label: "Breath Weapon", unit: "use", maximum: 1, used: 0, onUsedChange: (used) => spent.push(used) }]}
    />);

    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "Use Breath Weapon mode" }), "fire");
    await user.selectOptions(screen.getByRole("combobox", { name: "Use Breath Weapon recipient" }), "ally");
    await user.click(screen.getByLabelText("Use Breath Weapon Recipient is affected by Draconic Rage"));
    await user.clear(screen.getByLabelText("Use Breath Weapon target reflex modifier"));
    await user.type(screen.getByLabelText("Use Breath Weapon target reflex modifier"), "99");
    await user.click(screen.getByRole("button", { name: "Use Breath Weapon" }));
    assert.deepEqual(spent, [1]);
    assert.match(screen.getByLabelText("Use Breath Weapon result").textContent ?? "", /6d6 fire damage: 1 \+ 1 \+ 1 \+ 1 \+ 1 \+ 1 = 6/);
    assert.match(screen.getByLabelText("Use Breath Weapon result").textContent ?? "", /save halves to 3/);
    assert.match(screen.getByLabelText("Use Breath Weapon result").textContent ?? "", /Recipient Ally/);
  } finally {
    Math.random = originalRandom;
  }
});

test("Void Channeler applies confusion only to a low-Hit-Dice failed save", async () => {
  const baseClass = data.classes.find((item) => item.id === "medium");
  const archetype = archetypes.find((item) => item.id === "medium-voice-of-the-void");
  const applied = applyArchetype(baseClass, archetype, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  const spent: number[] = [];
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    render(<ClassFeatures level={7} className={applied.name} features={featuresThroughLevel(applied, 7)} classLevels={{ medium: 7 }} abilityModifiers={{ charisma: 3 }} dailyResources={[{ id: "archetype-medium-voice-of-the-void-void-channeler-su-3", label: "Void Channeler", unit: "use", maximum: 3, used: 0, onUsedChange: (used) => spent.push(used) }]} onAddEffect={(effect) => effects.push(effect)} />);
    const user = userEvent.setup();
    assert.equal((screen.getByRole("button", { name: "Use Void Channeler" }) as HTMLButtonElement).disabled, true);
    await user.click(screen.getByLabelText("Use Void Channeler Exclude the acting medium and aberrations"));
    await user.clear(screen.getByLabelText("Use Void Channeler target Hit Dice"));
    await user.type(screen.getByLabelText("Use Void Channeler target Hit Dice"), "3");
    await user.click(screen.getByRole("button", { name: "Use Void Channeler" }));
    assert.deepEqual(spent, [1]);
    assert.equal(effects[0].name, "Confused");
    assert.equal(effects[0].roundsRemaining, 1);
  } finally {
    Math.random = originalRandom;
  }
});

test("Wounding Words rolls its rider save only for a Compelling Voice target", async () => {
  const baseClass = data.classes.find((item) => item.id === "mesmerist");
  const archetype = archetypes.find((item) => item.id === "mesmerist-vox");
  const applied = applyArchetype(baseClass, archetype, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    render(<ClassFeatures level={3} className={applied.name} features={featuresThroughLevel(applied, 3)} classLevels={{ mesmerist: 3 }} abilityModifiers={{ strength: 3, charisma: 3 }} dailyResources={[{ id: "archetype-mesmerist-vox-wounding-words-su-3", label: "Wounding Words", unit: "use", maximum: 6, used: 0, onUsedChange: () => {} }]} onAddEffect={(effect) => effects.push(effect)} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Use Wounding Words Target is affected by Compelling Voice"));
    await user.click(screen.getByRole("button", { name: "Use Wounding Words" }));
    assert.equal(effects[0].name, "Wounding Words penalty");
    assert.equal(effects[0].roundsRemaining, 1);
    assert.match(screen.getByLabelText("Use Wounding Words result").textContent ?? "", /Will save.*failure/i);
  } finally {
    Math.random = originalRandom;
  }
});

test("Demonic Channel applies its lawful-good save penalty and level-nine rider", async () => {
  const baseClass = data.classes.find((item) => item.id === "cleric");
  const archetype = archetypes.find((item) => item.id === "cleric-demonic-apostle");
  const applied = applyArchetype(baseClass, archetype, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  const spent: number[] = [];
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    render(<ClassFeatures level={9} className={applied.name} features={featuresThroughLevel(applied, 9)} classLevels={{ cleric: 9 }} abilityModifiers={{ charisma: 3 }} dailyResources={[{ id: "demonicChannel", label: "Demonic Channel", unit: "use", maximum: 6, used: 0, onUsedChange: (used) => spent.push(used) }]} onAddEffect={(effect) => effects.push(effect)} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Use Demonic Channel Target is lawful or good"));
    await user.click(screen.getByLabelText("Use Demonic Channel Target is lawful good"));
    await user.clear(screen.getByLabelText("Use Demonic Channel target fortitude modifier"));
    await user.type(screen.getByLabelText("Use Demonic Channel target fortitude modifier"), "6");
    await user.click(screen.getByRole("button", { name: "Use Demonic Channel" }));
    assert.deepEqual(spent, [1]);
    assert.equal(effects[0].name, "Sickened by Demonic Channel");
    assert.equal(effects[0].roundsRemaining, 1);
    assert.match(screen.getByLabelText("Use Demonic Channel result").textContent ?? "", /Fortitude save: 1 \+ 4 = 5/);
    assert.equal(screen.getAllByText("Activation: standard action.").length, 2);
  } finally {
    Math.random = originalRandom;
  }
});

test("Demonic Channel tracks its level-five rage effect for chaotic evil allies", async () => {
  const baseClass = data.classes.find((item) => item.id === "cleric");
  const archetype = archetypes.find((item) => item.id === "cleric-demonic-apostle");
  const applied = applyArchetype(baseClass, archetype, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  const spent: number[] = [];
  render(<ClassFeatures level={5} className={applied.name} features={featuresThroughLevel(applied, 5)} classLevels={{ cleric: 5 }} abilityModifiers={{ charisma: 3 }} dailyResources={[{ id: "demonicChannel", label: "Demonic Channel", unit: "use", maximum: 6, used: 0, onUsedChange: (used) => spent.push(used) }]} onAddEffect={(effect) => effects.push(effect)} />);
  const user = userEvent.setup();
  const button = screen.getByRole("button", { name: "Bolster chaotic evil allies" }) as HTMLButtonElement;
  assert.equal(button.disabled, true);
  await user.click(screen.getByLabelText("Bolster chaotic evil allies Chaotic evil allies are in the burst"));
  await user.click(button);
  assert.deepEqual(spent, [1]);
  assert.equal(effects[0].name, "Demonic Channel rage");
  assert.equal(effects[0].target, "allies");
  assert.equal(effects[0].roundsRemaining, 1);
  assert.match(effects[0].description ?? "", /\+2 Strength.*–2 Armor Class/);
});
