import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let waitFor: typeof import("@testing-library/react").waitFor;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, waitFor } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("Wizard Arcane Bond unlocks the selected familiar or object path and persists it", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("button", { name: "Options" }));

  const bond = screen.getByText("Arcane Bond").closest("label")?.querySelector("select");
  const familiar = screen.getByText("Familiar Choice").closest("label")?.querySelector("select");
  const object = screen.getByText("Bonded Object Choice").closest("label")?.querySelector("select");
  assert.ok(bond);
  assert.ok(familiar);
  assert.ok(object);
  assert.equal(familiar.disabled, true);
  assert.equal(object.disabled, true);
  assert.equal(familiar.options[0].text, "Choose an arcane bond first");

  await user.selectOptions(bond, "wizard-arcane-bond-familiar");
  assert.equal(familiar.disabled, false);
  assert.equal(object.disabled, true);
  assert.ok(screen.getByText("Deliver Touch Spells"));
  assert.ok(screen.getByText("Scry on Familiar"));
  await user.selectOptions(familiar, "wizard-familiar-raven");
  assert.ok(screen.getByText(/speak one language of the master's choice/));

  await user.selectOptions(bond, "wizard-arcane-bond-object");
  await waitFor(() => assert.equal(familiar.value, ""));
  assert.equal(familiar.disabled, true);
  assert.equal(object.disabled, false);
  assert.ok(screen.getByText("Additional Spell"));
  assert.ok(screen.getByText("Bond Dependency"));
  await user.selectOptions(object, "wizard-bonded-object-wand");
  assert.ok(screen.getByText(/final wand charge is expended/));

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(bond, "wizard-arcane-bond-familiar");
  await user.selectOptions(familiar, "wizard-familiar-cat");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal(bond.value, "wizard-arcane-bond-object"));
  assert.equal(object.value, "wizard-bonded-object-wand");
  assert.equal(familiar.value, "");
});
