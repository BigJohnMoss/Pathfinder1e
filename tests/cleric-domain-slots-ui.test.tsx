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

test("Cleric prepares and tracks dedicated domain spell slots", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "cleric");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.click(screen.getByRole("button", { name: "Options" }));

  const deity = screen.getByText("Deity").closest("label")?.querySelector("select");
  const firstDomain = screen.getByText("First Domain").closest("label")?.querySelector("select");
  const secondDomain = screen.getByText("Second Domain").closest("label")?.querySelector("select");
  assert.ok(deity);
  assert.ok(firstDomain);
  assert.ok(secondDomain);
  await user.selectOptions(deity, "deity-sarenrae");
  await user.selectOptions(firstDomain, "domain-fire");
  await user.selectOptions(secondDomain, "domain-sun");

  const firstSlot = screen.getByText("1st-level Domain Spell Slot").closest("label")?.querySelector("select");
  const secondSlot = screen.getByText("2nd-level Domain Spell Slot").closest("label")?.querySelector("select");
  const thirdSlot = screen.getByText("3rd-level Domain Spell Slot").closest("label")?.querySelector("select");
  assert.ok(firstSlot);
  assert.ok(secondSlot);
  assert.ok(thirdSlot);
  assert.deepEqual([...firstSlot.options].slice(1).map((option) => option.text), ["burning hands", "endure elements"]);
  assert.deepEqual([...secondSlot.options].slice(1).map((option) => option.text), ["heat metal", "produce flame"]);
  assert.deepEqual([...thirdSlot.options].slice(1).map((option) => option.text), ["fireball", "searing light"]);

  await user.selectOptions(firstSlot, "domain-spell-1-burning-hands");
  await user.selectOptions(secondSlot, "domain-spell-2-heat-metal");
  await user.selectOptions(thirdSlot, "domain-spell-3-fireball");
  assert.equal(screen.getByLabelText("1st-level Domain Spell Slot status").textContent, "Available");
  await user.click(screen.getByRole("button", { name: "Cast burning hands from 1st-level Domain Spell Slot" }));
  assert.equal(screen.getByLabelText("1st-level Domain Spell Slot status").textContent, "Used");
  assert.equal((screen.getByRole("button", { name: "Cast burning hands from 1st-level Domain Spell Slot" }) as HTMLButtonElement).disabled, true);

  await user.click(screen.getByRole("button", { name: "Refresh domain spell slots" }));
  assert.equal(screen.getByLabelText("1st-level Domain Spell Slot status").textContent, "Available");

  await user.selectOptions(firstDomain, "domain-healing");
  assert.equal(firstSlot.value, "");
  assert.equal([...firstSlot.options].some((option) => option.text === "cure light wounds"), true);
  assert.equal([...firstSlot.options].some((option) => option.text === "burning hands"), false);
});
