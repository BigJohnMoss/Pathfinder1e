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

const selectBard = async (archetypeId: string, level = 20, ancestryId = "human") => {
  const user = userEvent.setup();
  render(<Home />);
  if (ancestryId !== "human") await user.selectOptions(screen.getByLabelText("Ancestry"), ancestryId);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: String(level) } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  return user;
};

test("Arrowsong dynamically creates initial choices and keeps selected access spells in the normal known-spell budget", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  await user.selectOptions(screen.getByLabelText("Archetype"), "bard-arrowsong-minstrel");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "4" } });
  fireEvent.change(screen.getByLabelText("Charisma base score"), { target: { value: "18" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByLabelText("Arcane Archery 1 level 1"));
  assert.ok(screen.getByLabelText("Arcane Archery 4 level 1"));
  assert.equal(screen.queryByLabelText("Arcane Archery 5 level 1"), null);
  await user.selectOptions(screen.getByLabelText("Arcane Archery 1 level 1"), "arrowsong-spell-acid-arrow");
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "2");
  assert.ok((await screen.findAllByText("Acid Arrow")).length > 0);
  assert.equal(screen.queryByText(/Feature-granted.*Acid Arrow/i), null);
});

test("ancestry-locked Bards become selectable and expose their complete workflows", async () => {
  await selectBard("bard-dragon-herald", 20, "kobold");
  assert.ok(screen.getByLabelText("Dragon Patron (Ex) level 1"));
  assert.ok(screen.getByRole("button", { name: "Rebuke Foes" }));
  assert.ok(screen.getByRole("button", { name: "Retreat to Lair" }));
  cleanup(); localStorage.clear();
  await selectBard("bard-fey-courtier", 20, "gathlain");
  assert.ok(screen.getByRole("button", { name: "Use Scorn of the Wilds" }));
  assert.ok(screen.getByRole("button", { name: "Begin Stone Dance" }));
});

test("Duettist and Filidh render all resource-backed controls", async () => {
  await selectBard("bard-duettist");
  assert.ok(screen.getByRole("button", { name: "Have familiar perform" }));
  assert.ok(screen.getByRole("button", { name: "Harmonize one performance" }));
  assert.ok(screen.getByRole("button", { name: "Begin two-performance symphony" }));
  cleanup(); localStorage.clear();
  await selectBard("bard-filidh");
  assert.ok(screen.getByRole("button", { name: "Convert a spell slot to performance" }));
  assert.ok(screen.getByRole("button", { name: "Begin Echoes of Nature's Song" }));
  assert.ok(screen.getByRole("button", { name: "Begin Song of the Cycle" }));
});
