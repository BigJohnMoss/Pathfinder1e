import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let waitFor: typeof import("@testing-library/react").waitFor;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, fireEvent, waitFor } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

const optionSelect = (name: string) => {
  const select = screen.getAllByText(name).at(-1)!.closest("label")?.querySelector("select");
  assert.ok(select, `expected ${name} select`);
  return select;
};

test("Protean and Serpentine expose details, granted spells, switching, and persistence", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "sorcerer");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-protean");
  assert.ok(screen.getByText("Protoplasm"));
  assert.ok(screen.getByText("Avatar of Chaos"));
  assert.ok(screen.getByText(/Shapechange/));
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await user.type(screen.getByLabelText("Search spells"), "Entropic Shield");
  assert.equal(screen.getByLabelText("Entropic Shield known").textContent, "Bloodline");

  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-serpentine");
  assert.ok(screen.getByText("Serpent's Fang"));
  assert.ok(screen.getByText("Scaled Soul"));
  assert.ok(screen.getByText(/Dominate Monster/));
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await user.clear(screen.getByLabelText("Search spells"));
  await user.type(screen.getByLabelText("Search spells"), "Hypnotism");
  assert.equal(screen.getByLabelText("Hypnotism known").textContent, "Bloodline");
  await user.clear(screen.getByLabelText("Search spells"));
  await user.type(screen.getByLabelText("Search spells"), "Entropic Shield");
  assert.ok(screen.getByText("No spells match this search."));

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "sorcerer"));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal(optionSelect("Bloodline").value, "sorcerer-bloodline-serpentine");
});
