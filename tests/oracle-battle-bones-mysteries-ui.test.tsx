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

const selectFor = (label: string, index = 0) => {
  const selects = screen.getAllByText(label).map((text) => text.closest("label")?.querySelector("select")).filter(Boolean) as HTMLSelectElement[];
  assert.ok(selects[index], `expected ${label} select ${index}`);
  return selects[index];
};

test("Battle and Bones grant details, legal unique revelations, spells, and persistence", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  await user.clear(screen.getByLabelText("Charisma base score"));
  await user.type(screen.getByLabelText("Charisma base score"), "18");
  await user.clear(screen.getByLabelText("Level"));
  await user.type(screen.getByLabelText("Level"), "20");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const mystery = selectFor("Mystery");
  await user.selectOptions(mystery, "oracle-mystery-battle");
  assert.ok(screen.getByText("Granted class skills:"));
  assert.ok(screen.getByText("Final revelation:"));
  assert.ok(screen.getByText("storm of vengeance"));

  const firstRevelation = selectFor("Revelation", 0);
  const secondRevelation = selectFor("Revelation", 1);
  assert.ok(Array.from(firstRevelation.options).some((option) => option.value === "oracle-revelation-iron-skin"));
  assert.equal(Array.from(firstRevelation.options).some((option) => option.value === "oracle-revelation-armor-of-bones"), false);
  await user.selectOptions(firstRevelation, "oracle-revelation-skill-at-arms");
  assert.equal(Array.from(secondRevelation.options).some((option) => option.value === "oracle-revelation-skill-at-arms"), false);

  await user.selectOptions(mystery, "oracle-mystery-bones");
  await waitFor(() => assert.equal(firstRevelation.value, ""));
  assert.ok(Array.from(firstRevelation.options).some((option) => option.value === "oracle-revelation-spirit-walk"));
  await user.selectOptions(firstRevelation, "oracle-revelation-spirit-walk");

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.ok(screen.getByText("wail of the banshee"));
  assert.equal(screen.getByLabelText("wail of the banshee known").textContent, "Mystery");

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "oracle"));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal(selectFor("Mystery").value, "oracle-mystery-bones");
  assert.equal(selectFor("Revelation", 0).value, "oracle-revelation-spirit-walk");
});
