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

const firstEnabledButton = (pattern: RegExp) => {
  const button = screen.getAllByRole("button", { name: pattern }).find((item) => !(item as HTMLButtonElement).disabled);
  assert.ok(button, `expected an enabled button matching ${pattern}`);
  return button;
};

const skillLabel = (name: string) => {
  const span = screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent?.startsWith(name) === true);
  const label = span.closest("label");
  assert.ok(label, `expected ${name} skill label`);
  return label;
};

test("Aberrant and Abyssal bloodlines grant details, class skills, and free known spells", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "sorcerer");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });

  await user.click(screen.getByRole("tab", { name: "Features" }));
  const bloodline = optionSelect("Bloodline");
  await user.selectOptions(bloodline, "sorcerer-bloodline-aberrant");
  assert.ok(screen.getByText("Bloodline arcana:"));
  assert.ok(screen.getByText("Bloodline powers"));
  assert.ok(screen.getByText("Acidic Ray"));
  assert.ok(screen.getByText("Aberrant Form"));
  assert.ok(screen.getByText("Bloodline bonus spells"));
  assert.ok(screen.getByText(/Shapechange/));
  assert.ok(screen.getByText("Bloodline bonus feats"));

  await user.click(screen.getByRole("tab", { name: "Skills" }));
  const dungeoneering = skillLabel("Knowledge (dungeoneering)");
  await user.clear(dungeoneering.querySelector("input")!);
  await user.type(dungeoneering.querySelector("input")!, "1");
  assert.match(dungeoneering.querySelector("strong")?.textContent ?? "", /\+4 class/);

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.equal(screen.getByLabelText("Enlarge Person known").textContent, "Bloodline");
  assert.equal((screen.getByRole("button", { name: "Learn Enlarge Person" }) as HTMLButtonElement).disabled, true);
  assert.equal((screen.getByRole("button", { name: "Forget Enlarge Person" }) as HTMLButtonElement).disabled, true);
  assert.match(screen.getByText(/known 1st-level/).textContent ?? "", /0\/3 known 1st-level \+ 1 bloodline/);

  for (let index = 0; index < 3; index += 1) await user.click(firstEnabledButton(/^Learn /));
  assert.match(screen.getByText(/known 1st-level/).textContent ?? "", /3\/3 known 1st-level \+ 1 bloodline/);
  assert.equal(screen.getAllByRole("button", { name: /^Learn / }).some((button) => !(button as HTMLButtonElement).disabled), false);

  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(optionSelect("Bloodline"), "sorcerer-bloodline-abyssal");
  assert.ok(screen.getByText("Claws"));
  assert.ok(screen.getByText("Demonic Might"));
  assert.ok(screen.getByText(/Summon Monster IX/));

  await user.click(screen.getByRole("tab", { name: "Skills" }));
  assert.doesNotMatch(skillLabel("Knowledge (dungeoneering)").querySelector("strong")?.textContent ?? "", /class/);
  const planes = skillLabel("Knowledge (planes)");
  await user.clear(planes.querySelector("input")!);
  await user.type(planes.querySelector("input")!, "1");
  assert.match(planes.querySelector("strong")?.textContent ?? "", /\+4 class/);

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.equal(screen.getByLabelText("Cause Fear known").textContent, "Bloodline");
  assert.equal(screen.getByLabelText("Enlarge Person known").textContent, "Unknown");
  assert.match(screen.getByText(/known 1st-level/).textContent ?? "", /3\/3 known 1st-level \+ 1 bloodline/);

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "sorcerer"));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal(optionSelect("Bloodline").value, "sorcerer-bloodline-abyssal");
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await waitFor(() => assert.equal(screen.getByLabelText("Cause Fear known").textContent, "Bloodline"));
});
