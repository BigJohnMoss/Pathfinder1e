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
  const library = JSON.parse(localStorage.getItem("pf1e-character-library") ?? "{}");
  assert.equal(library.version, 1);
  assert.equal(library.characters.length, 1);
  assert.equal(library.characters[0].draft.name, "Kyra");
});

test("migrates the previous single save into the character library", async () => {
  const legacy = { version: 1, name: "Legacy Kyra", classId: "cleric", ancestryId: "human", level: 3, humanAbility: "wisdom", baseAbilities: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 16, charisma: 12 }, pointBuyBudget: 15, abilityBoosts: [], selectedFeatIds: [], selectedTraitIds: [], selectedTraitChoices: {}, selectedFeatChoices: {}, skillRanks: {}, selectedOptions: {}, preparedSpells: [], spellSlotUses: {}, arcaneReservoir: null, bardicPerformanceUsed: 0, wildShapeUsed: 0, inventory: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } };
  localStorage.setItem("pf1e-character-draft", JSON.stringify(legacy));
  render(<Home />);
  assert.ok(await screen.findByText("Your previous save was added to the character library"));
  await userEvent.click(screen.getByRole("tab", { name: "Storage" }));
  assert.ok(screen.getByText("Legacy Kyra"));
  assert.equal(JSON.parse(localStorage.getItem("pf1e-character-library") ?? "{}").characters.length, 1);
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

test("allows a mobile ability score to be cleared before entering one digit", async () => {
  const user = userEvent.setup();
  render(<Home />);
  const strength = screen.getByLabelText("Strength base score") as HTMLInputElement;

  await user.clear(strength);
  assert.equal(strength.value, "");
  await user.type(strength, "8");

  assert.equal(strength.value, "8");
  assert.match(strength.closest("label")?.querySelector("strong")?.textContent ?? "", /^8 -1$/);
});

test("allows an ability score input to remain empty after it loses focus", async () => {
  const user = userEvent.setup();
  render(<Home />);
  const strength = screen.getByLabelText("Strength base score") as HTMLInputElement;

  await user.clear(strength);
  await user.tab();

  assert.equal(strength.value, "");
  assert.match(strength.closest("label")?.querySelector("strong")?.textContent ?? "", /^10 \+0$/);
});

test("increases and decreases ability scores with mobile stepper buttons", async () => {
  const user = userEvent.setup();
  render(<Home />);
  const strength = screen.getByLabelText("Strength base score") as HTMLInputElement;

  await user.click(screen.getByRole("button", { name: "Increase Strength score" }));
  assert.equal(strength.value, "11");
  await user.click(screen.getByRole("button", { name: "Decrease Strength score" }));
  assert.equal(strength.value, "10");

  await user.clear(strength);
  await user.click(screen.getByRole("button", { name: "Increase Strength score" }));
  assert.equal(strength.value, "11");
});

test("allocates and persists favored class hit points and skill ranks", async () => {
  const user = userEvent.setup();
  render(<Home />);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
  const baseSkillRanks = Number(
    screen.getByText("Skill ranks").closest("article")?.querySelector("strong")?.textContent,
  );
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  const baseHitPoints = Number(screen.getByText("Average HP").closest("div")?.querySelector("dd")?.textContent);
  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  fireEvent.change(screen.getByLabelText("Favored class bonus hit points"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Favored class bonus skill ranks"), { target: { value: "2" } });
  assert.match(document.querySelector(".favored-class-bonus .hint")?.textContent ?? "", /3 of 3 favored-class bonuses assigned/);
  assert.equal(
    Number(screen.getByText("Skill ranks").closest("article")?.querySelector("strong")?.textContent),
    baseSkillRanks + 2,
  );
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.equal(
    Number(screen.getByText("Average HP").closest("div")?.querySelector("dd")?.textContent),
    baseHitPoints + 1,
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  const saved = JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}");
  assert.equal(saved.favoredClassHitPoints, 1);
  assert.equal(saved.favoredClassSkillRanks, 2);
});

test("quick-allocates favored class bonuses and clamps them when level falls", async () => {
  const user = userEvent.setup();
  render(<Home />);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("button", { name: "Assign remaining to skill ranks" }));
  assert.equal((screen.getByLabelText("Favored class bonus skill ranks") as HTMLInputElement).value, "20");
  assert.match(document.querySelector(".favored-class-bonus .hint")?.textContent ?? "", /20 of 20 favored-class bonuses assigned/);

  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
  await waitFor(() => assert.equal((screen.getByLabelText("Favored class bonus skill ranks") as HTMLInputElement).value, "3"));
  await user.click(screen.getByRole("button", { name: "Clear bonuses" }));
  assert.equal((screen.getByLabelText("Favored class bonus skill ranks") as HTMLInputElement).value, "0");
  assert.match(document.querySelector(".favored-class-bonus .hint")?.textContent ?? "", /0 of 3 favored-class bonuses assigned/);
});

test("builds, calculates, and restores a multiclass character", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "wizard");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "8" } });

  assert.equal(screen.getByText("BAB").closest("article")?.querySelector("strong")?.textContent, "+16");
  assert.equal(screen.getByText("Fortitude").closest("article")?.querySelector("strong")?.textContent, "+10");
  assert.equal(screen.getByText("Reflex").closest("article")?.querySelector("strong")?.textContent, "+6");
  assert.equal(screen.getByText("Will").closest("article")?.querySelector("strong")?.textContent, "+10");

  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByRole("heading", { name: "Fighter 12 / Wizard 8 features" }));
  assert.ok(screen.getAllByText(/Armor Training/).length > 0);
  assert.ok(screen.getAllByText("Arcane School").length > 0);
  await user.selectOptions(screen.getByLabelText("Arcane School level 1"), "wizard-school-universalist");

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.ok(screen.getByRole("heading", { name: "Prepared spells" }));
  assert.ok(screen.getByText(/Wizard slots:/));
  assert.equal(screen.queryByLabelText("Spellcasting class"), null);
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await user.type(screen.getByLabelText("Search spells"), "mage armor");
  await user.click(screen.getByRole("button", { name: "Add Mage Armor" }));
  assert.equal(screen.getByLabelText("Mage Armor prepared").textContent, "1");

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Additional class"), "");
  assert.equal(screen.queryByLabelText("Additional class levels"), null);
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Additional class") as HTMLSelectElement).value, "wizard"));
  assert.equal((screen.getByLabelText("Additional class levels") as HTMLInputElement).value, "8");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal((screen.getByLabelText("Arcane School level 1") as HTMLSelectElement).value, "wizard-school-universalist");
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.ok(screen.getByText(/Wizard slots:/));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await user.type(screen.getByLabelText("Search spells"), "mage armor");
  assert.equal(screen.getByLabelText("Mage Armor prepared").textContent, "1");
});

