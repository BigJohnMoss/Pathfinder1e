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
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("generated archetype bonuses appear in the live skill totals", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "10" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "bard-court-fool");
  await user.click(screen.getByRole("tab", { name: "Skills" }));

  const acrobatics = screen.getByText("Acrobatics").closest("label");
  assert.equal(acrobatics?.querySelector(".skill-total strong")?.textContent, "+5 class");
});

test("inferred archetype bonuses appear in the live skill totals without an overlay", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "9" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "bard-daredevil");
  await user.click(screen.getByRole("tab", { name: "Skills" }));

  for (const [skill, total] of [["Acrobatics", "+4 class"], ["Bluff", "+4 class"], ["Climb", "+5 class"], ["Escape Artist", "+4 class"]])
    assert.equal(screen.getByText(skill).closest("label")?.querySelector(".skill-total strong")?.textContent, total, `${skill} receives half-level bonus`);
});

test("published conditional skill transitions appear at the correct archetype level", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "17" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "bard-chelish-diva");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const modifiers = screen.getByText("Conditional modifiers").closest("section")?.textContent ?? "";
  assert.match(modifiers, /\+5 Diplomacy checks/);
  assert.match(modifiers, /\+5 Intimidate checks/);
  assert.doesNotMatch(modifiers, /Bluff checks/);
});
