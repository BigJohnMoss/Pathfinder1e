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
  assert.equal(JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}").version, 1);
});

test("imports a versioned character file and rejects unsupported versions", async () => {
  render(<Home />);
  const input = screen.getByLabelText("Import character file");
  const valid = { size: 500, text: async () => JSON.stringify({ version: 1, name: "Imported Kyra", classId: "cleric", ancestryId: "human", level: 3, humanAbility: "wisdom", baseAbilities: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 16, charisma: 12 }, selectedFeatIds: [], selectedFeatChoices: {}, skillRanks: {}, selectedOptions: {}, preparedSpells: [], spellSlotUses: {}, arcaneReservoir: null }) };
  fireEvent.change(input, { target: { files: [valid] } });
  assert.equal(await screen.findByDisplayValue("Imported Kyra").then((element) => (element as HTMLInputElement).value), "Imported Kyra");
  assert.match(screen.getByText("Imported character").textContent ?? "", /Imported/);

  const unsupported = { size: 100, text: async () => JSON.stringify({ ...valid, version: 2 }) };
  fireEvent.change(input, { target: { files: [unsupported] } });
  assert.ok(await screen.findByText("Unsupported character file version"));
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

test("tracks point-buy costs and applies earned ability increases", async () => {
  const user = userEvent.setup();
  render(<Home />);
  assert.match(screen.getByText(/of 15 points spent/).textContent ?? "", /15 remaining/);
  const strength = screen.getByLabelText("Strength base score");
  await user.clear(strength);
  await user.type(strength, "18");
  assert.match(screen.getByText(/of 15 points spent/).textContent ?? "", /2 overspent/);
  await user.selectOptions(screen.getAllByText("Point-buy budget").at(-1)!.closest("label")?.querySelector("select") as HTMLSelectElement, "20");
  assert.match(screen.getByText(/of 20 points spent/).textContent ?? "", /3 remaining/);

  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "4" } });
  const increase = await screen.findByLabelText("Level 4 ability increase");
  await user.selectOptions(increase, "dexterity");
  const dexterityTotal = screen.getByLabelText("Dexterity base score").closest("label")?.querySelector("strong");
  assert.match(dexterityTotal?.textContent ?? "", /11/);

  await user.click(screen.getByRole("button", { name: "Save" }));
  assert.equal(JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}").abilityBoosts[0], "dexterity");
});

test("enforces the skill-rank pool through the interface", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "Skills" }));
  assert.equal(screen.getAllByText("Class skill").length > 0, true);
  assert.ok(screen.getByLabelText("4 skill ranks remaining"));
  const climb = screen.getByLabelText("Climb ranks");
  assert.ok(climb);
  await user.clear(climb);
  await user.type(climb, "999");
  assert.equal((climb as HTMLInputElement).value, "1");
  assert.ok(screen.getByLabelText("3 skill ranks remaining"));
  assert.match(screen.getByText(/Invest up to 1 rank/).textContent ?? "", /class skills receive a \+3 bonus/);
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
  assert.equal((secondFeat.querySelector("option[value='leadership']") as HTMLOptionElement).disabled, true);
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
  await user.click(screen.getByRole("button", { name: "Features" }));
  const combatFeat = screen.getAllByText("Bonus Combat Feat").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(combatFeat);
  assert.ok([...combatFeat.options].some(option => option.text === "Improved Initiative"));
  assert.equal([...combatFeat.options].some(option => option.text === "Power Attack"), false);
  const weaponTraining = screen.getAllByText("Weapon Training 1").at(-1)!.closest("label")?.querySelector("select");
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

test("makes Wizard selectable with prepared arcane spells and class features", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("button", { name: "Features" }));
  assert.ok(screen.getAllByText("Arcane Bond").length >= 2);
  assert.ok(screen.getAllByText("Arcane School").length >= 2);
  assert.ok(screen.getByText("Spellbook"));
  assert.ok(screen.getByText("Scribe Scroll"));

  await user.click(screen.getByRole("button", { name: "Spells" }));
  assert.match(screen.getByText(/Wizard slots/).textContent ?? "", /2 1st-level \(1 base \+ 1 Intelligence\)/);
  assert.ok(screen.getByRole("button", { name: "Add Magic Missile" }));
  assert.equal(screen.queryByLabelText("Arcane Reservoir points"), null);

  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.click(screen.getByRole("button", { name: "Features" }));
  assert.ok(screen.getByText("Wizard Bonus Feat"));
});

test("guides Wizard school and opposition school choices", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("button", { name: "Features" }));

  const school = screen.getAllByText("Arcane School").at(-1)!.closest("label")?.querySelector("select");
  const firstOpposition = screen.getAllByText("First Opposition School").at(-1)!.closest("label")?.querySelector("select");
  const secondOpposition = screen.getAllByText("Second Opposition School").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(school);
  assert.ok(firstOpposition);
  assert.ok(secondOpposition);
  assert.equal(firstOpposition.disabled, true);
  assert.equal(firstOpposition.options[0].text, "Choose an arcane school first");

  await user.selectOptions(school, "wizard-school-evocation");
  assert.ok(screen.getByText("Intense Spells"));
  assert.ok(screen.getByText("Force Missile"));
  assert.ok(screen.getByText("Elemental Wall"));
  assert.equal(firstOpposition.disabled, false);
  assert.equal([...firstOpposition.options].some((option) => option.value === "wizard-opposition-evocation"), false);

  await user.selectOptions(firstOpposition, "wizard-opposition-abjuration");
  assert.equal((secondOpposition.querySelector("option[value='wizard-opposition-abjuration']") as HTMLOptionElement).disabled, true);
  await user.selectOptions(secondOpposition, "wizard-opposition-conjuration");
  assert.equal(firstOpposition.value, "wizard-opposition-abjuration");
  assert.equal(secondOpposition.value, "wizard-opposition-conjuration");

  await user.selectOptions(school, "wizard-school-universalist");
  assert.ok(screen.getByText("Hand of the Apprentice"));
  assert.ok(screen.getByText("Metamagic Mastery"));
  assert.equal(firstOpposition.disabled, true);
  assert.equal(secondOpposition.disabled, true);
  assert.equal(firstOpposition.value, "");
  assert.equal(secondOpposition.value, "");
  assert.equal(firstOpposition.options[0].text, "Universalists have no opposition schools");
});

test("uses labelled icon tabs to show focused builder sections", async () => {
  const user = userEvent.setup();
  render(<Home />);
  assert.equal(screen.getByRole("button", { name: "Basic info" }).getAttribute("aria-current"), "page");
  await user.click(screen.getByRole("button", { name: "Storage" }));
  assert.ok(screen.getByText("Equipment and carried items"));
  await user.click(screen.getByRole("button", { name: "Actions" }));
  assert.ok(screen.getByText("Core statistics"));
  await user.click(screen.getByRole("button", { name: "Features" }));
  assert.ok(screen.getByText("Arcanist features"));
  assert.ok(screen.getByText("Configure class features"));
  await user.click(screen.getByRole("button", { name: "Options" }));
  assert.ok(screen.getByText("Reserved for future character options"));
  assert.equal(screen.queryByText("Configure class features"), null);
});
