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
  ["paladin-warrior-holy-light","Warrior of the Holy Light",["Power of Faith","Power of Faith (Restoration)","Power of Faith (Daylight)","Power of Faith (Fortification)","Power of Faith (Perfect Nimbus)","Shining Light"],["Divine Spellcasting","Aura of Faith"]],
  ["paladin-sacred-servant","Sacred Servant",["Sacred Deity","Sacred Servant Smite Evil","Sacred Domain","1st-level Domain Spell Slot","4th-level Domain Spell Slot","Holy Symbol Bond","Call Celestial Ally","Call Celestial Ally (Planar Ally)","Call Celestial Ally (Greater)"],["Smite Evil","Divine Spellcasting","Divine Bond","Aura of Resolve"]]
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

for (const [archetypeId, name] of [
  ["paladin-divine-guardian", "Divine Guardian"],
  ["paladin-temple-champion", "Temple Champion"],
] as const) test(`${name} removes the live Paladin spellbook`, async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "paladin");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  assert.equal(screen.queryByRole("tab", { name: "Spells" }), null);
});

test("Sacred Servant restricts deities and domains and prepares its domain slots", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "paladin");
  await user.selectOptions(screen.getByLabelText("Archetype"), "paladin-sacred-servant");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const deity = screen.getAllByText("Sacred Deity").at(-1)!.closest("label")?.querySelector("select");
  const domain = screen.getAllByText("Sacred Domain").at(-1)!.closest("label")?.querySelector("select");
  const firstSlot = screen.getAllByText("1st-level Domain Spell Slot").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(deity);
  assert.ok(domain);
  assert.ok(firstSlot);
  assert.equal([...deity.options].some((option) => option.value === "deity-iomedae"), true);
  assert.equal([...deity.options].some((option) => option.value === "deity-desna"), false);
  assert.equal(domain.disabled, true);

  await user.selectOptions(deity, "deity-iomedae");
  assert.equal(domain.disabled, false);
  assert.equal([...domain.options].some((option) => option.value === "domain-glory"), true);
  assert.equal([...domain.options].some((option) => option.value === "domain-fire"), false);
  await user.selectOptions(domain, "domain-glory");
  assert.equal(firstSlot.disabled, false);
  assert.equal([...firstSlot.options].some((option) => option.text.includes("shield of faith")), true);
});
