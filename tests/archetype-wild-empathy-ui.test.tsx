import assert from "node:assert/strict";
import test from "node:test";
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

test("specialist Wild Empathy is rollable with its target and action", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  await user.selectOptions(screen.getByLabelText("Archetype"), "druid-ape-shaman");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  assert.ok(screen.getByRole("button", { name: /Wild Empathy - animals roll, modifier \+1/i }));
  const specialist = screen.getByRole("button", { name: /Wild Empathy - apes and other primates roll, modifier \+5/i });
  await user.click(specialist);
  assert.ok(screen.getByText(/Wild Empathy - full-round action/i));
});
