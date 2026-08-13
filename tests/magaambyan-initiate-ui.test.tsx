import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let waitFor: typeof import("@testing-library/react").waitFor;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, fireEvent, waitFor } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

const chooseFeat = async (user: ReturnType<typeof userEvent.setup>, slotName: string, featName: string) => {
  await user.click(screen.getByRole("button", { name: new RegExp(`^(Choose|Replace) ${slotName}$`) }));
  const search = screen.getByRole("searchbox", { name: "Search feats" });
  await user.clear(search);
  await user.type(search, featName);
  const featHeading = screen.getByText(featName, { selector: "summary strong", exact: true });
  await user.click(featHeading);
  const chooseButton = [...(featHeading.closest("details")?.querySelectorAll("button") ?? [])].find((button) => button.textContent === `Choose for ${slotName}`);
  assert.ok(chooseButton);
  await user.click(chooseButton);
};

test("Magaambyan Initiate enforces good alignment and manages repeatable Spell Mastery", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "arcanist");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  const alignment = screen.getByLabelText("Alignment") as HTMLSelectElement;
  assert.ok([...alignment.options].some((option) => option.value === "neutral-good"));
  await user.selectOptions(alignment, "neutral-good");
  await user.selectOptions(screen.getByLabelText("Archetype"), "arcanist-magaambyan-initiate");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  assert.ok([...screen.getByLabelText("Halcyon Spell Lore (Su) level 1").querySelectorAll("option")].some((option) => option.textContent === "Blessed Fist"));

  await user.click(screen.getByRole("tab", { name: "Feats" }));
  await chooseFeat(user, "Human bonus feat", "Spell Mastery");
  await chooseFeat(user, "Feat 1", "Spell Mastery");

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.equal(screen.getByLabelText("Spell Mastery selections").textContent, "0/3 mastered");
  await user.type(screen.getByLabelText("Search Spell Mastery spells"), "Magic Missile");
  await user.click(screen.getByRole("button", { name: "Master Magic Missile" }));
  await waitFor(() => assert.equal(screen.getByLabelText("Spell Mastery selections").textContent, "1/3 mastered"));
  assert.ok(screen.getByText(/Magic Missile · 1st-level/));

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("button", { name: "Reset" }));
  await user.click(screen.getByRole("button", { name: "Load" }));
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await waitFor(() => assert.equal(screen.getByLabelText("Spell Mastery selections").textContent, "1/3 mastered"));
  assert.ok(screen.getByText(/Magic Missile · 1st-level/));
});
