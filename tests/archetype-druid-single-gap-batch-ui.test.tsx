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

test("Mooncaller displays both exact conditional save rules", async () => {
  await selectDruid("druid-mooncaller", 20);
  assert.ok(screen.getByText(/confusion, daze, feeblemind, and insanity/i));
  assert.ok(screen.getByText(/shapechanger subtype/i));
});

test("Draconic Druid exposes all three usable Dragon Shape actions", async () => {
  await selectDruid("druid-draconic-druid", 20);
  assert.ok(screen.getByRole("button", { name: "Assume dragon-scaled shape" }));
  assert.ok(screen.getByRole("button", { name: "Assume Medium dragon shape" }));
  assert.ok(screen.getByRole("button", { name: "Assume Large dragon shape" }));
});
