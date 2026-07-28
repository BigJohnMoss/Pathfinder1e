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

for (const [archetypeId, name, expected] of [
  ["rogue-acrobat","Acrobat",["Expert Acrobat","Second Chance"]],
  ["rogue-cutpurse","Cutpurse",["Measure the Mark","Stab and Grab"]],
  ["rogue-investigator","Investigator",["Follow Up"]],
  ["rogue-poisoner","Poisoner",["Poison Use","Master Poisoner"]],
  ["rogue-rake","Rake",["Bravado's Blade","Rake's Smile"]],
  ["rogue-sniper","Sniper",["Accuracy","Deadly Range"]],
  ["rogue-spy","Spy",["Skilled Liar","Poison Use"]],
  ["rogue-swashbuckler","Swashbuckler",["Martial Training","Daring"]],
  ["rogue-thug","Thug",["Frightening","Brutal Beating"]],
  ["rogue-burglar","Burglar",["Careful Disarm","Distraction"]],
  ["rogue-scout","Scout",["Scout's Charge","Skirmisher"]],
  ["rogue-trapsmith","Trapsmith",["Careful Disarm","Trap Master"]]
] as const) test(`${name} is selectable through level 20`, async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "rogue");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const feature of expected) assert.ok(screen.getAllByText(feature).length > 0);
  if (!["rogue-burglar","rogue-scout","rogue-trapsmith"].includes(archetypeId)) assert.equal(screen.queryByText("Trapfinding"), null);
  else {
    assert.equal(screen.queryByText("Uncanny Dodge"), null);
    assert.equal(screen.queryByText("Improved Uncanny Dodge"), null);
  }
});
