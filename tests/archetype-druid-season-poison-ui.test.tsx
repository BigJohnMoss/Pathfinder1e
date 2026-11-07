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

const selectDruid = async (archetypeId: string, level: number, ancestryId = "human") => {
  const user = userEvent.setup();
  render(<Home />);
  if (ancestryId !== "human") await user.selectOptions(screen.getByLabelText("Ancestry"), ancestryId);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: String(level) } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
};

test("Mantella exposes its poisonous form and poison storage workflow", async () => {
  await selectDruid("druid-mantella", 20);
  assert.ok(screen.getByRole("button", { name: "Assume Poisonous Wild Shape" }));
  assert.ok(screen.getByRole("button", { name: "Absorb Exposed Poison" }));
  assert.ok(screen.getByRole("button", { name: "Secrete Stored Poison" }));
});

test("Season Keeper exposes seasonal choice, healing rider, and legal forms", async () => {
  await selectDruid("druid-season-keeper", 20, "triaxian");
  assert.ok(screen.getByRole("button", { name: "Imbue Seasonal Spirit" }));
  assert.ok(screen.getByRole("button", { name: "Apply Greater Summer Healing Rider" }));
  assert.ok(screen.getByRole("button", { name: "Assume Summer Plant Shape" }));
  assert.ok(screen.getByRole("button", { name: "Assume Winter Ice Elemental Shape" }));
  assert.ok(screen.getByRole("button", { name: "Assume Other Permitted Shape" }));
});
