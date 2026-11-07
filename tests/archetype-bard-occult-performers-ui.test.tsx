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

test("Fortune-Teller resolves its d100 table and exposes hourly refresh", async () => {
  await selectBard("bard-fortune-teller", 20);
  assert.ok(screen.getByLabelText("Bard Oracular reading remaining"));
  assert.match(screen.getByText("Refreshes after one hour, not on Refresh day.").textContent ?? "", /one hour/);
  const mode = screen.getByLabelText("Read Oracular Performance mode") as HTMLSelectElement;
  assert.equal(mode.value, "ally");
  const previousRandom = Math.random;
  Math.random = () => 0;
  try {
    fireEvent.click(screen.getByRole("button", { name: "Read Oracular Performance" }));
  } finally {
    Math.random = previousRandom;
  }
  assert.match(screen.getByLabelText("Read Oracular Performance result").textContent ?? "", /Woe for ally/);
});

test("Hoaxer presents seven unique hex choices and level-12 major hexes", async () => {
  const user = await selectBard("bard-hoaxer", 12);
  const first = screen.getByLabelText("Bad Deal Hex 1 level 1") as HTMLSelectElement;
  const second = screen.getByLabelText("Bad Deal Hex 2 level 3") as HTMLSelectElement;
  const fifth = screen.getByLabelText("Bad Deal Hex 5 level 12") as HTMLSelectElement;
  assert.equal(Array.from(first.options).some((option) => /Ice Tomb/.test(option.textContent ?? "")), false);
  assert.equal(Array.from(fifth.options).some((option) => /Ice Tomb/.test(option.textContent ?? "")), true);
  await user.selectOptions(first, first.options[1].value);
  assert.equal(Array.from(second.options).some((option) => option.value === first.value), false);
  assert.ok(screen.getByRole("button", { name: "Use Curse Breaker" }));
});

test("Dirge Bard and Mute Musician expose their complete spell-choice progressions", async () => {
  await selectBard("bard-dirge-bard", 18);
  assert.ok(screen.getByLabelText("Secrets of the Grave 1 level 2"));
  assert.ok(screen.getByLabelText("Secrets of the Grave 5 level 18"));
  assert.ok(screen.getByRole("button", { name: "Begin Dance of the Dead" }));
  cleanup();
  localStorage.clear();

  await selectBard("bard-mute-musician", 18);
  assert.ok(screen.getByLabelText("Insight Spell 1 level 2"));
  assert.ok(screen.getByLabelText("Insight Spell 10 level 18"));
  assert.ok(screen.getByRole("button", { name: "Use Song of the Conjunction" }));
});
