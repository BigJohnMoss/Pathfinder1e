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

const alchemist = JSON.parse(readFileSync(new URL("../packages/data/src/classes/alchemist.json", import.meta.url), "utf8")) as CharacterClass;
const torchbearer = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-blazing-torchbearer.json", import.meta.url), "utf8")) as CharacterArchetype;
const druid = JSON.parse(readFileSync(new URL("../packages/data/src/classes/druid.json", import.meta.url), "utf8")) as CharacterClass;
const greenFaith = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/druid-green-faith-initiate.json", import.meta.url), "utf8")) as CharacterArchetype;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
});

test.afterEach(() => cleanup());

test("at-will spell-like abilities remain clickable without a resource", async () => {
  const applied = applyArchetype(alchemist, torchbearer);
  render(<ClassFeatures level={1} className={applied.name} features={featuresThroughLevel(applied, 1)} classLevels={{ alchemist: 1 }} />);
  const button = screen.getByRole("button", { name: "Cast spark" });
  assert.equal(button.hasAttribute("disabled"), false);
  await userEvent.setup().click(button);
  assert.equal(screen.getByLabelText("Cast spark result").textContent, "spark cast as a spell-like ability.");
});

test("limited spell-like abilities spend their matching tracked resource", async () => {
  const spent: number[] = [];
  const applied = applyArchetype(druid, greenFaith);
  const action = applied.features.find((feature) => feature.id === "druid-green-faith-initiate-zephyr-message-sp-6")!.resourceActions![0];
  render(<ClassFeatures
    level={6}
    className={applied.name}
    features={featuresThroughLevel(applied, 6)}
    classLevels={{ druid: 6 }}
    dailyResources={[{ id: action.resourceId, label: "Zephyr Message", unit: "use", maximum: 1, used: 0, onUsedChange: (used) => spent.push(used) }]}
  />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Cast whispering wind" }));
  assert.deepEqual(spent, [1]);
  assert.equal(screen.getByLabelText("Cast whispering wind result").textContent, "whispering wind cast as a spell-like ability.");
});
