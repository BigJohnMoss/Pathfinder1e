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

for (const [archetypeId, name, expected, removed] of [
  ["paladin-divine-defender","Divine Defender",["Shared Defense +1","Shared Defense (10 feet)","Armor Bond"],["Mercy 1","Mercy 2","Mercy 3","Mercy 4","Mercy 5","Mercy 6","Divine Bond"]],
  ["paladin-hospitaler","Hospitaler",["Hospitaler Channel Energy","Aura of Healing"],["Channel Positive Energy","Aura of Justice"]],
  ["paladin-shining-knight","Shining Knight",["Skilled Rider","Bonded Mount","Knight's Charge"],["Divine Health","Divine Bond","Aura of Justice"]],
  ["paladin-undead-scourge","Undead Scourge",["Aura of Life","Undead Annihilation"],["Aura of Resolve","Aura of Justice"]],
  ["paladin-warrior-holy-light","Warrior of the Holy Light",["Power of Faith","Power of Faith (Restoration)","Power of Faith (Daylight)","Power of Faith (Fortification)","Power of Faith (Perfect Nimbus)","Shining Light"],["Divine Spellcasting","Aura of Faith"]]
] as const) test(`${name} is selectable with its level-20 progression`, async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "paladin");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const feature of expected) assert.ok(screen.getAllByText(feature).length > 0);
  for (const feature of removed) assert.equal(screen.queryByText(feature), null);
});

test("Warrior of the Holy Light has no spellbook", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "paladin");
  await user.selectOptions(screen.getByLabelText("Archetype"), "paladin-warrior-holy-light");
  assert.equal(screen.queryByRole("tab", { name: "Spells" }), null);
});
