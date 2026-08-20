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

test("ki-powered spell equivalents enforce prerequisites and track their duration", async () => {
  const monk = data.classes.find((item) => item.id === "monk");
  const grayDisciple = archetypes.find((item) => item.id === "monk-gray-disciple");
  const applied = applyArchetype(monk, grayDisciple, data.classes, data.spells);
  const spent: number[] = [];
  const effects: ActiveEffect[] = [];
  render(<ClassFeatures
    level={4}
    className={applied.name}
    features={featuresThroughLevel(applied, 4)}
    classLevels={{ monk: 4 }}
    dailyResources={[{ id: "kiPool", label: "Ki Pool", unit: "point", maximum: 3, used: 0, onUsedChange: (used) => spent.push(used) }]}
    onAddEffect={(effect) => effects.push(effect)}
  />);

  const user = userEvent.setup();
  const cast = screen.getByRole("button", { name: "Cast invisibility" }) as HTMLButtonElement;
  assert.equal(cast.disabled, true);
  await user.click(screen.getByLabelText("Cast invisibility Has invisibility as a spell-like ability"));
  await user.click(cast);
  assert.deepEqual(spent, [1]);
  assert.equal(effects[0].name, "invisibility");
  assert.equal(effects[0].target, "self");
  assert.equal(effects[0].roundsRemaining, 1);
  assert.match(screen.getByLabelText("Cast invisibility result").textContent ?? "", /Active for 1 round/i);
});

test("variable spell-equivalent costs spend the selected number of ki points", async () => {
  const monk = data.classes.find((item) => item.id === "monk");
  const elementalMonk = archetypes.find((item) => item.id === "monk-elemental-monk");
  const applied = applyArchetype(monk, elementalMonk, data.classes, data.spells);
  const spent: number[] = [];
  render(<ClassFeatures
    level={14}
    className={applied.name}
    features={featuresThroughLevel(applied, 14)}
    classLevels={{ monk: 14 }}
    dailyResources={[{ id: "kiPool", label: "Ki Pool", unit: "point", maximum: 10, used: 0, onUsedChange: (used) => spent.push(used) }]}
  />);

  const user = userEvent.setup();
  const cost = screen.getByLabelText("Cast plane shift ki points (including additional creatures)");
  await user.clear(cost);
  await user.type(cost, "4");
  await user.click(screen.getByRole("button", { name: "Cast plane shift" }));
  assert.deepEqual(spent, [4]);
  assert.equal(screen.getByLabelText("Cast plane shift result").textContent, "plane shift cast as a spell-like ability.");
});

test("reactive spell equivalents require their trigger and spend the formula cost", async () => {
  const monk = data.classes.find((item) => item.id === "monk");
  const flowingMonk = archetypes.find((item) => item.id === "monk-flowing-monk");
  const applied = applyArchetype(monk, flowingMonk, data.classes, data.spells);
  const spent: number[] = [];
  render(<ClassFeatures
    level={15}
    className={applied.name}
    features={featuresThroughLevel(applied, 15)}
    classLevels={{ monk: 15 }}
    dailyResources={[{ id: "kiPool", label: "Ki Pool", unit: "point", maximum: 5, used: 0, onUsedChange: (used) => spent.push(used) }]}
  />);

  const user = userEvent.setup();
  const useVolley = screen.getByRole("button", { name: "Use Volley Spell (spell turning)" }) as HTMLButtonElement;
  assert.equal(useVolley.disabled, true);
  await user.click(screen.getByRole("checkbox", { name: /trigger occurred/i }));
  const cost = screen.getByLabelText("Use Volley Spell (spell turning) ki points (half the triggering spell level)");
  await user.clear(cost);
  await user.type(cost, "3");
  await user.click(useVolley);
  assert.deepEqual(spent, [3]);
  assert.equal(screen.getByLabelText("Use Volley Spell (spell turning) result").textContent, "spell turning activated as a spell-equivalent effect.");
});
