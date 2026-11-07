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

const selectBard = async (archetypeId: string, level: number) => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: String(level) } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  return user;
};

test("Archaeologist replaces the standard performance pool with its own luck pool", async () => {
  await selectBard("bard-archaeologist", 20);
  assert.equal(screen.queryByLabelText("Performance rounds remaining"), null);
  assert.ok(screen.getByLabelText(/Archaeologist's Luck remaining/));
  assert.ok(screen.getByRole("button", { name: "Use Archaeologist's Luck" }));
  assert.ok(screen.getByLabelText("Rogue Talent 1 level 4"));
  assert.ok(screen.getByLabelText("Rogue Talent 5 level 20"));
});

test("Negotiator switches from lesser to greater Binding Contract at level 18", async () => {
  await selectBard("bard-negotiator", 18);
  assert.equal(screen.queryByRole("button", { name: "Complete Binding Contract" }), null);
  const greater = screen.getByRole("button", { name: "Complete Greater Binding Contract" }) as HTMLButtonElement;
  assert.equal(greater.disabled, true);
  fireEvent.click(screen.getByLabelText(/Complete Greater Binding Contract The target saw/));
  assert.equal(greater.disabled, false);
  assert.ok(screen.getByLabelText("Rogue Talent 5 level 18"));
});

test("Daredevil exposes unique maneuver choices and gates movement AC", async () => {
  const user = await selectBard("bard-daredevil", 18);
  const first = screen.getByLabelText("Canny Foe 1 level 2") as HTMLSelectElement;
  const second = screen.getByLabelText("Canny Foe 2 level 6") as HTMLSelectElement;
  await user.selectOptions(first, first.options[1].value);
  assert.equal(Array.from(second.options).some((option) => option.value === first.value), false);
  const movement = screen.getByRole("button", { name: "Apply Derring-do Movement AC" }) as HTMLButtonElement;
  assert.equal(movement.disabled, true);
  fireEvent.click(screen.getByLabelText(/Apply Derring-do Movement AC The ally moved/));
  assert.equal(movement.disabled, false);
});