test("unlocks multiclassing at level 2 and can start a new class through level up", async () => {
  const user = userEvent.setup();
  render(<Home />);
  assert.equal(screen.queryByLabelText("Additional class"), null);
  assert.ok(screen.getByText("Multiclassing unlocks at level 2"));

  await user.click(screen.getByRole("button", { name: "Review level 2" }));
  await user.selectOptions(screen.getByLabelText("Class receiving this level"), "rogue");
  assert.ok(screen.getByRole("heading", { name: "Review Rogue level 1" }));
  await user.click(screen.getByRole("button", { name: "Advance to level 2" }));

  assert.equal((screen.getByLabelText("Level") as HTMLInputElement).value, "2");
  assert.equal((screen.getByLabelText("Additional class") as HTMLSelectElement).value, "rogue");
  assert.equal((screen.getByLabelText("Additional class levels") as HTMLInputElement).value, "1");
  assert.match(screen.getByText(/2 total levels/).textContent ?? "", /1 in your starting class/);
});

test("removes impossible multiclass allocations when total level is lowered", async () => {
  const user = userEvent.setup();
  render(<Home />);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "6" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "wizard");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "4" } });

  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "1" } });
  await waitFor(() => assert.equal(screen.queryByLabelText("Additional class"), null));
  assert.ok(screen.getByText("Multiclassing unlocks at level 2"));
});

test("allocates ancestry-specific favored class rewards and applies daily resources", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  await user.selectOptions(screen.getByLabelText("Ancestry"), "gnome");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("Bardic performance favored class allocation"), { target: { value: "3" } });
  assert.match(document.querySelector(".favored-class-bonus > p.hint")?.textContent ?? "", /3 of 3 favored-class bonuses assigned/);
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal(screen.getByLabelText("Performance rounds remaining").textContent, "12/12 round remaining");
  await user.click(screen.getByRole("button", { name: "Save" }));
  const saved = JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}");
  assert.deepEqual(saved.favoredClassAlternateBonuses, { "gnome-bard-performance": 3 });
});

test("adds Arcane Archer only as a capped prestige class and shows its entry requirements", async () => {
  const user = userEvent.setup();
  render(<Home />);
  assert.equal(Array.from((screen.getByLabelText("Class") as HTMLSelectElement).options).some((option) => option.value === "arcane-archer"), false);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "arcane-archer");
  assert.ok(screen.getByText("Entry requirements"));
  assert.ok(screen.getByText("Base attack bonus +6"));
  const prestigeLevels = screen.getByLabelText("Additional class levels") as HTMLInputElement;
  assert.equal(prestigeLevels.max, "10");
  fireEvent.change(prestigeLevels, { target: { value: "15" } });
  assert.equal(prestigeLevels.value, "10");
  assert.equal(screen.getByText("BAB").closest("article")?.querySelector("strong")?.textContent, "+20");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Arrow of Death"));
});

test("Arcane Archer advances and restores its selected arcane spellbook", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  fireEvent.change(screen.getByLabelText("Intelligence base score"), { target: { value: "18" } });
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "16" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "arcane-archer");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "10" } });
  assert.equal((screen.getByLabelText("Arcane Archer spellcasting class") as HTMLSelectElement).value, "wizard");
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  const spellLevelFilter = screen.getByLabelText("Spell level filter") as HTMLSelectElement;
  assert.ok(Array.from(spellLevelFilter.options).some((option) => option.value === "7"));
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("button", { name: "Reset" }));
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Additional class") as HTMLSelectElement).value, "arcane-archer"));
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.ok(Array.from((screen.getByLabelText("Spell level filter") as HTMLSelectElement).options).some((option) => option.value === "7"));
});

test("Mystic Theurge selects and restores one arcane and one divine spellbook", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "15" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "cleric");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "3" } });
  await user.click(screen.getByRole("button", { name: "Add another class" }));
  await user.selectOptions(screen.getByLabelText("Additional class 2"), "mystic-theurge");
  fireEvent.change(screen.getByLabelText("Additional class 2 levels"), { target: { value: "9" } });

  assert.equal((screen.getByLabelText("Mystic Theurge arcane spellcasting class") as HTMLSelectElement).value, "wizard");
  assert.equal((screen.getByLabelText("Mystic Theurge divine spellcasting class") as HTMLSelectElement).value, "cleric");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("button", { name: "Reset" }));
  await user.click(screen.getByRole("button", { name: "Load" }));

  await waitFor(() => assert.equal((screen.getByLabelText("Additional class 2") as HTMLSelectElement).value, "mystic-theurge"));
  assert.equal((screen.getByLabelText("Mystic Theurge arcane spellcasting class") as HTMLSelectElement).value, "wizard");
  assert.equal((screen.getByLabelText("Mystic Theurge divine spellcasting class") as HTMLSelectElement).value, "cleric");
});

test("switches between independent multiclass spellbooks", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Wisdom base score"), { target: { value: "12" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "cleric");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "3" } });

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  const classSelector = screen.getByLabelText("Spellcasting class");
  assert.equal((classSelector as HTMLSelectElement).value, "wizard");
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await user.type(screen.getByLabelText("Search spells"), "mage armor");
  await user.click(screen.getByRole("button", { name: "Add Mage Armor" }));

  await user.selectOptions(classSelector, "cleric");
  assert.ok(screen.getByText(/Cleric slots:/));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await user.type(screen.getByLabelText("Search spells"), "bless");
  await user.click(screen.getByRole("button", { name: "Add Bless" }));
  assert.equal(screen.getByLabelText("Bless prepared").textContent, "1");

  await user.selectOptions(classSelector, "wizard");
  assert.ok(screen.getByText(/Wizard slots:/));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await user.type(screen.getByLabelText("Search spells"), "mage armor");
  assert.equal(screen.getByLabelText("Mage Armor prepared").textContent, "1");
});

