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

const openDrovier = async (level: number) => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  await user.selectOptions(screen.getByLabelText("Archetype"), "druid-drovier");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: String(level) } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  return user;
};

test("Drovier offers only Animal, Eagle, and Wolf domains", async () => {
  const user = await openDrovier(4);
  const bond = screen.getByLabelText(/Nature(?:'s)? Bond.*level 1/) as HTMLSelectElement;
  assert.deepEqual(Array.from(bond.options).filter((option) => option.value).map((option) => option.value), ["druid-nature-bond-domain"]);
  await user.selectOptions(bond, "druid-nature-bond-domain");
  const domains = screen.getByLabelText("Nature Domain level 1") as HTMLSelectElement;
  assert.deepEqual(Array.from(domains.options).filter((option) => option.value).map((option) => option.value), [
    "domain-animal", "domain-eagle", "domain-wolf",
  ]);
});

test("Drovier shows a bounded pool at level 4 and an at-will action at level 20", async () => {
  await openDrovier(4);
  assert.equal(screen.getByLabelText("Druid Communal Aspect remaining").textContent, "4/4 10-minute increment remaining");
  assert.ok(screen.getByRole("button", { name: "Grant Communal Aspect" }));
  let modes = screen.getByLabelText("Animal aspect") as HTMLSelectElement;
  assert.deepEqual(Array.from(modes.options).map((option) => option.textContent), ["Frog", "Gorilla", "Monkey", "Otter", "Raccoon", "Raptor", "Tree Lizard"]);

  cleanup();
  localStorage.clear();
  await openDrovier(20);
  assert.equal(screen.getByLabelText("Druid Communal Aspect remaining").textContent, "At will");
  assert.equal(screen.queryByRole("button", { name: "Spend 1 10-minute increment" }), null);
  modes = screen.getByLabelText("Animal aspect") as HTMLSelectElement;
  assert.ok(Array.from(modes.options).some((option) => option.textContent === "Aspect of the Wolf"));
});
