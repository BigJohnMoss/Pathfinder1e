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

const selectBard = async (archetypeId: string, level = 20) => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: String(level) } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
};

test("Buccaneer renders surrender and Knock Out controls at their correct levels", async () => {
  await selectBard("bard-buccaneer");
  assert.ok(screen.getByRole("button", { name: "Use Hilt Bash for nonlethal damage" }));
  assert.ok(screen.getByRole("button", { name: "Perform Song of Surrender" }));
  assert.ok(screen.getByRole("button", { name: "Mark a Knock Out target" }));
  assert.ok(screen.getByRole("button", { name: "Perform Mass Song of Surrender" }));
  assert.ok(screen.getByLabelText("Bard Knock Out remaining"));
});

test("both Ringleaders render their plan workflows and limited pools", async () => {
  await selectBard("bard-ringleader-ag");
  assert.ok(screen.getByRole("button", { name: "Prepare a Cunning Plan" }));
  assert.ok(screen.getByRole("button", { name: "Trigger a Cunning Plan" }));
  assert.ok(screen.getByRole("button", { name: "Extend a triggered plan" }));
  cleanup(); localStorage.clear();
  await selectBard("bard-ringleader-ui");
  assert.ok(screen.getByRole("button", { name: "Begin enhanced Inspire Competence" }));
  assert.ok(screen.getByRole("button", { name: "Prepare an Inspired Plan" }));
  assert.ok(screen.getByRole("button", { name: "Reveal a Prepared item" }));
  assert.ok(screen.getByLabelText("Bard Prepared remaining"));
});

test("Hatharat Agent renders favor and truth-compulsion workflows", async () => {
  await selectBard("bard-hatharat-agent");
  assert.ok(screen.getByRole("button", { name: "Call in a Hatharat favor" }));
  assert.ok(screen.getByRole("button", { name: "Begin Master of Manipulation" }));
});