test("exchanges and restores Human alternate racial traits", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByLabelText("Eye for Talent"));
  assert.equal((screen.getByLabelText("Heart of the Fields") as HTMLInputElement).disabled, false);
  await user.click(screen.getByLabelText("Heart of the Fields"));
  assert.equal((screen.getByLabelText("Heart of the Streets") as HTMLInputElement).disabled, true);
  await user.click(screen.getByRole("tab", { name: "Feats" }));
  assert.equal(screen.queryByText("Human bonus feat"), null);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  await user.click(screen.getByLabelText("Eye for Talent"));
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal((screen.getByLabelText("Eye for Talent") as HTMLInputElement).checked, true);
  assert.equal((screen.getByLabelText("Heart of the Fields") as HTMLInputElement).checked, true);
});

test("tracks and restores daily resources for secondary classes", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "10" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "bard");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "5" } });

  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal(screen.getByLabelText("Performance rounds remaining").textContent, "12/12 round remaining");
  await user.click(screen.getByRole("button", { name: "Spend 1 round" }));
  assert.equal(screen.getByLabelText("Performance rounds remaining").textContent, "11/12 round remaining");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Additional class"), "");
  assert.equal(screen.queryByLabelText("Performance rounds remaining"), null);
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Additional class") as HTMLSelectElement).value, "bard"));
  assert.equal(screen.getByLabelText("Performance rounds remaining").textContent, "11/12 round remaining");

  await user.selectOptions(screen.getByLabelText("Additional class"), "druid");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "5" } });
  assert.equal(screen.getByLabelText("Wild Shape remaining").textContent, "1/1 use remaining");
  await user.click(screen.getByRole("button", { name: "Spend 1 use" }));
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("button", { name: "Refresh wild shape" }));
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal(screen.getByLabelText("Wild Shape remaining").textContent, "0/1 use remaining");
});

test("uses the highest multiclass caster level for feat prerequisites", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "12" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "cleric");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "10" } });
  await user.click(screen.getByRole("tab", { name: "Feats" }));

  const bonusFeat = screen.getByLabelText("Human bonus feat");
  assert.equal((bonusFeat.querySelector("option[value='craft-magic-arms-and-armor']") as HTMLOptionElement).disabled, false);
  await user.selectOptions(bonusFeat, "craft-magic-arms-and-armor");
  assert.equal((bonusFeat as HTMLSelectElement).value, "craft-magic-arms-and-armor");
});

test("builds, calculates, and restores a three-class character", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "15" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "rogue");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "4" } });
  await user.click(screen.getByRole("button", { name: "Add another class" }));
  await user.selectOptions(screen.getByLabelText("Additional class 2"), "monk");
  fireEvent.change(screen.getByLabelText("Additional class 2 levels"), { target: { value: "3" } });

  assert.equal(screen.getByText("BAB").closest("article")?.querySelector("strong")?.textContent, "+13");
  assert.equal(screen.getByText("Fortitude").closest("article")?.querySelector("strong")?.textContent, "+10");
  assert.equal(screen.getByText("Reflex").closest("article")?.querySelector("strong")?.textContent, "+9");
  assert.equal(screen.getByText("Will").closest("article")?.querySelector("strong")?.textContent, "+6");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByRole("heading", { name: "Fighter 8 / Rogue 4 / Monk 3 features" }));

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("button", { name: "Remove Monk" }));
  assert.equal(screen.queryByLabelText("Additional class 2"), null);
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Additional class 2") as HTMLSelectElement).value, "monk"));
  assert.equal((screen.getByLabelText("Additional class 2 levels") as HTMLInputElement).value, "3");
});

test("switches and restores a third class spellbook", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "15" } });
  fireEvent.change(screen.getByLabelText("Wisdom base score"), { target: { value: "12" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "cleric");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "4" } });
  await user.click(screen.getByRole("button", { name: "Add another class" }));
  await user.selectOptions(screen.getByLabelText("Additional class 2"), "druid");
  fireEvent.change(screen.getByLabelText("Additional class 2 levels"), { target: { value: "5" } });

  await user.click(screen.getByRole("tab", { name: "Features" }));
  const natureBond = screen.getByLabelText(/Nature Bond/);
  await user.selectOptions(natureBond, "druid-nature-bond-animal");
  assert.equal((natureBond as HTMLSelectElement).value, "druid-nature-bond-animal");

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  const classSelector = screen.getByLabelText("Spellcasting class");
  assert.deepEqual(Array.from((classSelector as HTMLSelectElement).options).map((option) => option.textContent), ["Wizard", "Cleric", "Druid"]);
  await user.selectOptions(classSelector, "druid");
  assert.ok(screen.getByText(/Druid slots:/));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await user.type(screen.getByLabelText("Search spells"), "entangle");
  await user.click(screen.getByRole("button", { name: "Add Entangle" }));
  assert.equal(screen.getByLabelText("Entangle prepared").textContent, "1");

  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("button", { name: "Remove Druid" }));
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Additional class 2") as HTMLSelectElement).value, "druid"));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal((screen.getByLabelText(/Nature Bond/) as HTMLSelectElement).value, "druid-nature-bond-animal");
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spellcasting class"), "druid");
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await user.type(screen.getByLabelText("Search spells"), "entangle");
  assert.equal(screen.getByLabelText("Entangle prepared").textContent, "1");
});

test("applies and restores an archetype on an additional class", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "rogue");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "12" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "monk");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "2" } });
  await user.click(screen.getByRole("button", { name: "Add another class" }));
  await user.selectOptions(screen.getByLabelText("Additional class 2"), "fighter");
  fireEvent.change(screen.getByLabelText("Additional class 2 levels"), { target: { value: "5" } });
  await user.selectOptions(screen.getByLabelText("Fighter archetype"), "fighter-archer");

  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Trick Shot"));
  assert.ok(screen.getByText("Expert Archer +1"));
  assert.equal(screen.queryByText("Armor Training 1"), null);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  await user.selectOptions(screen.getByLabelText("Fighter archetype"), "");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Fighter archetype") as HTMLSelectElement).value, "fighter-archer"));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Expert Archer +1"));
});

