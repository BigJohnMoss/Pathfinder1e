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

test("Pack Rager exposes five slots containing only combat teamwork feats", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "barbarian");
  await user.selectOptions(screen.getByLabelText("Archetype"), "barbarian-pack-rager");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "18" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const slots = [2, 6, 10, 14, 18].map((level) => screen.getByLabelText(`Bonus Feat level ${level}`) as HTMLSelectElement);
  assert.equal(slots.length, 5);
  for (const slot of slots) {
    const names = [...slot.options].map((option) => option.text);
    assert.ok(names.includes("Coordinated Maneuvers"));
    assert.equal(names.includes("Allied Spellcaster"), false);
    assert.equal(names.includes("Power Attack"), false);
  }
});
