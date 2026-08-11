import assert from "node:assert/strict";
import test from "node:test";
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

test("Winter Witch shows the calculated cold-spell DC and its source", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "witch");
  await user.selectOptions(screen.getByLabelText("Human +2"), "intelligence");
  fireEvent.change(screen.getByLabelText("Intelligence base score"), { target: { value: "10" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "witch-winter-witch");
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.type(screen.getByPlaceholderText("Name or effect"), "Snowball");
  const sourceCheckbox = screen.getByText("Snowball").closest("label")?.querySelector("input");
  assert.ok(sourceCheckbox);
  await user.click(sourceCheckbox);

  const row = screen.getAllByText("Snowball").map((element) => element.closest("article")).find(Boolean);
  assert.ok(row);
  assert.match(row?.textContent ?? "", /DC 13/);
  assert.match(row?.textContent ?? "", /Ice Magic: \+1 save DC/);
});
