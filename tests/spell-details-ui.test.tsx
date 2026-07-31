import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let SpellDetails: typeof import("../apps/web/app/spell-details").SpellDetails;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ SpellDetails } = await import("../apps/web/app/spell-details"));
});
test.afterEach(() => cleanup());

test("shows full spell statistics, description, and the external rules source", () => {
  render(<SpellDetails spell={{ id: "alarm", name: "Alarm", levelByClass: { wizard: 1 }, summary: "Wards an area.", school: "abjuration", castingTime: "1 standard action", components: ["V", "S", "F/DF"], range: "close", target: "20-ft.-radius emanation", duration: "2 hours/level", savingThrow: "none", spellResistance: "no", description: "Alarm sounds an audible or mental warning when its ward is entered.", source: { title: "Core Rulebook", page: 240, url: "https://www.aonprd.com/SpellDisplay.aspx?ItemName=Alarm" } }} />);
  assert.ok(screen.getByText("View full rules"));
  assert.ok(screen.getByText("1 standard action"));
  assert.match(screen.getByText(/Alarm sounds/).textContent ?? "", /mental warning/);
  const source = screen.getByRole("link", { name: /Rules source · Core Rulebook p\. 240/ });
  assert.equal(source.getAttribute("href"), "https://www.aonprd.com/SpellDisplay.aspx?ItemName=Alarm");
});
