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

test("Wizard specialist school slots prepare, cast, refresh, and clear with school changes", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const school = screen.getAllByText("Arcane School").at(-1)!.closest("label")?.querySelector("select");
  const firstSlot = screen.getAllByText("1st-level Specialist School Slot").at(-1)!.closest("label")?.querySelector("select");
  const secondSlot = screen.getAllByText("2nd-level Specialist School Slot").at(-1)!.closest("label")?.querySelector("select");
  const thirdSlot = screen.getAllByText("3rd-level Specialist School Slot").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(school);
  assert.ok(firstSlot);
  assert.ok(secondSlot);
  assert.ok(thirdSlot);
  assert.equal(firstSlot.disabled, true);
  assert.equal(firstSlot.options[0].text, "Choose an arcane school first");

  await user.selectOptions(school, "wizard-school-evocation");
  assert.equal(firstSlot.disabled, false);
  assert.equal(secondSlot.disabled, false);
  assert.equal(thirdSlot.disabled, false);
  assert.equal([...firstSlot.options].some((option) => option.value === "magic-missile"), true);
  assert.equal([...firstSlot.options].some((option) => option.value === "mage-armor"), false);
  assert.ok(secondSlot.options.length > 1);
  assert.ok(thirdSlot.options.length > 1);

  await user.selectOptions(firstSlot, "magic-missile");
  await user.selectOptions(secondSlot, secondSlot.options[1].value);
  await user.selectOptions(thirdSlot, thirdSlot.options[1].value);
  const firstSpellName = firstSlot.selectedOptions[0].text;
  assert.equal(screen.getByLabelText("1st-level Specialist School Slot status").textContent, "Available");
  await user.click(screen.getByRole("button", { name: `Cast ${firstSpellName} from 1st-level Specialist School Slot` }));
  assert.equal(screen.getByLabelText("1st-level Specialist School Slot status").textContent, "Used");
  await user.click(screen.getByRole("button", { name: "Refresh specialist school slots" }));
  assert.equal(screen.getByLabelText("1st-level Specialist School Slot status").textContent, "Available");

  await user.selectOptions(school, "wizard-school-conjuration");
  await waitFor(() => assert.equal(firstSlot.value, ""));
  assert.equal([...firstSlot.options].some((option) => option.value === "mage-armor"), true);
  assert.equal([...firstSlot.options].some((option) => option.value === "magic-missile"), false);
  assert.equal(secondSlot.value, "");
  assert.equal(thirdSlot.value, "");

  await user.selectOptions(school, "wizard-school-universalist");
  assert.equal(firstSlot.disabled, true);
  assert.equal(secondSlot.disabled, true);
  assert.equal(thirdSlot.disabled, true);
  assert.equal(firstSlot.options[0].text, "Universalists have no specialist slots");
});
