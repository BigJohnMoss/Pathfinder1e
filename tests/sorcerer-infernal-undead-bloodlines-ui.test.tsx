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

test("Infernal and Undead grant complete details, class skills, spells, switching, and persistence", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "sorcerer");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });

  await user.click(screen.getByRole("button", { name: "Options" }));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-infernal");
  assert.ok(screen.getByText("Corrupting Touch"));
  assert.ok(screen.getByText("Power of the Pit"));
  assert.ok(screen.getByText(/Meteor Swarm/));
  assert.equal(screen.queryByLabelText("Bloodline variant choice"), null);

  await user.click(screen.getByRole("button", { name: "Skills" }));
  const diplomacy = skillLabel("Diplomacy");
  await user.clear(diplomacy.querySelector("input")!);
  await user.type(diplomacy.querySelector("input")!, "1");
  assert.match(diplomacy.querySelector("strong")?.textContent ?? "", /\+5 class/);

  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.equal(screen.getByLabelText("Protection from Good known").textContent, "Bloodline");
  assert.equal((screen.getByRole("button", { name: "Learn Protection from Good" }) as HTMLButtonElement).disabled, true);
  assert.equal((screen.getByRole("button", { name: "Forget Protection from Good" }) as HTMLButtonElement).disabled, true);

  await user.click(screen.getByRole("button", { name: "Options" }));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-undead");
  assert.ok(screen.getByText("Grave Touch"));
  assert.ok(screen.getByText("One of Us"));
  assert.ok(screen.getByText(/Energy Drain/));

  await user.click(screen.getByRole("button", { name: "Skills" }));
  assert.doesNotMatch(skillLabel("Diplomacy").querySelector("strong")?.textContent ?? "", /class/);
  const religion = skillLabel("Knowledge (religion)");
  await user.clear(religion.querySelector("input")!);
  await user.type(religion.querySelector("input")!, "1");
  assert.match(religion.querySelector("strong")?.textContent ?? "", /\+4 class/);

  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.equal(screen.getByLabelText("Chill Touch known").textContent, "Bloodline");
  assert.equal(screen.getByLabelText("Protection from Good known").textContent, "Unknown");
  assert.match(screen.getByText(/known 1st-level/).textContent ?? "", /0\/3 known 1st-level \+ 1 bloodline/);

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "sorcerer"));
  await user.click(screen.getByRole("button", { name: "Options" }));
  assert.equal(optionSelect("Bloodline").value, "sorcerer-bloodline-undead");
  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await waitFor(() => assert.equal(screen.getByLabelText("Chill Touch known").textContent, "Bloodline"));
});
