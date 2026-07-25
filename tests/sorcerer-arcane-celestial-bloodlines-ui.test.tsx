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

test("Arcane selects a Knowledge skill while Celestial grants off-list spells and Heal", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "sorcerer");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });

  await user.click(screen.getByRole("button", { name: "Options" }));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-arcane");
  assert.ok(screen.getByText("Arcane Bond"));
  assert.ok(screen.getByText("Arcane Apotheosis"));
  const classSkill = screen.getByLabelText("Bloodline class skill choice") as HTMLSelectElement;
  assert.equal(classSkill.options.length, 11);
  await user.selectOptions(classSkill, "Knowledge (history)");

  await user.click(screen.getByRole("button", { name: "Skills" }));
  const history = skillLabel("Knowledge (history)");
  await user.clear(history.querySelector("input")!);
  await user.type(history.querySelector("input")!, "1");
  assert.match(history.querySelector("strong")?.textContent ?? "", /\+4 class/);
  assert.doesNotMatch(skillLabel("Knowledge (nature)").querySelector("strong")?.textContent ?? "", /class/);

  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.equal(screen.getByLabelText("Identify known").textContent, "Bloodline");
  assert.match(screen.getByText(/known 1st-level/).textContent ?? "", /0\/3 known 1st-level \+ 1 bloodline/);

  await user.click(screen.getByRole("button", { name: "Options" }));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-celestial");
  await waitFor(() => assert.equal(screen.queryByLabelText("Bloodline class skill choice"), null));
  assert.ok(screen.getByText("Heavenly Fire"));
  assert.ok(screen.getByText("Ascension"));
  assert.ok(screen.getByText(/Flame Strike/));

  await user.click(screen.getByRole("button", { name: "Skills" }));
  assert.doesNotMatch(skillLabel("Knowledge (history)").querySelector("strong")?.textContent ?? "", /class/);
  const heal = skillLabel("Heal");
  await user.clear(heal.querySelector("input")!);
  await user.type(heal.querySelector("input")!, "1");
  assert.match(heal.querySelector("strong")?.textContent ?? "", /\+4 class/);

  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.equal(screen.getByLabelText("Bless known").textContent, "Bloodline");
  assert.equal(screen.getByLabelText("Identify known").textContent, "Unknown");
  assert.equal((screen.getByRole("button", { name: "Forget Bless" }) as HTMLButtonElement).disabled, true);
  assert.equal((screen.getByRole("button", { name: "Learn Bless" }) as HTMLButtonElement).disabled, true);
  assert.match(screen.getByText(/known 1st-level/).textContent ?? "", /0\/3 known 1st-level \+ 1 bloodline/);

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "sorcerer"));
  await user.click(screen.getByRole("button", { name: "Options" }));
  assert.equal(optionSelect("Bloodline").value, "sorcerer-bloodline-celestial");
  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await waitFor(() => assert.equal(screen.getByLabelText("Bless known").textContent, "Bloodline"));
});