test("enforces the skill-rank pool through the interface", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("tab", { name: "Skills" }));
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
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.match(screen.getByText(/Arcanist slots/).textContent ?? "", /3 1st-level \(2 base \+ 1 Intelligence\)/);
  assert.match(screen.getByText("Mage Armor").closest("article")?.textContent ?? "", /DC 12/);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
  await user.click(screen.getByRole("tab", { name: "Feats" }));
  await user.selectOptions(screen.getByLabelText("Human bonus feat"), "combat-casting");
  const secondFeat = screen.getByLabelText("Feat 1");
  assert.equal((secondFeat.querySelector("option[value='combat-casting']") as HTMLOptionElement).disabled, true);
  assert.equal((secondFeat.querySelector("option[value='power-attack']") as HTMLOptionElement).disabled, true);
  assert.equal((secondFeat.querySelector("option[value='combat-reflexes']") as HTMLOptionElement).disabled, true);
  assert.equal((secondFeat.querySelector("option[value='two-weapon-fighting']") as HTMLOptionElement).disabled, true);
  assert.equal((secondFeat.querySelector("option[value='leadership']") as HTMLOptionElement).disabled, true);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "1" } });
  await user.click(screen.getByRole("tab", { name: "Spells" }));
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
  await user.click(screen.getByRole("tab", { name: "Spells" }));
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
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const combatFeat = screen.getAllByText("Bonus Combat Feat").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(combatFeat);
  assert.ok([...combatFeat.options].some(option => option.text === "Improved Initiative"));
  assert.equal([...combatFeat.options].some(option => option.text === "Power Attack"), false);
  const weaponTraining = screen.getAllByText("Weapon Training 1").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(weaponTraining);
  await user.selectOptions(weaponTraining, "weapon-group-bows");
  assert.match(screen.getByText("Gain the weapon training bonus with bows.").textContent ?? "", /bows/);
});

test("applies a Fighter bonus feat's mechanical effects to combat statistics", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("Bonus Combat Feat level 1"), "fighter-improved-initiative");
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.equal(screen.getByText("Core statistics").closest("article")?.querySelector("dt")?.closest("div")?.querySelector("dd")?.textContent, "+4");
});

test("selects and persists the Fighter Archer archetype", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  await user.selectOptions(screen.getByLabelText("Archetype"), "fighter-archer");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Hawkeye +1"));
  assert.ok(screen.getByText("Ranged Defense"));
  assert.equal(screen.queryByText("Bravery +1"), null);
  assert.equal(screen.queryByText("Armor Training 1"), null);
  assert.match(screen.getByText("Weapon Mastery").closest("li")?.textContent ?? "", /bow/);
  await user.click(screen.getByRole("button", { name: "Save" }));
  assert.equal(JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}").archetypeId, "fighter-archer");
});

test("applies Core save and hit point feat effects with visible sources", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  await user.click(screen.getByRole("tab", { name: "Feats" }));
  await user.selectOptions(screen.getByLabelText("Human bonus feat"), "toughness");
  await user.selectOptions(screen.getByLabelText("Feat 1"), "great-fortitude");
  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  assert.equal(screen.getByText("Fortitude").closest("article")?.querySelector("strong")?.textContent, "+4");
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.equal(screen.getByText("Average HP").closest("div")?.querySelector("dd")?.textContent, "13");
  const sources = screen.getByText("Applied feat modifiers").closest("section");
  assert.match(sources?.textContent ?? "", /\+3 Hit pointsToughness/);
  assert.match(sources?.textContent ?? "", /\+2 Fortitude saveGreat Fortitude/);
});

test("applies selected weapon feat effects to matching equipment", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  fireEvent.change(screen.getByLabelText("Strength base score"), { target: { value: "13" } });
  await user.click(screen.getByRole("tab", { name: "Feats" }));
  await user.selectOptions(screen.getByLabelText("Human bonus feat"), "weapon-focus");
  await user.type(screen.getByLabelText("Weapon Focus Weapon"), "Longsword");
  await user.click(screen.getByRole("tab", { name: "Storage" }));
  await user.selectOptions(screen.getByLabelText("Equipment catalogue"), "longsword");
  assert.match(screen.getByText("Longsword").closest("article")?.textContent ?? "", /Attack \+3/);
});

test("makes Monk available with its full-save progression", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "monk");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "4" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Ki Pool (Magic)"));
  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  assert.equal(screen.getByText("Fortitude").closest("article")?.querySelector("strong")?.textContent, "+4");
  assert.equal(screen.getByText("Reflex").closest("article")?.querySelector("strong")?.textContent, "+4");
  assert.equal(screen.getByText("Will").closest("article")?.querySelector("strong")?.textContent, "+4");
});

test("makes Paladin available with its martial chassis and divine features", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "paladin");
  assert.equal(screen.getByText("BAB").closest("article")?.querySelector("strong")?.textContent, "+1");
  assert.equal(screen.getByText("Fortitude").closest("article")?.querySelector("strong")?.textContent, "+2");
  assert.equal(screen.getByText("Will").closest("article")?.querySelector("strong")?.textContent, "+2");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Aura of Good"));
  assert.ok(screen.getByText("Detect Evil"));
  assert.ok(screen.getByText("Smite Evil"));

  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  fireEvent.change(screen.getByLabelText("Charisma base score"), { target: { value: "14" } });
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getAllByText("Divine Bond").length >= 2);
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.ok(screen.getByRole("button", { name: "Add Bless" }));
});

