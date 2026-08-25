import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let within: typeof import("@testing-library/react").within;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup, fireEvent, within } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("Buccaneer's inferred exotic pet appears at half effective level", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "gunslinger");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "gunslinger-buccaneer");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const manager = screen.getByRole("heading", { name: "Companion sheets" }).closest("section");
  assert.ok(manager);
  assert.match(within(manager).getByText("Exotic Pet (Ex)").closest("article")?.textContent ?? "", /familiar.*effective level 2/i);
});

test("Draconic Druid exposes its authored drake with automatic progression", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "druid-draconic-druid");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const manager = screen.getByRole("heading", { name: "Companion sheets" }).closest("section");
  assert.ok(manager);
  const card = within(manager).getByText("Drake companion").closest("article");
  assert.match(card?.textContent ?? "", /drake.*effective level 5/i);
  assert.match(card?.textContent ?? "", /d12 HD.*BAB.*natural armour.*drake powers/i);
});

test("Death Druid creates its phantom only after an emotional focus is selected", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "14" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "druid-death-druid");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  assert.equal(screen.queryByRole("heading", { name: "Companion sheets" }), null);
  await user.selectOptions(screen.getByLabelText(/Phantom/), "spiritualist-focus-dedication");
  const manager = screen.getByRole("heading", { name: "Companion sheets" }).closest("section");
  assert.ok(manager);
  const card = within(manager).getByText("Dedication phantom").closest("article");
  assert.match(card?.textContent ?? "", /phantom.*effective level 14/i);
  assert.match(card?.textContent ?? "", /11 d10 HD.*BAB.*2 × 2d6 slams/i);
  assert.match(card?.textContent ?? "", /Etheric Tether limits the manifested phantom to 50 feet/i);
});

test("Oceanrider filters aquatic mounts by rider size and shows the selected mount rules", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "cavalier");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "6" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "cavalier-oceanrider");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const mountPicker = screen.getByLabelText(/Aquatic Mount/);
  assert.deepEqual(within(mountPicker).getAllByRole("option").map((option) => option.textContent), ["Choose an option", "Seahorse", "Orca"]);
  assert.equal(screen.queryByRole("heading", { name: "Companion sheets" }), null);
  await user.selectOptions(mountPicker, "oceanrider-mount-orca");
  const manager = screen.getByRole("heading", { name: "Companion sheets" }).closest("section");
  assert.ok(manager);
  const card = within(manager).getByText("Orca aquatic mount").closest("article");
  assert.match(card?.textContent ?? "", /mount.*effective level 6/i);
  assert.match(card?.textContent ?? "", /starts at size Large.*before level 7/i);

  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  await user.selectOptions(screen.getByLabelText("Ancestry"), "halfling");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.deepEqual(within(screen.getByLabelText(/Aquatic Mount/)).getAllByRole("option").map((option) => option.textContent), ["Choose an option", "Dolphin"]);
});
