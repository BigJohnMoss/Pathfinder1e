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

test("Armor Master applies its shield-capped touch AC and armor defenses in play", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  await user.selectOptions(screen.getByLabelText("Archetype"), "fighter-armor-master");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Storage" }));
  await user.selectOptions(screen.getByLabelText("Equipment catalogue"), "full-plate");
  await user.click(screen.getByLabelText("Equipped"));
  await user.selectOptions(screen.getByLabelText("Equipment catalogue"), "heavy-steel-shield");
  await user.click(screen.getAllByLabelText("Equipped").at(-1)!);
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.match(screen.getByText("AC / touch / flat-footed").closest("div")?.textContent ?? "", /21 \/ 12 \/ 21/);
  assert.equal(screen.getAllByText("DR 12/—").length, 1);
  assert.equal(screen.queryByText("+1 Touch Armor Class"), null);
  assert.ok(screen.getByText("Fortification 75% (moderate)"));
  assert.ok(screen.getByText("Immune to critical hits and sneak attacks"));
  assert.ok(screen.getByText("Equipped armor cannot be sundered"));
});

test("Molthuni Defender exposes four distinct maneuver choices and resolves their bonuses", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  await user.selectOptions(screen.getByLabelText("Archetype"), "fighter-molthuni-defender");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "15" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const first = screen.getByLabelText("Armored Defense (Ex) level 3") as HTMLSelectElement;
  await user.selectOptions(first, "molthuni-trip");
  const second = screen.getByLabelText("Armored Defense maneuver 2 level 7") as HTMLSelectElement;
  assert.equal([...second.options].some((option) => option.value === "molthuni-trip"), false);
  await user.selectOptions(second, "molthuni-grapple");
  await user.click(screen.getByRole("tab", { name: "Storage" }));
  await user.selectOptions(screen.getByLabelText("Equipment catalogue"), "full-plate");
  await user.click(screen.getByLabelText("Equipped"));
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByText("+6 CMD"));
  assert.ok(screen.getByText("+6 Acrobatics DC through threatened squares"));
  assert.ok(screen.getByText("+2 Trip CMB"));
  assert.ok(screen.getByText("+2 Grapple CMB"));
});
