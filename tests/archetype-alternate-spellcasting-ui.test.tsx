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
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("Dandy exposes gated Medium spontaneous casting from the Bard list", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "ranger");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  await user.selectOptions(screen.getByLabelText("Archetype"), "ranger-dandy");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.match(screen.getByText(/Ranger \(Dandy\) slots:/).textContent ?? "", /no leveled spell slots available/);

  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "4" } });
  assert.doesNotMatch(screen.getByText(/Ranger \(Dandy\) slots:/).textContent ?? "", /no leveled spell slots available/);
  assert.ok(screen.getByRole("heading", { name: "Spontaneous spells" }));
  await user.type(screen.getByPlaceholderText("Name or effect"), "Daze");
  assert.ok(screen.getByText("Daze"));
});

test("Living Grimoire exposes Warpriest-style prepared Inquisitor casting", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "inquisitor");
  await user.selectOptions(screen.getByLabelText("Human +2"), "intelligence");
  await user.selectOptions(screen.getByLabelText("Archetype"), "inquisitor-living-grimoire");
  await user.click(screen.getByRole("tab", { name: "Spells" }));

  assert.ok(screen.getByRole("heading", { name: "Prepared spells" }));
  assert.match(screen.getByText(/Inquisitor \(Living Grimoire\) slots:/).textContent ?? "", /1st-level/);
});

for (const [classId, archetypeId, className, archetypeName, ability, spellName] of [
  ["bard", "bard-speaker-of-the-palatine-eye", "Bard", "Speaker of the Palatine Eye", "charisma", "Aphasia"],
  ["investigator", "investigator-questioner", "Investigator", "Questioner", "intelligence", "Daze"],
  ["magus", "magus-eldritch-scion", "Magus", "Eldritch Scion", "charisma", "Shield"],
  ["magus", "magus-mindblade", "Magus", "Mindblade", "intelligence", "Shield"],
] as const) test(`${archetypeName} exposes its complete spontaneous spellcasting profile at 1st level`, async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), classId);
  await user.selectOptions(screen.getByLabelText("Human +2"), ability);
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  await user.click(screen.getByRole("tab", { name: "Spells" }));

  assert.ok(screen.getByRole("heading", { name: "Spontaneous spells" }));
  assert.doesNotMatch(screen.getByText(new RegExp(`${className} \\(${archetypeName}\\) slots:`)).textContent ?? "", /no leveled spell slots available/);
  await user.type(screen.getByPlaceholderText("Name or effect"), spellName);
  assert.ok(screen.getByText(spellName));
});

test("Pearl Seeker exposes gated Bloodrager slots and level-gated bonus spells", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "paladin");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  await user.selectOptions(screen.getByLabelText("Archetype"), "paladin-pearl-seeker");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "7" } });
  await user.click(screen.getByRole("tab", { name: "Spells" }));

  assert.ok(screen.getByRole("heading", { name: "Spontaneous spells" }));
  assert.doesNotMatch(screen.getByText(/Paladin \(Pearl Seeker\) slots:/).textContent ?? "", /no leveled spell slots available/);
  await user.type(screen.getByPlaceholderText("Name or effect"), "Slipstream");
  assert.ok(screen.getByText("Slipstream"));
});
