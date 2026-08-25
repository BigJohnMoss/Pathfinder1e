import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("Spire Defender records and displays its qualifying exotic weapon proficiency", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "magus");
  await user.selectOptions(screen.getByLabelText("Archetype"), "magus-spire-defender");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("Weapon Proficiency level 1"), "spire-defender-qualifying-exotic-weapon");
  await user.type(screen.getByLabelText("Weapon Proficiency Exotic weapon"), "Whip");
  await user.click(screen.getByRole("tab", { name: "Storage" }));
  const rules = screen.getByRole("region", { name: "Archetype weapon rules" });
  assert.match(rules.textContent ?? "", /All light simple weapons/);
  assert.match(rules.textContent ?? "", /Whip.*must be an exotic light or one-handed melee weapon/);
});

test("Hellcat and Softstrike weapon exceptions are readable in equipment management", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "monk");
  await user.selectOptions(screen.getByLabelText("Alignment"), "lawful-neutral");
  const selector = screen.getByLabelText("Archetype");
  await user.selectOptions(selector, "monk-hellcat");
  await user.click(screen.getByRole("tab", { name: "Storage" }));
  let rules = screen.getByRole("region", { name: "Archetype weapon rules" });
  assert.match(rules.textContent ?? "", /Flurry of Blows weapon.*Light mace/);
  await user.selectOptions(selector, "monk-softstrike-monk");
  rules = screen.getByRole("region", { name: "Archetype weapon rules" });
  assert.match(rules.textContent ?? "", /Any weapon with the monk special quality/);
  assert.match(rules.textContent ?? "", /only when dealing bludgeoning damage/);
});
