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
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("Seer displays bounded Natural Divination and level-aware prophecy actions", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  await user.selectOptions(screen.getByLabelText("Archetype"), "oracle-seer");
  await user.clear(screen.getByLabelText("Level"));
  await user.type(screen.getByLabelText("Level"), "9");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const saveDivination = screen.getByRole("button", { name: "Prepare save divination" }) as HTMLButtonElement;
  assert.equal(saveDivination.disabled, false);
  const prophecy = screen.getByLabelText("Enter prophetic trance mode") as HTMLSelectElement;
  assert.deepEqual(Array.from(prophecy.options).map((option) => option.textContent), ["Commune-equivalent knowledge"]);
});

test("Stargazer exposes its nightly metamagic and level-seven Star Chart", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  await user.selectOptions(screen.getByLabelText("Archetype"), "oracle-stargazer");
  await user.clear(screen.getByLabelText("Level"));
  await user.type(screen.getByLabelText("Level"), "7");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByLabelText("Invoke guiding star mode"));
  assert.ok(screen.getByRole("button", { name: "Consult star chart" }));
});
