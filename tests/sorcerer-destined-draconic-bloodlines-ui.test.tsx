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
  assert.ok(select, `expected ${name} select`);
  return select;
};

const skillLabel = (name: string) => {
  const span = screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent?.startsWith(name) === true);
  const label = span.closest("label");
  assert.ok(label, `expected ${name} skill label`);
  return label;
};

test("Destined and Draconic grant class skills, spells, and a persistent dragon type", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "sorcerer");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });

  await user.click(screen.getByRole("button", { name: "Options" }));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-destined");
  assert.ok(screen.getByText("Touch of Destiny"));
  assert.ok(screen.getByText("Destiny Realized"));
  assert.equal(screen.queryByLabelText("Bloodline variant choice"), null);

  await user.click(screen.getByRole("button", { name: "Skills" }));
  const history = skillLabel("Knowledge (history)");
  await user.clear(history.querySelector("input")!);
  await user.type(history.querySelector("input")!, "1");
  assert.match(history.querySelector("strong")?.textContent ?? "", /\+4 class/);

  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.equal(screen.getByLabelText("Alarm known").textContent, "Bloodline");

  await user.click(screen.getByRole("button", { name: "Options" }));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-draconic");
  assert.ok(screen.getByText("Claws"));
  assert.ok(screen.getByText("Power of Wyrms"));
  const dragonType = screen.getByLabelText("Bloodline variant choice") as HTMLSelectElement;
  assert.equal(dragonType.options.length, 11);
  await user.selectOptions(dragonType, "red-dragon");
  assert.equal(screen.getByLabelText("Selected bloodline variant").textContent, "Red Dragon: fire · 30-foot cone");

  await user.click(screen.getByRole("button", { name: "Skills" }));
  assert.doesNotMatch(skillLabel("Knowledge (history)").querySelector("strong")?.textContent ?? "", /class/);
  const perception = skillLabel("Perception");
  await user.clear(perception.querySelector("input")!);
  await user.type(perception.querySelector("input")!, "1");
  assert.match(perception.querySelector("strong")?.textContent ?? "", /\+4 class/);

  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.equal(screen.getByLabelText("Mage Armor known").textContent, "Bloodline");
  assert.equal(screen.getByLabelText("Alarm known").textContent, "Unknown");

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "sorcerer"));
  await user.click(screen.getByRole("button", { name: "Options" }));
  assert.equal(optionSelect("Bloodline").value, "sorcerer-bloodline-draconic");
  assert.equal((screen.getByLabelText("Bloodline variant choice") as HTMLSelectElement).value, "red-dragon");
  assert.equal(screen.getByLabelText("Selected bloodline variant").textContent, "Red Dragon: fire · 30-foot cone");

  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-destined");
  await waitFor(() => assert.equal(screen.queryByLabelText("Bloodline variant choice"), null));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-draconic");
  assert.equal((screen.getByLabelText("Bloodline variant choice") as HTMLSelectElement).value, "");
});
