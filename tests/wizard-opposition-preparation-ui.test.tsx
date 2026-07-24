import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let waitFor: typeof import("@testing-library/react").waitFor;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, fireEvent, waitFor } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

const optionSelect = (name: string) => {
  const select = screen.getByText(name).closest("label")?.querySelector("select");
  assert.ok(select, `${name} select`);
  return select;
};

test("Wizard opposition spells consume two prepared slots and persist", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
  await user.click(screen.getByRole("button", { name: "Options" }));

  await user.selectOptions(optionSelect("Arcane School"), "wizard-school-evocation");
  await user.selectOptions(optionSelect("First Opposition School"), "wizard-opposition-conjuration");
  await user.selectOptions(optionSelect("Second Opposition School"), "wizard-opposition-abjuration");

  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");

  const mageArmor = screen.getByText("Mage Armor").closest("article");
  const magicMissile = screen.getByText("Magic Missile").closest("article");
  assert.ok(mageArmor);
  assert.ok(magicMissile);
  assert.match(mageArmor.textContent ?? "", /opposition school: costs 2 prepared slots/);

  await user.click(screen.getByRole("button", { name: "Add Mage Armor" }));
  assert.match(screen.getByText(/prepared 1st-level/).textContent ?? "", /2\/2 prepared 1st-level/);
  assert.equal((screen.getByRole("button", { name: "Add Magic Missile" }) as HTMLButtonElement).disabled, true);

  await user.click(screen.getByRole("button", { name: "Options" }));
  await user.selectOptions(optionSelect("First Opposition School"), "wizard-opposition-necromancy");
  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.match(screen.getByText(/prepared 1st-level/).textContent ?? "", /1\/2 prepared 1st-level/);
  assert.equal((screen.getByRole("button", { name: "Add Magic Missile" }) as HTMLButtonElement).disabled, false);
  await user.click(screen.getByRole("button", { name: "Add Magic Missile" }));
  assert.match(screen.getByText(/prepared 1st-level/).textContent ?? "", /2\/2 prepared 1st-level/);

  await user.click(screen.getByRole("button", { name: "Options" }));
  await user.selectOptions(optionSelect("First Opposition School"), "wizard-opposition-conjuration");
  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await waitFor(() => assert.equal(screen.getByLabelText("Magic Missile prepared").textContent, "0"));
  assert.equal(screen.getByLabelText("Mage Armor prepared").textContent, "1");
  assert.match(screen.getByText(/prepared 1st-level/).textContent ?? "", /2\/2 prepared 1st-level/);

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "arcanist");
  assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "arcanist");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "wizard"));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await waitFor(() => assert.equal(screen.getByLabelText("Mage Armor prepared").textContent, "1"));
  assert.match(screen.getByText(/prepared 1st-level/).textContent ?? "", /2\/2 prepared 1st-level/);
});