test("makes Bard selectable with spontaneous casting and Versatile Performance choices", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  assert.equal(screen.getByText("BAB").closest("article")?.querySelector("strong")?.textContent, "+0");
  assert.equal(screen.getByText("Reflex").closest("article")?.querySelector("strong")?.textContent, "+2");
  assert.equal(screen.getByText("Will").closest("article")?.querySelector("strong")?.textContent, "+2");
  fireEvent.change(screen.getByLabelText("Charisma base score"), { target: { value: "14" } });
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "6" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Bardic Knowledge"));
  assert.ok(screen.getByText("Bardic Performance"));
  assert.ok(screen.getByText("Suggestion"));
  assert.equal(screen.getByLabelText("Performance rounds remaining").textContent, "16/16 round remaining");
  await user.click(screen.getByRole("button", { name: "Spend 1 round" }));
  await user.click(screen.getByRole("button", { name: "Spend 1 round" }));
  assert.equal(screen.getByLabelText("Performance rounds remaining").textContent, "14/16 round remaining");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("button", { name: "Refresh performance rounds" }));
  assert.equal(screen.getByLabelText("Performance rounds remaining").textContent, "16/16 round remaining");
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal(screen.getByLabelText("Performance rounds remaining").textContent, "14/16 round remaining");
  const versatile1 = screen.getByLabelText(/Versatile Performance 1/);
  const versatile2 = screen.getByLabelText(/Versatile Performance 2/);
  await user.selectOptions(versatile1, "bard-versatile-performance-oratory");
  assert.equal((versatile1 as HTMLSelectElement).value, "bard-versatile-performance-oratory");
  assert.equal(
    [...versatile2.options].find((option) => option.value === "bard-versatile-performance-oratory")?.disabled,
    true,
  );
  await user.selectOptions(versatile2, "bard-versatile-performance-dance");
  assert.equal((versatile2 as HTMLSelectElement).value, "bard-versatile-performance-dance");
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.match(screen.getByText(/Bard slots/).textContent ?? "", /1st-level/);
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  assert.ok(screen.getByRole("button", { name: "Learn Charm Person" }));
});

test("makes Druid selectable with prepared divine casting and Nature Bond", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  assert.equal(screen.getByText("BAB").closest("article")?.querySelector("strong")?.textContent, "+0");
  assert.equal(screen.getByText("Fortitude").closest("article")?.querySelector("strong")?.textContent, "+2");
  assert.equal(screen.getByText("Will").closest("article")?.querySelector("strong")?.textContent, "+2");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "4" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Nature Sense"));
  assert.equal(screen.getByLabelText("Wild Shape remaining").textContent, "1/1 use remaining");
  await user.click(screen.getByRole("button", { name: "Spend 1 use" }));
  assert.equal(screen.getByLabelText("Wild Shape remaining").textContent, "0/1 use remaining");
  const natureBond = screen.getByLabelText(/Nature Bond/);
  const animalCompanion = screen.getByLabelText(/Animal Companion Choice/);
  const natureDomain = screen.getByLabelText(/Nature Domain/);
  assert.equal((animalCompanion as HTMLSelectElement).disabled, true);
  assert.equal((natureDomain as HTMLSelectElement).disabled, true);
  await user.selectOptions(natureBond, "druid-nature-bond-animal");
  assert.equal((natureBond as HTMLSelectElement).value, "druid-nature-bond-animal");
  assert.equal((animalCompanion as HTMLSelectElement).disabled, false);
  assert.equal((natureDomain as HTMLSelectElement).disabled, true);
  await user.selectOptions(animalCompanion, "ranger-animal-companion-wolf");
  assert.ok(screen.getByText(/bite 1d6 plus trip/));
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("button", { name: "Refresh wild shape" }));
  assert.equal(screen.getByLabelText("Wild Shape remaining").textContent, "1/1 use remaining");
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal(screen.getByLabelText("Wild Shape remaining").textContent, "0/1 use remaining");
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.match(screen.getByText(/Druid slots/).textContent ?? "", /1st-level/);
});

test("makes Ranger selectable with persistent Core feature choices", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "ranger");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "8" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const favoredEnemy = screen.getByLabelText(/Favored Enemy 1/);
  const combatStyle = screen.getByLabelText(/Combat Style level 2/);
  const favoredTerrain = screen.getByLabelText(/Favored Terrain 1/);
  const huntersBond = screen.getByLabelText(/Hunter's Bond/);
  const animalCompanion = screen.getByLabelText(/Animal Companion Choice/);
  assert.equal((animalCompanion as HTMLSelectElement).disabled, true);
  const styleFeat1 = screen.getByLabelText(/Combat Style Feat 1/);
  const styleFeat2 = screen.getByLabelText(/Combat Style Feat 2/);
  await user.selectOptions(favoredEnemy, "ranger-enemy-dragon");
  await user.selectOptions(combatStyle, "ranger-combat-style-archery");
  assert.equal([...styleFeat1.options].some((option) => option.value === "ranger-style-feat-rapid-shot"), true);
  assert.equal([...styleFeat1.options].some((option) => option.value === "ranger-style-feat-two-weapon-fighting"), false);
  await user.selectOptions(styleFeat1, "ranger-style-feat-rapid-shot");
  await user.selectOptions(styleFeat2, "ranger-style-feat-manyshot");
  await user.selectOptions(favoredTerrain, "ranger-terrain-forest");
  await user.selectOptions(huntersBond, "ranger-hunters-bond-animal");
  assert.equal((animalCompanion as HTMLSelectElement).disabled, false);
  await user.selectOptions(animalCompanion, "ranger-animal-companion-wolf");
  assert.equal((favoredEnemy as HTMLSelectElement).value, "ranger-enemy-dragon");
  assert.equal((combatStyle as HTMLSelectElement).value, "ranger-combat-style-archery");
  assert.equal((favoredTerrain as HTMLSelectElement).value, "ranger-terrain-forest");
  assert.equal((huntersBond as HTMLSelectElement).value, "ranger-hunters-bond-animal");
  assert.equal((animalCompanion as HTMLSelectElement).value, "ranger-animal-companion-wolf");
  assert.ok(screen.getByText(/bite 1d6 plus trip/));
  assert.equal((styleFeat1 as HTMLSelectElement).value, "ranger-style-feat-rapid-shot");
  assert.equal(
    [...styleFeat2.options].find((option) => option.value === "ranger-style-feat-rapid-shot")?.disabled,
    true,
  );
  await user.selectOptions(combatStyle, "ranger-combat-style-two-weapon");
  assert.equal((styleFeat1 as HTMLSelectElement).value, "");
  assert.equal((styleFeat2 as HTMLSelectElement).value, "");
  assert.equal([...styleFeat1.options].some((option) => option.value === "ranger-style-feat-two-weapon-fighting"), true);
  await user.selectOptions(huntersBond, "ranger-hunters-bond-companions");
  assert.equal((animalCompanion as HTMLSelectElement).value, "");
  assert.equal((animalCompanion as HTMLSelectElement).disabled, true);
});

