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

test("Arcane Duelist is selectable, complete through level 20, and persistent", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-arcane-duelist']"));
  await user.selectOptions(archetype, "bard-arcane-duelist");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  for (const name of ["Arcane Strike", "Rallying Cry", "Bladethirst +1", "Mass Bladethirst", "Greater Penetrating Strike", "Arcane Bond", "Arcane Armor: Heavy"]) {
    assert.ok(screen.getByText(name));
  }
  assert.equal(screen.queryByText("Bardic Knowledge"), null);
  assert.equal(screen.queryByText("Versatile Performance 5"), null);
  assert.ok(screen.getByText("Deadly Performance"));

  await user.click(screen.getByRole("button", { name: "Save" }));
  assert.equal(JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}").archetypeId, "bard-arcane-duelist");
});

test("Archivist switches in its complete scholarly progression", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-archivist']"));
  await user.selectOptions(archetype, "bard-archivist");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  for (const name of ["Naturalist +1", "Lamentable Belaborment", "Pedantic Lecture", "Magic Lore", "Jack of All Trades: Take 10", "Probable Path"]) {
    assert.ok(screen.getByText(name));
  }
  assert.equal(screen.queryByText("Inspire Courage +4"), null);
  assert.equal(screen.queryByText("Versatile Performance 5"), null);
  assert.ok(screen.getByText("Deadly Performance"));
});

test("Court Bard exposes every replacement performance through level 20", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-court-bard']"));
  await user.selectOptions(archetype, "bard-court-bard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  for (const name of ["Satire -1", "Mockery -2", "Glorious Epic", "Scandal", "Heraldic Expertise", "Wide Audience"]) {
    assert.ok(screen.getByText(name));
  }
  assert.equal(screen.queryByText("Inspire Courage +4"), null);
  assert.equal(screen.queryByText("Inspire Competence +6"), null);
  assert.ok(screen.getByText("Deadly Performance"));
});
