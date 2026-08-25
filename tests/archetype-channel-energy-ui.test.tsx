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

test("channel actions select a mode, roll scaled dice, show the DC, and spend the pool", async () => {
  const shaman = data.classes.find((item) => item.id === "shaman");
  const witchDoctor = archetypes.find((item) => item.id === "shaman-witch-doctor");
  const applied = applyArchetype(shaman, witchDoctor, data.classes, data.spells);
  const spent: number[] = [];
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    render(<ClassFeatures
      level={6}
      className={applied.name}
      features={featuresThroughLevel(applied, 6)}
      classLevels={{ shaman: 6 }}
      abilityModifiers={{ charisma: 3 }}
      dailyResources={[{ id: "archetype-shaman-witch-doctor-channel-energy-su-4", label: "Channel Energy", unit: "use", maximum: 6, used: 0, onUsedChange: (used) => spent.push(used) }]}
    />);
    assert.equal(screen.getByLabelText("Use Channel Energy roll profile").textContent, "2d6");
    assert.equal(screen.getByLabelText("Use Channel Energy save DC").textContent, "Will save DC 14");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "Use Channel Energy mode" }), "harm-undead");
    await user.click(screen.getByRole("button", { name: "Use Channel Energy" }));
    assert.deepEqual(spent, [1]);
    assert.match(screen.getByLabelText("Use Channel Energy result").textContent ?? "", /Harm undead: 1 \+ 1 = 2 damage.*Will save: 1.*failure; 2 damage/i);
  } finally {
    Math.random = originalRandom;
  }
});

test("Channel Evil resolves damage, its negating save, and the low-Hit-Dice rider", async () => {
  const cleric = data.classes.find((item) => item.id === "cleric");
  const fiendishVessel = archetypes.find((item) => item.id === "cleric-fiendish-vessel");
  const applied = applyArchetype(cleric, fiendishVessel, data.classes, data.spells);
  const spent: number[] = [];
  const effects: ActiveEffect[] = [];
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    render(<ClassFeatures
      level={10}
      className={applied.name}
      features={featuresThroughLevel(applied, 10)}
      classLevels={{ cleric: 10 }}
      abilityModifiers={{ charisma: 3 }}
      dailyResources={[{ id: "archetype-cleric-fiendish-vessel-channel-evil-su-1", label: "Channel Evil", unit: "use", maximum: 6, used: 0, onUsedChange: (used) => spent.push(used) }]}
      onAddEffect={(effect) => effects.push(effect)}
    />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "Use Channel Evil mode" }), "harm-good");
    assert.match(screen.getByLabelText("Use Channel Evil save DC").textContent ?? "", /Will save DC 18/);
    await user.clear(screen.getByLabelText("Use Channel Evil target Hit Dice"));
    await user.type(screen.getByLabelText("Use Channel Evil target Hit Dice"), "4");
    await user.click(screen.getByRole("button", { name: "Use Channel Evil" }));
    assert.deepEqual(spent, [1]);
    assert.equal(effects[0].name, "Nauseated, then sickened by Channel Evil");
    assert.equal(effects[0].roundsRemaining, 2);
    assert.match(screen.getByLabelText("Use Channel Evil result").textContent ?? "", /5 damage.*Will save: 1.*failure; 5 damage.*Nauseated, then sickened/i);
  } finally {
    Math.random = originalRandom;
  }
});

test("Channel Evil healing mode does not request an enemy save", async () => {
  const cleric = data.classes.find((item) => item.id === "cleric");
  const fiendishVessel = archetypes.find((item) => item.id === "cleric-fiendish-vessel");
  const applied = applyArchetype(cleric, fiendishVessel, data.classes, data.spells);
  render(<ClassFeatures
    level={5}
    className={applied.name}
    features={featuresThroughLevel(applied, 5)}
    classLevels={{ cleric: 5 }}
    abilityModifiers={{ charisma: 2 }}
    dailyResources={[{ id: "archetype-cleric-fiendish-vessel-channel-evil-su-1", label: "Channel Evil", unit: "use", maximum: 5, used: 0, onUsedChange: () => {} }]}
  />);
  assert.equal(screen.queryByLabelText("Use Channel Evil target will modifier"), null);
  assert.equal(screen.queryByLabelText("Use Channel Evil target Hit Dice"), null);
  assert.equal(screen.getAllByText("Activation: standard action.").length, 1);
});

test("Hex Channeler requires its alignment polarity and counts only traded hexes", async () => {
  const witch = data.classes.find((item) => item.id === "witch");
  const hexChanneler = archetypes.find((item) => item.id === "witch-hex-channeler");
  const applied = applyArchetype(witch, hexChanneler, data.classes, data.spells);
  const common = {
    level: 10,
    className: applied.name,
    features: featuresThroughLevel(applied, 10),
    classLevels: { witch: 10 },
    abilityModifiers: { charisma: 3 },
    dailyResources: [{ id: "archetype-witch-hex-channeler-channel-energy-su-2", label: "Channel Energy", unit: "use", maximum: 6, used: 0, onUsedChange: () => {} }],
  };
  const { rerender } = render(<ClassFeatures {...common} />);
  assert.equal(screen.getByRole("button", { name: "Use Channel Energy" }).hasAttribute("disabled"), true);

  const selectedOptionIds = ["hex-channeler-positive", "hex-channeler-channel-die-4", "hex-channeler-channel-die-8", "hex-channeler-channel-die-10"];
  rerender(<ClassFeatures {...common} selectedOptionIds={selectedOptionIds} />);
  assert.equal(screen.getByLabelText("Use Channel Energy roll profile").textContent, "4d6");
  const modes = screen.getByRole("combobox", { name: "Use Channel Energy mode" }) as HTMLSelectElement;
  assert.deepEqual(Array.from(modes.options).map((option) => option.value), ["positive-heal", "positive-harm"]);
  assert.equal(screen.getByRole("button", { name: "Use Channel Energy" }).hasAttribute("disabled"), false);
});
