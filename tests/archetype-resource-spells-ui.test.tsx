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

test("resource-powered spell buttons spend their existing class resource", async () => {
  const investigator = data.classes.find((item) => item.id === "investigator");
  const profiler = archetypes.find((item) => item.id === "investigator-profiler");
  const applied = applyArchetype(investigator, profiler, data.classes, data.spells);
  const spent: number[] = [];
  render(<ClassFeatures
    level={4}
    className={applied.name}
    features={featuresThroughLevel(applied, 4)}
    classLevels={{ investigator: 4 }}
    dailyResources={[{ id: "inspiration", label: "Inspiration", unit: "point", maximum: 4, used: 0, onUsedChange: (used) => spent.push(used) }]}
  />);

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Cast discern next of kin" }));
  await user.click(screen.getByRole("button", { name: "Cast blood biography" }));
  assert.deepEqual(spent, [1, 2]);
  assert.equal(screen.getByLabelText("Cast blood biography result").textContent, "blood biography cast as a spell-like ability.");
});
