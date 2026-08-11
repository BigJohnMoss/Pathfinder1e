import assert from "node:assert/strict";
import test from "node:test";
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
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("Ravener Hunter exposes good Cleric spells and hides prohibited descriptors", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "inquisitor");
  await user.selectOptions(screen.getByLabelText("Human +2"), "wisdom");
  await user.selectOptions(screen.getByLabelText("Archetype"), "inquisitor-ravener-hunter");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "6" } });
  await user.click(screen.getByRole("tab", { name: "Spells" }));

  const search = screen.getByPlaceholderText("Name or effect");
  await user.type(search, "Celestial Healing");
  assert.ok(screen.getByText("Celestial Healing"));
  await user.clear(search);
  await user.type(search, "Interrogation");
  assert.equal(screen.queryByText("Interrogation"), null);
});
