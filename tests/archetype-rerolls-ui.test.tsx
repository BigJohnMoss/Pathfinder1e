import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { JSDOM } from "jsdom";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";
import type { CharacterArchetype, CharacterClass } from "../packages/types/src/index.js";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let ClassFeatures: typeof import("../apps/web/app/class-features").ClassFeatures;

const bard = JSON.parse(readFileSync(new URL("../packages/data/src/classes/bard.json", import.meta.url), "utf8")) as CharacterClass;
const solacer = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/bard-solacer.json", import.meta.url), "utf8")) as CharacterArchetype;
const rogue = JSON.parse(readFileSync(new URL("../packages/data/src/classes/rogue.json", import.meta.url), "utf8")) as CharacterClass;
const phantomThief = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/rogue-phantom-thief.json", import.meta.url), "utf8")) as CharacterArchetype;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
});

test.afterEach(() => cleanup());

test("Creative Treatment spends a use and keeps the better result", async () => {
  const spent: number[] = [];
  const applied = applyArchetype(bard, solacer);
  render(<ClassFeatures
    level={6}
    className="Bard (Solacer)"
    features={featuresThroughLevel(applied, 6)}
    classLevels={{ bard: 6 }}
    dailyResources={[{ id: "creativeTreatment", label: "Creative Treatment", unit: "use", maximum: 2, used: 0, onUsedChange: (used) => spent.push(used) }]}
  />);
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("Reroll Heal check original roll total"));
  await user.type(screen.getByLabelText("Reroll Heal check original roll total"), "25");
  await user.click(screen.getByRole("button", { name: "Reroll Heal check" }));
  assert.deepEqual(spent, [1]);
  assert.match(screen.getByLabelText("Reroll Heal check result").textContent ?? "", /Use 25/);
});

test("unbounded rerolls remain usable without a daily resource", async () => {
  const applied = applyArchetype(rogue, phantomThief);
  render(<ClassFeatures level={20} className="Rogue (Phantom Thief)" features={featuresThroughLevel(applied, 20)} classLevels={{ rogue: 20 }} />);
  const button = screen.getByRole("button", { name: "Reroll skill check" });
  assert.equal(button.hasAttribute("disabled"), false);
  await userEvent.setup().click(button);
  assert.match(screen.getByLabelText("Reroll skill check result").textContent ?? "", /must keep this result/i);
});
