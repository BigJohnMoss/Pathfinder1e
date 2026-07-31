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
