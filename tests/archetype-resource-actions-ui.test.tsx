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
const ectochymist = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-ectochymist.json", import.meta.url), "utf8")) as CharacterArchetype;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
});

test.afterEach(() => cleanup());

test("generic archetype actions spend their calculated resource", async () => {
  const spent = [] as number[];
  const applied = applyArchetype(alchemist, ectochymist);
  render(<ClassFeatures
    level={5}
    className={applied.name}
    features={featuresThroughLevel(applied, 5)}
    classLevels={{ alchemist: 5 }}
    dailyResources={[{ id: "ectoplasmicBlanche", label: "Ectoplasmic Blanche", unit: "use", maximum: 8, used: 0, onUsedChange: (used) => spent.push(used) }]}
  />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Use Ectoplasmic Blanche" }));
  assert.deepEqual(spent, [1]);
  assert.equal(screen.getByLabelText("Use Ectoplasmic Blanche result").textContent, "Ability used.");
});
