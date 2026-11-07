import test from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { JSDOM } from "jsdom";
import { CompanionManager } from "../apps/web/app/companion-manager";
import type { CharacterDraftV1 } from "../packages/types/src/index.js";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
});
test.afterEach(() => cleanup());

test("companion sheets show level-scaled statistics and retain editable play state", async () => {
  const user = userEvent.setup();
  let latest: NonNullable<CharacterDraftV1["companions"]> = {};
  function Harness() {
    const [states, setStates] = useState<NonNullable<CharacterDraftV1["companions"]>>({});
    return <CompanionManager companions={[{ id: "familiar", kind: "familiar", optionId: "wizard-familiar-cat", label: "Cat", effectiveLevel: 13 }]} states={states} masterHitPoints={41} onChange={value => { latest = value; setStates(value); }} />;
  }
  render(<Harness />);
  assert.ok(screen.getByText("20", { selector: "b" }));
  assert.ok(screen.getByText("Scry on familiar"));
  await user.type(screen.getByLabelText("Name"), "Miso");
  await user.type(screen.getByLabelText("Current HP"), "17");
  assert.equal(latest.familiar.name, "Miso");
  assert.equal(latest.familiar.currentHitPoints, 17);
});

test("phantom sheets show progression, emotional focus, and Death Druid rules", () => {
  render(<CompanionManager companions={[{
    id: "death-druid-phantom",
    kind: "phantom",
    optionId: "spiritualist-focus-dedication",
    label: "Dedication phantom",
    effectiveLevel: 14,
    rules: ["Etheric Tether limits the manifested phantom to 50 feet from the death druid."],
  }]} states={{}} masterHitPoints={60} onChange={() => {}} />);
  assert.ok(screen.getByText("Dedication phantom"));
  assert.ok(screen.getByText("11", { selector: "b" }));
  assert.ok(screen.getByText("2 × 2d6", { exact: false }));
  assert.ok(screen.getByText(/Diplomacy and Sense Motive each gain 11 ranks/));
  assert.ok(screen.getByText(/Defending Aura \(level 7\)/));
  assert.ok(screen.getByText(/Devoted Servant \(level 12\)/));
  assert.ok(screen.getByText("Etheric Tether limits the manifested phantom to 50 feet from the death druid."));
  assert.ok(screen.getByText("Deliver touch spells (50 feet)"));
  assert.ok(screen.getByText("Incorporeal flight"));
});
