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

const selectBard = async (archetypeId: string, level = 20) => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: String(level) } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  return user;
};

test("Chronicler renders all planar and Scrivener controls", async () => {
  await selectBard("bard-chronicler-of-worlds");
  assert.ok(screen.getByLabelText("Scrivener's Versatility 1 level 2"));
  assert.ok(screen.getByLabelText("Scrivener's Versatility 5 level 18"));
  assert.ok(screen.getByRole("button", { name: "Take 20 on Knowledge (planes)" }));
  assert.ok(screen.getByRole("button", { name: "Begin Quintessence Infusion" }));
  assert.ok(screen.getByRole("button", { name: "Invoke Mantra of Tabris" }));
});

test("Dwarven Scholar uses Bard level for combat-feat BAB prerequisites", async () => {
  const user = await selectBard("bard-dwarven-scholar", 6);
  await user.selectOptions(screen.getByLabelText("Weapon and Armor Proficiency level 1"), "bard-dwarven-scholar-weapon");
  assert.ok(screen.getByLabelText("Dwarven weapon"));
  const feat = screen.getByLabelText("Dwarven Training 2 level 6") as HTMLSelectElement;
  assert.ok(Array.from(feat.options).some((option) => /Vital Strike/.test(option.textContent ?? "")));
  assert.ok(screen.getByLabelText("Begin War Chant known combat feat 1"));
  assert.ok(screen.getByLabelText("Begin War Chant known combat feat 2"));
});

test("Speaker and Studious Librarian expose their complete active workflows", async () => {
  await selectBard("bard-speaker-of-the-palatine-eye");
  assert.ok(screen.getByRole("button", { name: "Make a corpse appear to speak" }));
  assert.ok(screen.getByLabelText("Keen Ritualist secondary casters"));
  cleanup(); localStorage.clear();
  await selectBard("bard-studious-librarian");
  assert.ok(screen.getByRole("button", { name: "Cast from a scroll or spellbook" }));
  assert.ok(screen.getByRole("button", { name: "Roll a Research check" }));
  assert.ok(screen.getByRole("button", { name: "Take 20 on a Knowledge check" }));
  assert.ok(screen.getByRole("button", { name: "Replace a known spell from a scroll" }));
});
