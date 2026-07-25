import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let waitFor: typeof import("@testing-library/react").waitFor;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, waitFor } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

const optionSelect = (name: string) => {
  const select = screen.getAllByText(name).at(-1)?.closest("label")?.querySelector("select");
  assert.ok(select, `${name} select`);
  return select;
};

test("Paladin configures unique prerequisite-aware mercies and a persistent Divine Bond", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "paladin");
  await user.clear(screen.getByLabelText("Level"));
  await user.type(screen.getByLabelText("Level"), "9");
  await user.click(screen.getByRole("button", { name: "Features" }));

  const firstMercy = optionSelect("Mercy 1");
  const secondMercy = optionSelect("Mercy 2");
  const thirdMercy = optionSelect("Mercy 3");
  const divineBond = optionSelect("Divine Bond");
  assert.equal([...thirdMercy.options].some((option) => option.value === "paladin-mercy-exhausted"), false);

  await user.selectOptions(firstMercy, "paladin-mercy-fatigued");
  await waitFor(() => assert.equal([...thirdMercy.options].some((option) => option.value === "paladin-mercy-exhausted"), true));
  assert.equal([...secondMercy.options].some((option) => option.value === "paladin-mercy-fatigued"), false);
  await user.selectOptions(secondMercy, "paladin-mercy-dazed");
  await user.selectOptions(thirdMercy, "paladin-mercy-exhausted");
  await user.selectOptions(divineBond, "paladin-divine-bond-mount");
  assert.ok(screen.getByText("Celestial Template"));
  assert.ok(screen.getByText("Spell Resistance"));

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "paladin"));
  await user.click(screen.getByRole("button", { name: "Features" }));
  assert.equal(optionSelect("Mercy 1").value, "paladin-mercy-fatigued");
  assert.equal(optionSelect("Mercy 2").value, "paladin-mercy-dazed");
  assert.equal(optionSelect("Mercy 3").value, "paladin-mercy-exhausted");
  assert.equal(optionSelect("Divine Bond").value, "paladin-divine-bond-mount");
});
