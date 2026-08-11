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

const monk = JSON.parse(readFileSync(new URL("../packages/data/src/classes/monk.json", import.meta.url), "utf8")) as CharacterClass;
const sohei = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/monk-sohei.json", import.meta.url), "utf8")) as CharacterArchetype;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
});

test.afterEach(() => cleanup());

test("timed effect activation spends ki and applies every scaled target", async () => {
  const spent: number[] = [];
  const effects: ActiveEffect[] = [];
  const applied = applyArchetype(monk, sohei);
  render(<ClassFeatures
    level={20}
    className={applied.name}
    features={featuresThroughLevel(applied, 20)}
    classLevels={{ monk: 20 }}
    dailyResources={[{ id: "kiPool", label: "Monk Ki Pool", unit: "point", maximum: 15, used: 0, onUsedChange: (used) => spent.push(used) }]}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Activate Ki Weapon" }));
  assert.deepEqual(spent, [1]);
  assert.deepEqual(effects.map(({ target, bonus, roundsRemaining }) => ({ target, bonus, roundsRemaining })), [
    { target: "attackRolls", bonus: 5, roundsRemaining: 1 },
    { target: "damageRolls", bonus: 5, roundsRemaining: 1 },
  ]);
  assert.match(screen.getByLabelText("Activate Ki Weapon result").textContent ?? "", /Active for 1 round/);
});
