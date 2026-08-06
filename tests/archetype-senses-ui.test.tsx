import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let within: typeof import("@testing-library/react").within;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup, fireEvent, within } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("permanent inferred archetype senses appear in live character statistics", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "wizard-shadowcaster");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const senses = screen.getByRole("heading", { name: "Special senses" }).closest("section");
  assert.ok(senses);
  assert.ok(within(senses).getByText("Darkvision 60 ft."));
  assert.ok(within(senses).getByText("Shadowcaster"));
});

test("conditional inferred senses retain their activation requirement", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "brawler");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "13" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "brawler-mutagenic-mauler");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const senses = screen.getByRole("heading", { name: "Special senses" }).closest("section");
  assert.ok(senses);
  assert.ok(within(senses).getByText("Low-light vision"));
  assert.ok(within(senses).getByText("Darkvision 30 ft."));
  assert.ok(within(senses).getByText("Scent 30 ft."));
  assert.equal(within(senses).getAllByText(/when using her mutagen .* Mutagenic Mauler/i).length, 3);
});

test("level-aware archetype defenses appear in live character statistics", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "ranger");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "16" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "ranger-cinderwalker");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const defenses = screen.getByRole("heading", { name: "Special defenses" }).closest("section");
  assert.ok(defenses);
  assert.ok(within(defenses).getByText("Fire resistance 30"));

  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  assert.ok(within(defenses).getByText("Immune to fire"));
  assert.equal(within(defenses).queryByText(/Fire resistance/), null);
});

test("conditional spell resistance retains its published trigger", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "ranger");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "19" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "ranger-wilderness-explorer");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const defenses = screen.getByRole("heading", { name: "Special defenses" }).closest("section");
  assert.ok(defenses);
  assert.ok(within(defenses).getByText("Spell resistance 30"));
  assert.match(defenses.textContent ?? "", /favored terrains/i);
});

test("improved evasion replaces evasion in live character statistics", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "12" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "bard-juggler");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const defenses = screen.getByRole("heading", { name: "Special defenses" }).closest("section");
  assert.ok(defenses);
  assert.ok(within(defenses).getByText("Improved evasion"));
  assert.equal(within(defenses).queryByText("Evasion"), null);
});

test("conditional immunity appears with its activation requirement", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "barbarian");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "14" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "barbarian-dreadnought");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const defenses = screen.getByRole("heading", { name: "Special defenses" }).closest("section");
  assert.ok(defenses);
  assert.ok(within(defenses).getByText("Immune to fear effects"));
  assert.match(defenses.textContent ?? "", /while in rage/i);
});

test("improved uncanny dodge replaces uncanny dodge in live statistics", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "7" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "fighter-sensate");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const defenses = screen.getByRole("heading", { name: "Special defenses" }).closest("section");
  assert.ok(defenses);
  assert.ok(within(defenses).getByText("Improved uncanny dodge"));
  assert.equal(within(defenses).queryByText("Uncanny dodge"), null);
});

test("fortification displays its current level milestone", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "witch");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "10" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "witch-putrefactor");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const defenses = screen.getByRole("heading", { name: "Special defenses" }).closest("section");
  assert.ok(defenses);
  assert.ok(within(defenses).getByText("Fortification 50% (critical hits and sneak attacks)"));
});

test("concealment displays its current level milestone and trigger", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "7" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "oracle-hermit");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const defenses = screen.getByRole("heading", { name: "Special defenses" }).closest("section");
  assert.ok(defenses);
  assert.ok(within(defenses).getByText("Concealment 20%"));
  assert.match(defenses.textContent ?? "", /no creatures within 10 feet/i);

  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "14" } });
  assert.ok(within(defenses).getByText("Concealment 50%"));
});

test("miss chance displays its armor and load restrictions", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "19" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "fighter-skirmisher");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const defenses = screen.getByRole("heading", { name: "Special defenses" }).closest("section");
  assert.ok(defenses);
  assert.ok(within(defenses).getByText("Miss chance 20%"));
  assert.match(defenses.textContent ?? "", /wearing light or no armor/i);
});
