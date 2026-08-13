import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";

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
    assert.equal(screen.getByLabelText("Use Channel Energy result").textContent, "Harm undead: 1 + 1 = 2.");
  } finally {
    Math.random = originalRandom;
  }
});