test("makes Wizard selectable with prepared arcane spells and class features", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getAllByText("Arcane Bond").length >= 2);
  assert.ok(screen.getAllByText("Arcane School").length >= 2);
  assert.ok(screen.getByText("Spellbook"));
  assert.ok(screen.getByText("Scribe Scroll"));

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.match(screen.getByText(/Wizard slots/).textContent ?? "", /2 1st-level \(1 base \+ 1 Intelligence\)/);
  assert.ok(screen.getByRole("button", { name: "Add Magic Missile" }));
  assert.equal(screen.queryByLabelText("Arcane Reservoir points"), null);

  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Wizard Bonus Feat"));
});

test("guides Wizard school and opposition school choices", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "wizard");
  await user.click(screen.getByRole("tab", { name: "Features" }));

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
  assert.equal(screen.getByRole("tab", { name: "Basic info" }).getAttribute("aria-selected"), "true");
  await user.click(screen.getByRole("tab", { name: "Storage" }));
  assert.ok(screen.getByText("Equipment and carried items"));
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByText("Core statistics"));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Arcanist features"));
  assert.ok(screen.getByText("Configure class features"));
  await user.click(screen.getByRole("tab", { name: "Options" }));
  assert.ok(screen.getByText("Choose background traits"));
  assert.equal(screen.queryByText("Configure class features"), null);
});

test("supports arrow, Home, and End keyboard navigation across character tabs", async () => {
  const user = userEvent.setup();
  render(<Home />);
  const basicInfo = screen.getByRole("tab", { name: "Basic info" });
  basicInfo.focus();
  await user.keyboard("{ArrowRight}");
  assert.equal(screen.getByRole("tab", { name: "Actions" }).getAttribute("aria-selected"), "true");
  assert.equal(document.activeElement, screen.getByRole("tab", { name: "Actions" }));
  await user.keyboard("{End}");
  assert.equal(screen.getByRole("tab", { name: "Options" }).getAttribute("aria-selected"), "true");
  await user.keyboard("{Home}");
  assert.equal(screen.getByRole("tab", { name: "Basic info" }).getAttribute("aria-selected"), "true");
  assert.equal(screen.getByRole("tabpanel").getAttribute("aria-labelledby"), "character-tab-overview");
});

test("tracks hit points and expires temporary combat effects by round", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  const armorClass = screen.getByText("AC / touch / flat-footed").closest("div");
  assert.match(armorClass?.textContent ?? "", /10 \/ 10 \/ 10/);
  fireEvent.change(screen.getByLabelText("Current HP"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("Temporary HP"), { target: { value: "5" } });
  await user.type(screen.getByLabelText("Effect name"), "Shield");
  await user.selectOptions(screen.getByLabelText("Affects"), "armorClass");
  fireEvent.change(screen.getByLabelText("Rounds"), { target: { value: "2" } });
  await user.click(screen.getByRole("button", { name: "Add effect" }));
  assert.match(armorClass?.textContent ?? "", /11 \/ 11 \/ 11/);
  await user.click(screen.getByRole("button", { name: "Advance round" }));
  assert.ok(screen.getByText(/1 round$/));
  await user.click(screen.getByRole("button", { name: "Advance round" }));
  assert.match(armorClass?.textContent ?? "", /10 \/ 10 \/ 10/);
  await user.click(screen.getByRole("button", { name: "Save" }));
  const saved = JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}");
  assert.equal(saved.currentHitPoints, 3);
  assert.equal(saved.temporaryHitPoints, 5);
});

test("selects, applies, and persists traits from different categories", async () => {
  render(<Home />);
  await userEvent.click(screen.getByRole("tab", { name: "Options" }));
  await userEvent.selectOptions(screen.getByLabelText("Trait 1"), "reactionary");
  await userEvent.selectOptions(screen.getByLabelText("Trait 2"), "caretaker");
  await userEvent.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByText("+2"));
  await userEvent.click(screen.getByRole("tab", { name: "Skills" }));
  assert.ok(screen.getByText("Heal").closest("label")?.textContent?.includes("Class skill"));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  assert.deepEqual(JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}").selectedTraitIds, ["reactionary", "caretaker"]);
});

test("applies the expanded social trait skill bonuses", async () => {
  render(<Home />);
  await userEvent.click(screen.getByRole("tab", { name: "Options" }));
  await userEvent.selectOptions(screen.getByLabelText("Trait 1"), "poverty-stricken");
  await userEvent.click(screen.getByRole("tab", { name: "Skills" }));
  const survival = screen.getByText("Survival").closest("label");
  assert.ok(survival?.textContent?.includes("+1"));
  assert.ok(survival?.textContent?.includes("Class skill"));
});

test("lists conditional trait modifiers without applying them as permanent saves", async () => {
  render(<Home />);
  await userEvent.click(screen.getByRole("tab", { name: "Options" }));
  await userEvent.selectOptions(screen.getByLabelText("Trait 1"), "courageous");
  await userEvent.selectOptions(screen.getByLabelText("Trait 2"), "birthmark");
  await userEvent.click(screen.getByRole("tab", { name: "Actions" }));
  const modifiers = screen.getByText("Conditional trait modifiers").closest("section");
  assert.match(modifiers?.textContent ?? "", /\+2 Saving throwsagainst fear effects · Courageous/);
  assert.match(modifiers?.textContent ?? "", /Divine focusthe birthmark can serve as a divine focus · Birthmark/);
  await userEvent.click(screen.getByRole("tab", { name: "Basic info" }));
  assert.equal(screen.getByText("Fortitude").closest("article")?.querySelector("strong")?.textContent, "+0");
});

test("selects and persists a trait-specific granted class skill", async () => {
  render(<Home />);
  await userEvent.click(screen.getByRole("tab", { name: "Options" }));
  await userEvent.selectOptions(screen.getByLabelText("Trait 1"), "mathematical-prodigy");
  await userEvent.selectOptions(screen.getByLabelText("Granted class skill"), "Knowledge (engineering)");
  await userEvent.click(screen.getByRole("tab", { name: "Skills" }));
  assert.ok(screen.getByText("Knowledge (engineering)").closest("label")?.textContent?.includes("Class skill"));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  const saved = JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}");
  assert.deepEqual(saved.selectedTraitChoices, { "mathematical-prodigy": "Knowledge (engineering)" });
});

