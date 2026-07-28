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
  ["monk-ki-mystic", "Ki Mystic", ["Ki Mystic","Mystic Insight","Mystic Visions","Mystic Prescience +2","Mystic Persistence"], ["Still Mind","Purity of Body","Diamond Body","Diamond Soul","Empty Body"]]
] as const) test(`${archetypeName} is selectable with its level-20 progression`, async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "monk");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of expected) assert.ok(screen.getByText(name));
  for (const name of removed) assert.equal(screen.queryByText(name), null);
});
