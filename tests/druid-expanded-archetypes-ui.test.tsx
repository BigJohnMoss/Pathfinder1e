import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

for (const [archetypeId, archetypeName, featureNames] of [
  ["druid-aquatic", "Aquatic Druid", ["Aquatic Adaptation", "Natural Swimmer", "Resist Ocean's Fury", "Seaborn", "Deep Diver"]],
  ["druid-arctic", "Arctic Druid", ["Arctic Native", "Icewalking", "Arctic Endurance", "Snowcaster", "Flurry Form"]]
] as const) test(`${archetypeName} delays Wild Shape and exposes its full terrain progression`, async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector(`option[value='${archetypeId}']`));
  await user.selectOptions(archetype, archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "4" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal(screen.queryByLabelText("Wild Shape remaining"), null);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  for (const name of featureNames) assert.ok(screen.getByText(name));
  assert.equal(screen.getByLabelText("Wild Shape remaining").textContent, "8/8 use remaining");
  assert.equal(screen.queryByText("A Thousand Faces"), null);
});
