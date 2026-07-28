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

for (const [archetypeId, archetypeName, expected, removed] of [
  ["monk-drunken-master", "Drunken Master", ["Drunken Ki","Drunken Strength +1d6","Drunken Courage","Drunken Resilience DR 1/—","Firewater Breath"], ["Still Mind","Purity of Body","Diamond Body","Diamond Soul","Empty Body"]],
  ["monk-hungry-ghost", "Hungry Ghost Monk", ["Punishing Kick","Steal Ki","Life Funnel","Life from a Stone","Sipping Demon"], ["Stunning Fist","Purity of Body","Wholeness of Body","Diamond Body","Diamond Soul"]],
  ["monk-ki-mystic", "Ki Mystic", ["Ki Mystic","Mystic Insight","Mystic Visions","Mystic Prescience +2","Mystic Persistence"], ["Still Mind","Purity of Body","Diamond Body","Diamond Soul","Empty Body"]],
  ["monk-empty-hand", "Monk of the Empty Hand", ["Improvised Flurry","Versatile Improvisation","Ki Weapons","Greater Ki Weapons"], ["Flurry of Blows","Still Mind","Purity of Body","Diamond Body"]],
  ["monk-healing-hand", "Monk of the Healing Hand", ["Ancient Healing Hand","Ki Sacrifice (Raise Dead)","Ki Sacrifice (Resurrection)","True Sacrifice"], ["Wholeness of Body","Diamond Body","Quivering Palm","Perfect Self"]],
  ["monk-lotus", "Monk of the Lotus", ["Touch of Serenity","Touch of Surrender","Touch of Peace","Learned Master"], ["Stunning Fist","Abundant Step","Quivering Palm","Tongue of the Sun and Moon"]],
  ["monk-sacred-mountain", "Monk of the Sacred Mountain", ["Iron Monk","Bastion Stance","Iron Limb Defense","Adamantine Monk DR 1/—","Vow of Silence"], ["Evasion","Slow Fall 20 ft.","High Jump","Improved Evasion","Tongue of the Sun and Moon"]],
  ["monk-weapon-adept", "Weapon Adept", ["Perfect Strike","Way of the Weapon Master (Weapon Focus)","Way of the Weapon Master (Weapon Specialization)","Evasion","Uncanny Initiative","Pure Power"], ["Stunning Fist","Improved Evasion","Timeless Body","Perfect Self"]],
  ["monk-zen-archer", "Zen Archer", ["Bow Flurry","Perfect Strike","Way of the Bow (Weapon Focus)","Way of the Bow (Weapon Specialization)","Zen Archery","Point Blank Master","Ki Arrows","Reflexive Shot","Trick Shot","Ki Focus Bow"], ["Flurry of Blows","Stunning Fist","Maneuver Training","Still Mind","Purity of Body","Improved Evasion","Diamond Body","Tongue of the Sun and Moon"]]
] as const) test(`${archetypeName} is selectable with its level-20 progression`, async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "monk");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of expected) assert.ok(screen.getAllByText(name).length > 0);
  for (const name of removed) assert.equal(screen.queryByText(name), null);
});

test("Monk of the Four Winds selects a permanent spirit aspect", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "monk");
  await user.selectOptions(screen.getByLabelText("Archetype"), "monk-four-winds");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of ["Elemental Fist","Slow Time","Aspect Master","Immortality"]) assert.ok(screen.getAllByText(name).length > 0);
  const aspect = screen.getByLabelText("Aspect Master level 17");
  for (const id of ["four-winds-aspect-carp","four-winds-aspect-ki-rin","four-winds-aspect-monkey","four-winds-aspect-oni","four-winds-aspect-owl","four-winds-aspect-tiger"]) assert.ok(aspect.querySelector(`option[value='${id}']`));
  await user.selectOptions(aspect, "four-winds-aspect-tiger");
  assert.ok(screen.getByText(/ten times land speed/));
});