test("selects, displays, and persists a trait-specific spell modifier", async () => {
  render(<Home />);
  await userEvent.click(screen.getByRole("tab", { name: "Options" }));
  await userEvent.selectOptions(screen.getByLabelText("Trait 1"), "gifted-adept");
  await userEvent.selectOptions(screen.getByLabelText("Affected spell"), "mage-hand");
  await userEvent.click(screen.getByRole("tab", { name: "Spells" }));
  await userEvent.type(screen.getByLabelText("Search spells"), "Mage Hand");
  assert.ok(screen.getByText("Mage Hand").closest("article")?.textContent?.includes("trait: +1 caster level"));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  const saved = JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}");
  assert.deepEqual(saved.selectedTraitChoices, { "gifted-adept": "mage-hand" });
});

test("clears a trait spell choice when the character changes to an ineligible class", async () => {
  render(<Home />);
  await userEvent.click(screen.getByRole("tab", { name: "Options" }));
  await userEvent.selectOptions(screen.getByLabelText("Trait 1"), "gifted-adept");
  await userEvent.selectOptions(screen.getByLabelText("Affected spell"), "mage-hand");
  await userEvent.selectOptions(screen.getByLabelText("Class"), "barbarian");
  assert.equal((screen.getByLabelText("Affected spell") as HTMLSelectElement).value, "");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  const saved = JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}");
  assert.deepEqual(saved.selectedTraitChoices, {});
});

test("tracks persistent equipment, encumbrance, currency, and equipped armor", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("tab", { name: "Storage" }));
  const catalogue = screen.getByLabelText("Equipment catalogue");
  await user.selectOptions(catalogue, "longbow");
  assert.ok(screen.getByText(/Critical ×3 · Range 100 ft\./));
  await user.click(screen.getByRole("button", { name: "Remove" }));
  await user.selectOptions(catalogue, "chain-shirt");
  assert.ok(screen.getByText(/25 lb. carried — light load/));
  await user.click(screen.getByLabelText("Equipped"));
  fireEvent.change(screen.getByLabelText("GP"), { target: { value: "125" } });
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.match(screen.getByText("AC / touch / flat-footed").closest("div")?.textContent ?? "", /14 \/ 10 \/ 14/);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("tab", { name: "Storage" }));
  await user.click(screen.getByRole("button", { name: "Remove" }));
  fireEvent.change(screen.getByLabelText("GP"), { target: { value: "0" } });
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal((screen.getByLabelText("GP") as HTMLInputElement).value, "125");
  assert.equal((screen.getByLabelText("Equipped") as HTMLInputElement).checked, true);
  assert.ok(screen.getByText(/25 lb. carried — light load/));
});

test("applies, prices, and restores magic equipment without stacking like bonuses", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("tab", { name: "Storage" }));
  const catalogue = screen.getByLabelText("Equipment catalogue");
  await user.selectOptions(catalogue, "longsword");
  await user.selectOptions(screen.getByLabelText("Longsword enhancement"), "2");
  assert.match(screen.getByText("Longsword +2").closest("article")?.textContent ?? "", /8315 gp/);
  assert.match(screen.getByText("Longsword +2").closest("article")?.textContent ?? "", /Attack \+2 · Damage 1d8 \+2/);

  await user.selectOptions(catalogue, "chain-shirt");
  await user.selectOptions(screen.getByLabelText("Chain shirt enhancement"), "2");
  await user.click(screen.getAllByLabelText("Equipped")[1]);
  for (const itemId of ["ring-protection-1", "ring-protection-2", "cloak-resistance-1", "cloak-resistance-3"]) {
    await user.selectOptions(catalogue, itemId);
    await user.click(screen.getAllByLabelText("Equipped").at(-1)!);
  }

  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.match(screen.getByText("AC / touch / flat-footed").closest("div")?.textContent ?? "", /18 \/ 12 \/ 18/);
  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  assert.equal(screen.getByText("Fortitude").closest("article")?.querySelector("strong")?.textContent, "+3");
  assert.equal(screen.getByText("Reflex").closest("article")?.querySelector("strong")?.textContent, "+3");
  assert.equal(screen.getByText("Will").closest("article")?.querySelector("strong")?.textContent, "+5");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("tab", { name: "Storage" }));
  await user.selectOptions(screen.getByLabelText("Longsword enhancement"), "0");
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal((screen.getByLabelText("Longsword enhancement") as HTMLSelectElement).value, "2");
});

test("previews and confirms a guided level up without losing selections", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.type(screen.getByLabelText("Character name"), "Leveler");
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
  await user.click(screen.getByRole("button", { name: "Review level 4" }));
  assert.ok(screen.getByRole("region", { name: "Level up to 4" }));
  assert.ok(screen.getByText("Choose a +1 increase to one ability score."));
  assert.ok(screen.getByText(/Allocate 4 new skill ranks/));
  assert.ok(screen.getByText(/Bonus Combat Feat/));
  await user.click(screen.getByRole("button", { name: "Advance to level 4" }));
  assert.equal((screen.getByLabelText("Level") as HTMLInputElement).value, "4");
  assert.equal((screen.getByLabelText("Character name") as HTMLInputElement).value, "Leveler");
  assert.ok(screen.getByText(/Advanced to level 4/));
});

test("selects and persists the Barbarian Breaker archetype", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "barbarian");
  await user.selectOptions(screen.getByLabelText("Archetype"), "barbarian-breaker");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "6" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Destructive"));
  assert.ok(screen.getByText("Battle Scavenger +1"));
  assert.equal(screen.queryByText("Fast Movement"), null);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Archetype"), "");
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal((screen.getByLabelText("Archetype") as HTMLSelectElement).value, "barbarian-breaker");
});

