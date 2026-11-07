import test, { before, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, fireEvent, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

afterEach(() => { cleanup(); localStorage.clear(); });

test("totem shaman actions are usable from the Features tab", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  await user.selectOptions(screen.getByLabelText("Archetype"), "druid-bear-shaman");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "13" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByRole("button", { name: "Activate Totem Transformation" }));
  assert.ok(screen.getByRole("button", { name: "Speak with bears" }));
  assert.ok(screen.getByRole("button", { name: "Resolve Totemic Summons" }));
  assert.ok(screen.getByRole("button", { name: "Assume Shaman Wild Shape" }));
  assert.equal(screen.getAllByLabelText(/Bonus Feat/).length >= 2, true);
});
