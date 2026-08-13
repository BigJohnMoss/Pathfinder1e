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
    await user.clear(screen.getByLabelText("Use Breath Weapon target reflex modifier"));
    await user.type(screen.getByLabelText("Use Breath Weapon target reflex modifier"), "99");
    await user.click(screen.getByRole("button", { name: "Use Breath Weapon" }));
    assert.deepEqual(spent, [1]);
    assert.match(screen.getByLabelText("Use Breath Weapon result").textContent ?? "", /6d6 fire damage: 1 \+ 1 \+ 1 \+ 1 \+ 1 \+ 1 = 6/);
    assert.match(screen.getByLabelText("Use Breath Weapon result").textContent ?? "", /save halves to 3/);
  } finally {
    Math.random = originalRandom;
  }
});