test("switches between the Drunken Brute and Hurler archetypes", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "barbarian");
  await user.selectOptions(screen.getByLabelText("Archetype"), "barbarian-drunken-brute");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Raging Drunk"));
  assert.equal(screen.queryByText("Fast Movement"), null);
  await user.selectOptions(screen.getByLabelText("Archetype"), "barbarian-hurler");
  assert.ok(screen.getByText("Skilled Thrower"));
  assert.equal(screen.queryByText("Raging Drunk"), null);
});

test("shows the Barbarian Damage Reduction progression through level 19", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "barbarian");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "19" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText("Damage Reduction 5/-"));
});

test("configures and restores Invulnerable Rager Extreme Endurance", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "barbarian");
  await user.selectOptions(screen.getByLabelText("Archetype"), "barbarian-invulnerable-rager");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "6" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText(/Extreme Endurance/), "invulnerable-rager-endurance-cold");
  assert.ok(screen.getByText(/gain cold resistance/i));
  assert.equal(screen.queryByText("Uncanny Dodge"), null);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText(/Extreme Endurance/), "invulnerable-rager-endurance-heat");
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal((screen.getByLabelText(/Extreme Endurance/) as HTMLSelectElement).value, "invulnerable-rager-endurance-cold");
});

test("switches among the remaining progression-only Barbarian archetypes", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "barbarian");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "19" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("Archetype"), "barbarian-elemental-kin");
  assert.ok(screen.getByText("Elemental Fury"));
  await user.selectOptions(screen.getByLabelText("Archetype"), "barbarian-savage-barbarian");
  assert.ok(screen.getByText("Natural Toughness"));
  await user.selectOptions(screen.getByLabelText("Archetype"), "barbarian-superstitious");
  assert.ok(screen.getByText("Keen Senses — Blindsight"));
  assert.equal(screen.queryByText("Damage Reduction 5/-"), null);
});

test("configures and restores distinct Brutal Pugilist maneuver specialties", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "barbarian");
  await user.selectOptions(screen.getByLabelText("Archetype"), "barbarian-brutal-pugilist");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "6" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const pitFighterChoices = screen.getAllByLabelText(/Pit Fighter/);
  assert.equal(pitFighterChoices.length, 2);
  await user.selectOptions(pitFighterChoices[0], "brutal-pugilist-grapple-cmb");
  await user.selectOptions(pitFighterChoices[1], "brutal-pugilist-grapple-cmd");
  assert.ok(screen.getByText(/bonus on grapple checks/));
  assert.ok(screen.getByText(/CMD against grapple/));
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(pitFighterChoices[0], "brutal-pugilist-trip-cmb");
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal((screen.getAllByLabelText(/Pit Fighter/)[0] as HTMLSelectElement).value, "brutal-pugilist-grapple-cmb");
});

test("filters Mounted Fury bestial mounts by ancestry size and level", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "barbarian");
  await user.selectOptions(screen.getByLabelText("Archetype"), "barbarian-mounted-fury");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "8" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const mount = screen.getByLabelText(/Bestial Mount/) as HTMLSelectElement;
  assert.deepEqual(Array.from(mount.options).slice(1).map(option => option.text), ["Camel", "Horse"]);
  await user.selectOptions(screen.getByLabelText("Ancestry"), "halfling");
  assert.deepEqual(Array.from(mount.options).slice(1).map(option => option.text), ["Pony", "Wolf", "Boar", "Dog"]);
  await user.selectOptions(mount, "mounted-fury-mount-dog");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(mount, "mounted-fury-mount-pony");
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal((screen.getByLabelText(/Bestial Mount/) as HTMLSelectElement).value, "mounted-fury-mount-dog");
});

test("previews and advances the selected multiclass entry", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "rogue");
  await user.click(screen.getByRole("button", { name: "Review level 4" }));
  await user.selectOptions(screen.getByLabelText("Class receiving this level"), "rogue");
  assert.ok(screen.getByRole("heading", { name: "Review Rogue level 2" }));
  assert.ok(screen.getByText(/Rogue Talent/));
  await user.click(screen.getByRole("button", { name: "Advance to level 4" }));
  assert.equal((screen.getByLabelText("Additional class levels") as HTMLInputElement).value, "2");
  assert.match(screen.getByText(/Advanced Rogue to level 2/).textContent ?? "", /Advanced Rogue to level 2/);
});

test("reviews any level without changing the character level", async () => {
  const user = userEvent.setup();
  render(<Home />);
  const characterLevel = screen.getByLabelText("Level") as HTMLInputElement;
  await user.click(screen.getByRole("button", { name: /^Advancement step 10\b/ }));
  assert.ok(screen.getByRole("heading", { name: "Upcoming level" }));
  assert.equal(characterLevel.value, "1");
  assert.equal(screen.getByRole("button", { name: /^Advancement step 10\b/ }).getAttribute("aria-pressed"), "true");
});

test("routes progression review actions to the existing character tabs", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: /^Advancement step 1\b/ }));
  await user.click(screen.getByRole("button", { name: "Feats" }));
  assert.equal(screen.getByRole("tab", { name: "Feats" }).getAttribute("aria-selected"), "true");
  assert.ok(screen.getByRole("heading", { name: "Feat manager" }));
});

test("searches the feat catalog and assigns an eligible feat to an open slot", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("tab", { name: "Feats" }));
  const search = screen.getByRole("searchbox", { name: "Search feats" });
  await user.type(search, "Toughness");
  assert.match(screen.getByText(/1 of 427 feats shown/).textContent ?? "", /1 of 427/);
  await user.click(screen.getByText("Toughness", { selector: "summary strong" }));
  assert.ok(screen.getByText(/Gain 3 hit points/));
  await user.click(screen.getByRole("button", { name: "Add to open slot" }));
  assert.ok(screen.getByText("Selected", { selector: ".feat-status" }));
  assert.equal((screen.getByLabelText("Human bonus feat") as HTMLSelectElement).value, "toughness");
});

test("opens and closes the responsive character drawer", async () => {
  const user = userEvent.setup();
  render(<Home />);
  const trigger = screen.getByRole("button", { name: "Character & levels" });
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  await user.click(trigger);
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  assert.ok(screen.getByRole("complementary", { name: "Character creation and progression" }).classList.contains("is-open"));
  await user.click(screen.getByRole("button", { name: "Close" }));
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
});
