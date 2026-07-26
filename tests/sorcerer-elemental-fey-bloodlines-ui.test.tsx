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
  const select = screen.getAllByText(name).at(-1)!.closest("label")?.querySelector("select");
  assert.ok(select, `expected ${name} select`);
  return select;
};

const skillLabel = (name: string) => {
  const span = screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent?.startsWith(name) === true);
  const label = span.closest("label");
  assert.ok(label, `expected ${name} skill label`);
  return label;
};

test("Elemental and Fey grant class skills, spells, and a persistent element", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "sorcerer");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });

  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-elemental");
  assert.ok(screen.getByText("Elemental Ray"));
  assert.ok(screen.getByText("Elemental Body"));
  const element = screen.getByLabelText("Bloodline variant choice") as HTMLSelectElement;
  assert.equal(element.options.length, 5);
  assert.equal(element.options[0].text, "Choose an element");
  await user.selectOptions(element, "air-element");
  assert.equal(screen.getByLabelText("Selected bloodline variant").textContent, "Air: electricity · Fly 60 feet (average)");

  await user.click(screen.getByRole("tab", { name: "Skills" }));
  const planes = skillLabel("Knowledge (planes)");
  await user.clear(planes.querySelector("input")!);
  await user.type(planes.querySelector("input")!, "1");
  assert.match(planes.querySelector("strong")?.textContent ?? "", /\+4 class/);

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.equal(screen.getByLabelText("Burning Hands known").textContent, "Bloodline");

  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-fey");
  await waitFor(() => assert.equal(screen.queryByLabelText("Bloodline variant choice"), null));
  assert.ok(screen.getByText("Laughing Touch"));
  assert.ok(screen.getByText("Soul of the Fey"));

  await user.click(screen.getByRole("tab", { name: "Skills" }));
  assert.doesNotMatch(skillLabel("Knowledge (planes)").querySelector("strong")?.textContent ?? "", /class/);
  const nature = skillLabel("Knowledge (nature)");
  await user.clear(nature.querySelector("input")!);
  await user.type(nature.querySelector("input")!, "1");
  assert.match(nature.querySelector("strong")?.textContent ?? "", /\+4 class/);

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.equal(screen.getByLabelText("Entangle known").textContent, "Bloodline");
  assert.equal(screen.getByLabelText("Burning Hands known").textContent, "Unknown");

  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-elemental");
  assert.equal((screen.getByLabelText("Bloodline variant choice") as HTMLSelectElement).value, "");
  await user.selectOptions(screen.getByLabelText("Bloodline variant choice"), "water-element");
  assert.equal(screen.getByLabelText("Selected bloodline variant").textContent, "Water: cold · Swim 60 feet");

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "sorcerer"));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal(optionSelect("Bloodline").value, "sorcerer-bloodline-elemental");
  assert.equal((screen.getByLabelText("Bloodline variant choice") as HTMLSelectElement).value, "water-element");
  assert.equal(screen.getByLabelText("Selected bloodline variant").textContent, "Water: cold · Swim 60 feet");
});
