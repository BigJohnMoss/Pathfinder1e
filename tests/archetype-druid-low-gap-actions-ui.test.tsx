import test, { before, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, fireEvent, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

afterEach(() => { cleanup(); localStorage.clear(); });

const selectDruid = async (archetypeId: string, level: number) => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: String(level) } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  return user;
};

test("Feral Shifter exposes both focus activations at level 9", async () => {
  await selectDruid("druid-feral-shifter", 9);
  assert.ok(screen.getByRole("button", { name: "Activate Animal Focus" }));
  assert.ok(screen.getByRole("button", { name: "Add Second Animal Focus" }));
});

test("Season Sage exposes touch, veil, and swift seasonal controls", async () => {
  await selectDruid("druid-season-sage", 20);
  assert.ok(screen.getByRole("button", { name: "Use Autumn Rot" }));
  assert.ok(screen.getByRole("button", { name: "Create Season's Veil" }));
  assert.ok(screen.getByRole("button", { name: "Use Active Veil Effect" }));
});

test("Urushiol exposes every delivery tier and alternate poison damage", async () => {
  await selectDruid("druid-urushiol", 14);
  assert.ok(screen.getByRole("button", { name: "Apply Injury Venom" }));
  assert.ok(screen.getByRole("button", { name: "Release Inhaled Venom" }));
  assert.ok(screen.getByRole("button", { name: "Release Constitution Inhaled Venom" }));
});
