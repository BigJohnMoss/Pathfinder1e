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
  ["ranger-guide","Guide",["Ranger's Focus","Terrain Bond","Ranger's Luck","Inspired Moment","Improved Ranger's Luck"],["Favored Enemy 1","Hunter's Bond","Animal Companion Choice","Evasion","Quarry","Improved Evasion","Improved Quarry"]],
  ["ranger-spirit-ranger","Spirit Ranger",["Spirit Bond","Wisdom of the Spirits"],["Hunter's Bond","Animal Companion Choice","Camouflage"]],
  ["ranger-urban-ranger","Urban Ranger",["Favored Community","Trapfinding","Push Through","Blend In","Invisibility Trick"],["Favored Terrain 1","Endurance","Woodland Stride","Camouflage","Hide in Plain Sight"]]
] as const) test(`${name} is selectable with its level-20 progression`, async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "ranger");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const feature of expected) assert.ok(screen.getAllByText(feature).length > 0);
  for (const feature of removed) assert.equal(screen.queryByText(feature), null);
});

test("Urban Ranger applies its city skill list", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "ranger");
  await user.selectOptions(screen.getByLabelText("Archetype"), "ranger-urban-ranger");
  await user.click(screen.getByRole("tab", { name: "Skills" }));
  assert.ok(screen.getByText("Disable Device").closest("label")?.textContent?.includes("Class skill"));
  assert.ok(!screen.getByText("Handle Animal").closest("label")?.textContent?.includes("Class skill"));
});

test("APG Ranger combat styles expose their level-gated feat lists", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "ranger");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "10" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const style = screen.getByLabelText(/Combat Style level 2/);
  const firstFeat = screen.getByLabelText(/Combat Style Feat 1/);
  const thirdFeat = screen.getByLabelText(/Combat Style Feat 3/);
  for (const [styleId, earlyFeat, lateFeat] of [
    ["ranger-combat-style-crossbow","ranger-style-feat-crossbow-deadly-aim","ranger-style-feat-crossbow-pinpoint-targeting"],
    ["ranger-combat-style-mounted","ranger-style-feat-mounted-combat","ranger-style-feat-mounted-skirmisher"],
    ["ranger-combat-style-natural-weapon","ranger-style-feat-natural-aspect-beast","ranger-style-feat-natural-multiattack"],
    ["ranger-combat-style-two-handed","ranger-style-feat-two-handed-power-attack","ranger-style-feat-two-handed-dreadful-carnage"],
    ["ranger-combat-style-weapon-shield","ranger-style-feat-shield-focus","ranger-style-feat-shield-bashing-finish"]
  ] as const) {
    await user.selectOptions(style, styleId);
    assert.equal([...firstFeat.options].some((option) => option.value === earlyFeat), true);
    assert.equal([...thirdFeat.options].some((option) => option.value === lateFeat), true);
  }
});
