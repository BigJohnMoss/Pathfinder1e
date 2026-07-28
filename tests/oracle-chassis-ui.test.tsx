import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

const selectFor = (label: string) => {
  const select = screen.getAllByText(label).at(-1)?.closest("label")?.querySelector("select");
  assert.ok(select, `expected ${label} select`);
  return select;
};

test("Oracle can select its APG foundation choices and use spontaneous spells", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const mystery = selectFor("Mystery");
  assert.equal(mystery.options.length, 11);
  await user.selectOptions(mystery, "oracle-mystery-life");
  await user.selectOptions(selectFor("Oracle's Curse"), "oracle-curse-haunted");
  await user.selectOptions(selectFor("Cure or Inflict Spells"), "oracle-cure-spells");

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.ok(screen.getByRole("heading", { name: "Spontaneous spells" }));
  assert.match(screen.getByText(/Oracle slots:/).textContent ?? "", /4\/4 1st-level/);
});
