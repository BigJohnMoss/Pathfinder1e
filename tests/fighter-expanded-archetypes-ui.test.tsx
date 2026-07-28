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
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("expanded Fighter archetypes are selectable, complete through level 20, and persistent", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  const archetype = screen.getByLabelText("Archetype");
  for (const value of ["fighter-crossbowman", "fighter-two-handed-fighter", "fighter-two-weapon-warrior"]) {
    assert.ok(archetype.querySelector(`option[value='${value}']`));
  }
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  await user.selectOptions(archetype, "fighter-crossbowman");
  assert.ok(screen.getByText("Deadshot"));
  assert.ok(screen.getByText("Penetrating Shot"));
  assert.match(screen.getByText("Weapon Mastery").closest("li")?.textContent ?? "", /crossbow/);

  await user.selectOptions(archetype, "fighter-two-handed-fighter");
  assert.ok(screen.getByText("Overhand Chop"));
  assert.ok(screen.getByText("Devastating Blow"));
  const weaponTrainingFeature = screen.getAllByText("Weapon Training 1").find((element) => element.tagName === "STRONG");
  assert.match(weaponTrainingFeature?.closest("li")?.textContent ?? "", /two-handed melee weapons/);

  await user.selectOptions(archetype, "fighter-two-weapon-warrior");
  assert.ok(screen.getByText("Defensive Flurry +1"));
  assert.ok(screen.getByText("Deadly Defense"));
  assert.equal(screen.queryByText("Armor Training 1"), null);
  await user.click(screen.getByRole("button", { name: "Save" }));
  assert.equal(JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}").archetypeId, "fighter-two-weapon-warrior");
});

test("specialist Fighter archetypes expose their defining level-20 progressions", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  const archetype = screen.getByLabelText("Archetype");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  await user.selectOptions(archetype, "fighter-free-hand-fighter");
  assert.ok(screen.getByText("Deceptive Strike +1"));
  assert.ok(screen.getByText("Reversal"));

  await user.selectOptions(archetype, "fighter-mobile-fighter");
  assert.ok(screen.getByText("Rapid Attack"));
  assert.ok(screen.getByText("Whirlwind Blitz"));
  assert.ok(screen.getByText("Armor Training 1"));

  await user.selectOptions(archetype, "fighter-polearm-master");
  assert.ok(screen.getByText("Pole Fighting -4"));
  assert.ok(screen.getByText("Polearm Parry"));
  assert.match(screen.getByText("Weapon Mastery").closest("li")?.textContent ?? "", /spear or polearm/);

  await user.selectOptions(archetype, "fighter-weapon-master");
  assert.ok(screen.getByText("Weapon Guard +1"));
  assert.ok(screen.getByText("Unstoppable Strike"));
  await user.click(screen.getByRole("button", { name: "Save" }));
  assert.equal(JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}").archetypeId, "fighter-weapon-master");
});
