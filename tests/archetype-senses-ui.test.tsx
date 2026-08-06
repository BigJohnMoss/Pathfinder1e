import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let within: typeof import("@testing-library/react").within;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup, fireEvent, within } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("permanent inferred archetype senses appear in live character statistics", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "wizard-shadowcaster");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const senses = screen.getByRole("heading", { name: "Special senses" }).closest("section");
  assert.ok(senses);
  assert.ok(within(senses).getByText("Darkvision 60 ft."));
  assert.ok(within(senses).getByText("Shadowcaster"));
});

test("conditional inferred senses retain their activation requirement", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "brawler");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "13" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "brawler-mutagenic-mauler");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const senses = screen.getByRole("heading", { name: "Special senses" }).closest("section");
  assert.ok(senses);
  assert.ok(within(senses).getByText("Low-light vision"));
  assert.ok(within(senses).getByText("Darkvision 30 ft."));
  assert.ok(within(senses).getByText("Scent 30 ft."));
  assert.equal(within(senses).getAllByText(/when using her mutagen .* Mutagenic Mauler/i).length, 3);
});
