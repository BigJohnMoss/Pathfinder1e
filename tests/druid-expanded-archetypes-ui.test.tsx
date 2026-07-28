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

test("Cave Druid exposes subterranean features and its restricted domains", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  await user.selectOptions(screen.getByLabelText("Archetype"), "druid-cave");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of ["Cavesense", "Tunnelrunner", "Lightfoot", "Resist Subterranean Corruption"]) assert.ok(screen.getByText(name));
  const domain = screen.getByLabelText("Nature Domain");
  assert.ok(domain.querySelector("option[value='domain-darkness']"));
  assert.equal(domain.querySelector("option[value='domain-air']"), null);
  assert.equal(domain.querySelector("option[value='domain-weather']"), null);
  assert.equal(screen.getByLabelText("Wild Shape remaining").textContent, "8/8 use remaining");
});

for (const [archetypeId, archetypeName, featureNames] of [
  ["druid-mountain", "Mountain Druid", ["Mountaineer", "Sure-Footed", "Spire Walker", "Mountain Stance", "Mountain Stone"]],
  ["druid-plains", "Plains Druid", ["Plains Traveler", "Run Like the Wind", "Savanna Ambush", "Canny Charger", "Evasion"]],
  ["druid-swamp", "Swamp Druid", ["Marshwight", "Swamp Strider", "Pond Scum", "Slippery"]]
] as const) test(`${archetypeName} is selectable with its level-20 terrain features`, async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of featureNames) assert.ok(screen.getByText(name));
  assert.equal(screen.getByLabelText("Wild Shape remaining").textContent, "8/8 use remaining");
  assert.equal(screen.queryByText("A Thousand Faces"), null);
});

for (const [archetypeId, archetypeName, featureNames] of [
  ["druid-desert", "Desert Druid", ["Desert Native", "Sandwalker", "Desert Endurance", "Shaded Vision", "Dunemeld"]],
  ["druid-jungle", "Jungle Druid", ["Jungle Guardian", "Woodland Stride", "Torrid Endurance", "Verdant Sentinel"]]
] as const) test(`${archetypeName} exposes its complete terrain progression`, async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  const archetype = screen.getByLabelText("Archetype");
  await user.selectOptions(archetype, archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of featureNames) assert.ok(screen.getByText(name));
  assert.equal(screen.getByLabelText("Wild Shape remaining").textContent, "8/8 use remaining");
  assert.equal(screen.queryByText("A Thousand Faces"), null);
});
