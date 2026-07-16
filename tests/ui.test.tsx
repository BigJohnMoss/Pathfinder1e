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

test("saves and restores character details", async () => {
  const user = userEvent.setup();
  render(<Home />);
  const name = screen.getByLabelText("Character name");
  await user.type(name, "Kyra");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.clear(name);
  await user.type(name, "Changed");
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal((name as HTMLInputElement).value, "Kyra");
  assert.match(screen.getByText("Loaded saved character").textContent ?? "", /Loaded/);
});

test("applies ancestry modifiers and persists the selected ancestry", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Ancestry"), "elf");
  assert.ok(screen.getByText("Elf abilities"));
  const intelligence = screen.getByText("Intelligence").closest("label")?.querySelector("strong");
  const constitution = screen.getByText("Constitution").closest("label")?.querySelector("strong");
  assert.match(intelligence?.textContent ?? "", /12/);
  assert.match(constitution?.textContent ?? "", /8/);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Ancestry"), "dwarf");
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal((screen.getByLabelText("Ancestry") as HTMLSelectElement).value, "elf");
});

test("enforces the skill-rank pool through the interface", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "Skills" }));
  const climb = screen.getByText("Climb").closest("label")?.querySelector("input");
  assert.ok(climb);
  await user.clear(climb);
  await user.type(climb, "999");
  assert.equal((climb as HTMLInputElement).value, "16");
  assert.match(screen.getByText(/of 16 total ranks allocated/).textContent ?? "", /16 of 16/);
});

test("prevents duplicate feats and manages prepared spell counts", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "Spells" }));
  assert.match(screen.getByText(/Arcanist slots/).textContent ?? "", /3 1st-level \(2 base \+ 1 Intelligence\)/);
  assert.match(screen.getByText("Mage Armor").closest("article")?.textContent ?? "", /DC 12/);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
  await user.click(screen.getByRole("button", { name: "Feats" }));
  await user.selectOptions(screen.getByLabelText("Human bonus feat"), "combat-casting");
  const secondFeat = screen.getByLabelText("Feat 1");
  assert.equal((secondFeat.querySelector("option[value='combat-casting']") as HTMLOptionElement).disabled, true);
  assert.equal((secondFeat.querySelector("option[value='power-attack']") as HTMLOptionElement).disabled, true);
  assert.equal((secondFeat.querySelector("option[value='combat-reflexes']") as HTMLOptionElement).disabled, true);
  assert.equal((secondFeat.querySelector("option[value='two-weapon-fighting']") as HTMLOptionElement).disabled, true);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "1" } });
  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.click(screen.getByRole("button", { name: "Add Mage Armor" }));
  await user.click(screen.getByRole("button", { name: "Add Magic Missile" }));
  await user.click(screen.getByRole("button", { name: "Cast Mage Armor" }));
  assert.match(screen.getByText(/2\/3 1st-level/).textContent ?? "", /2\/3/);
  assert.equal((screen.getByRole("button", { name: "Add Shield" }) as HTMLButtonElement).disabled, true);
  assert.match(screen.getByText("Color Spray").closest("article")?.textContent ?? "", /level 1 · DC 12/);
  await user.click(screen.getByRole("button", { name: "Remove Magic Missile" }));
  await user.click(screen.getByRole("button", { name: "Add Mage Armor" }));
  assert.equal(screen.getByLabelText("Mage Armor prepared").textContent, "2");
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "0");
  await user.click(screen.getByRole("button", { name: "Add Detect Magic" }));
  await user.click(screen.getByRole("button", { name: "Add Light" }));
  await user.click(screen.getByRole("button", { name: "Add Mage Hand" }));
  await user.click(screen.getByRole("button", { name: "Add Ray of Frost" }));
  assert.equal((screen.getByRole("button", { name: "Add Read Magic" }) as HTMLButtonElement).disabled, true);
  await user.click(screen.getByRole("button", { name: "Spend reservoir point" }));
  assert.equal(screen.getByLabelText("Arcane Reservoir points").textContent, "2/4 reservoir");
  await user.click(screen.getByRole("button", { name: "Refresh day" }));
  assert.match(screen.getByText(/3\/3 1st-level/).textContent ?? "", /3\/3/);
  assert.equal(screen.getByLabelText("Arcane Reservoir points").textContent, "3/4 reservoir");
});

test("searches the spellbook and normalizes loaded prepared spells", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "Spells" }));
  await user.type(screen.getByLabelText("Search spells"), "magic missile");
  assert.ok(screen.getByRole("button", { name: "Add Magic Missile" }));
  await user.clear(screen.getByLabelText("Search spells"));
  localStorage.setItem("pf1e-character-draft", JSON.stringify({ name: "Arcanist", classId: "arcanist", level: 1, humanAbility: "intelligence", baseAbilities: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }, selectedFeatIds: [], skillRanks: {}, selectedOptions: {}, preparedSpells: ["mage-armor", "mage-armor", "magic-missile", "unknown"] }));
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal(screen.getByLabelText("Mage Armor prepared").textContent, "2");
  assert.equal(screen.getByLabelText("Magic Missile prepared").textContent, "0");
});

test("shows Fighter combat-feat and weapon-group choices when earned", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.click(screen.getByRole("button", { name: "Options" }));
  const combatFeat = screen.getAllByText("Bonus Combat Feat")[0].closest("label")?.querySelector("select");
  assert.ok(combatFeat);
  assert.ok([...combatFeat.options].some(option => option.text === "Improved Initiative"));
  assert.equal([...combatFeat.options].some(option => option.text === "Power Attack"), false);
  const weaponTraining = screen.getAllByText("Weapon Training 1")[0].closest("label")?.querySelector("select");
  assert.ok(weaponTraining);
  await user.selectOptions(weaponTraining, "weapon-group-bows");
  assert.match(screen.getByText("Gain the weapon training bonus with bows.").textContent ?? "", /bows/);
});

test("makes Monk available with its full-save progression", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "monk");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "4" } });
  await user.click(screen.getByRole("button", { name: "Features" }));
  assert.ok(screen.getByText("Ki Pool (Magic)"));
  await user.click(screen.getByRole("button", { name: "Basic info" }));
  assert.equal(screen.getByText("Fortitude").closest("article")?.querySelector("strong")?.textContent, "+4");
  assert.equal(screen.getByText("Reflex").closest("article")?.querySelector("strong")?.textContent, "+4");
  assert.equal(screen.getByText("Will").closest("article")?.querySelector("strong")?.textContent, "+4");
});

test("uses labelled icon tabs to show focused builder sections", async () => {
  const user = userEvent.setup();
  render(<Home />);
  assert.equal(screen.getByRole("button", { name: "Basic info" }).getAttribute("aria-current"), "page");
  await user.click(screen.getByRole("button", { name: "Storage" }));
  assert.ok(screen.getByText("Equipment and carried items"));
  await user.click(screen.getByRole("button", { name: "Actions" }));
  assert.ok(screen.getByText("Core statistics"));
});
