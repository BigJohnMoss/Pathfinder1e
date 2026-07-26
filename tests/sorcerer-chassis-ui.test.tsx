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

const firstEnabledButton = (pattern: RegExp) => {
  const button = screen.getAllByRole("button", { name: pattern }).find((item) => !(item as HTMLButtonElement).disabled);
  assert.ok(button, `expected an enabled button matching ${pattern}`);
  return button;
};

test("Sorcerer learns fixed spells, casts spontaneously, selects a bloodline, and persists", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "sorcerer");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");

  await user.click(screen.getByRole("tab", { name: "Features" }));
  const bloodline = screen.getAllByText("Bloodline").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(bloodline);
  assert.equal(bloodline.options.length, 11);
  await user.selectOptions(bloodline, "sorcerer-bloodline-arcane");

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.ok(screen.getByRole("heading", { name: "Spontaneous spells" }));
  assert.match(screen.getByText(/Sorcerer slots:/).textContent ?? "", /4\/4 1st-level/);

  await user.selectOptions(screen.getByLabelText("Spell level filter"), "0");
  for (let index = 0; index < 4; index += 1) await user.click(firstEnabledButton(/^Learn /));
  assert.ok(screen.getByText(/4\/4 known Cantrips/));
  assert.equal(screen.getAllByRole("button", { name: /^Learn / }).some((button) => !(button as HTMLButtonElement).disabled), false);
  const cantripCast = firstEnabledButton(/^Cast /);
  await user.click(cantripCast);
  await user.click(cantripCast);
  assert.match(screen.getByText(/Sorcerer slots:/).textContent ?? "", /4\/4 1st-level/);

  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  for (let index = 0; index < 2; index += 1) await user.click(firstEnabledButton(/^Learn /));
  assert.ok(screen.getByText(/2\/2 known 1st-level/));
  assert.equal(screen.getAllByRole("button", { name: /^Learn / }).some((button) => !(button as HTMLButtonElement).disabled), false);

  for (let index = 0; index < 4; index += 1) await user.click(firstEnabledButton(/^Cast /));
  assert.match(screen.getByText(/Sorcerer slots:/).textContent ?? "", /0\/4 1st-level/);
  assert.equal(screen.getAllByRole("button", { name: /^Cast / }).some((button) => !(button as HTMLButtonElement).disabled), false);

  const knownNames = screen.getAllByText("Known").map((output) => output.getAttribute("aria-label"));
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "sorcerer"));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await waitFor(() => assert.ok(screen.getAllByText("Known").length >= 2));
  assert.deepEqual(screen.getAllByText("Known").map((output) => output.getAttribute("aria-label")), knownNames);

  await user.click(screen.getByRole("tab", { name: "Features" }));
  const loadedBloodline = screen.getAllByText("Bloodline").at(-1)!.closest("label")?.querySelector("select");
  assert.equal(loadedBloodline?.value, "sorcerer-bloodline-arcane");
});
