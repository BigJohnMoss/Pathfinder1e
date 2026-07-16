import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("saves and restores character details", async () => {
  const user = userEvent.setup();
  render(<Home />);
  const name = screen.getByLabelText("Character name");
  await user.type(name, "Kyra");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.clear(name);
  await user.type(name, "Changed");
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal((name as HTMLInputElement).value, "Kyra");
  assert.match(screen.getByText("Loaded saved character").textContent ?? "", /Loaded/);
});

test("enforces the skill-rank pool through the interface", async () => {
  const user = userEvent.setup();
  render(<Home />);
  const climb = screen.getByText("Climb").closest("label")?.querySelector("input");
  assert.ok(climb);
  await user.clear(climb);
  await user.type(climb, "999");
  assert.equal((climb as HTMLInputElement).value, "16");
  assert.match(screen.getByText(/of 16 total ranks allocated/).textContent ?? "", /16 of 16/);
});

test("prevents duplicate feats and prepares spells", async () => {
  const user = userEvent.setup();
  render(<Home />);
  assert.match(screen.getByText(/Arcanist slots/).textContent ?? "", /3 1st \(2 base \+ 1 Intelligence\)/);
  await user.clear(screen.getByLabelText("Level"));
  await user.type(screen.getByLabelText("Level"), "3");
  await user.selectOptions(screen.getByLabelText("Human bonus feat"), "combat-casting");
  const secondFeat = screen.getByLabelText("Feat 1");
  assert.equal((secondFeat.querySelector("option[value='combat-casting']") as HTMLOptionElement).disabled, true);
  const mageArmor = screen.getByLabelText(/Mage Armor/);
  await user.click(mageArmor);
  assert.equal((mageArmor as HTMLInputElement).checked, true);
});
