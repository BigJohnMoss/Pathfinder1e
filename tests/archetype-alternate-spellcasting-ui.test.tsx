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
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("Ancient Lorekeeper retains revelations and casts Elven Arcana at the raised Oracle level", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  await user.selectOptions(screen.getByLabelText("Ancestry"), "elf");
  fireEvent.change(screen.getByLabelText("Charisma base score"), { target: { value: "18" } });
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "4" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "oracle-ancient-lorekeeper");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const mystery = screen.getByLabelText<HTMLSelectElement>("Mystery level 1");
  await user.selectOptions(mystery, "oracle-mystery-lore");
  const revelation = screen.getByLabelText<HTMLSelectElement>("Revelation level 1");
  await user.selectOptions(revelation, "oracle-revelation-lore-keeper");
  assert.equal(screen.queryByText("Mystery spells"), null);

  const levelTwo = screen.getByLabelText<HTMLSelectElement>("Elven Arcana (Ex) level 2");
  const levelFour = screen.getByLabelText<HTMLSelectElement>("Elven Arcana (Ex) level 4");
  assert.ok(![...levelTwo.options].some(({ value }) => value === "archetype-adjusted-spell-oracle-magic-missile"));
  assert.ok(![...levelFour.options].some(({ value }) => value === "archetype-adjusted-spell-oracle-invisibility"));
  await user.selectOptions(levelTwo, "archetype-adjusted-spell-oracle-light");
  await user.selectOptions(levelFour, "archetype-adjusted-spell-oracle-magic-missile");

  await user.click(screen.getByRole("tab", { name: "Skills" }));
  assert.match(screen.getByText("Knowledge (local)").closest("label")?.textContent ?? "", /Class skill/);
  assert.doesNotMatch(screen.getByText("Appraise").closest("label")?.textContent ?? "", /Class skill/);
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getAllByText(/On questions about creatures with the elf subtype/).length > 0);
  await user.selectOptions(screen.getByLabelText("Skill to roll"), "Knowledge (local)");
  await user.click(screen.getByRole("button", { name: "Roll selected skill" }));
  await user.click(screen.getByRole("button", { name: "Roll with +2" }));
  const rollModifier = (label: string) => {
    const total = screen.getByLabelText(label);
    const natural = total.closest("li")?.textContent?.match(/dice \[(\d+)\]/)?.[1];
    assert.ok(natural);
    return Number(total.textContent) - Number(natural);
  };
  assert.equal(rollModifier("Knowledge (local) — Knowledge about elves total"), rollModifier("Knowledge (local) total") + 2);
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  const search = screen.getByPlaceholderText("Name or effect");
  await user.type(search, "light");
  const light = screen.getByText("Light (Elven Arcana)").closest("article");
  assert.match(light?.textContent ?? "", /level 1 · DC/);
  assert.match(screen.getByText("Light", { exact: true }).closest("article")?.textContent ?? "", /level 0 · DC/);
  await user.clear(search);
  await user.type(search, "Magic Missile");
  assert.match(screen.getByText("Magic Missile (Elven Arcana)").closest("article")?.textContent ?? "", /level 2 · DC/);
  assert.equal(screen.getByLabelText("Magic Missile (Elven Arcana) known").textContent, "Elven Arcana");
  await user.click(screen.getByRole("button", { name: "Cast Magic Missile (Elven Arcana)" }));
  assert.match(screen.getByText(/Oracle \(Ancient Lorekeeper\) slots:/).textContent ?? "", /3\/4 2nd-level/);

  await user.click(screen.getByRole("button", { name: "Save", exact: true }));
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  await user.click(screen.getByRole("button", { name: "Load", exact: true }));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal(screen.getByLabelText<HTMLSelectElement>("Elven Arcana (Ex) level 4").value, "archetype-adjusted-spell-oracle-magic-missile");
  assert.equal(screen.getByLabelText<HTMLSelectElement>("Revelation level 1").value, "oracle-revelation-lore-keeper");
});

test("an imported multiclass Lorekeeper only grants legally earned Oracle spells", async () => {
  const user = userEvent.setup();
  render(<Home />);
  const draft = {
    version: 1,
    classId: "fighter",
    level: 5,
    classLevels: [{ classId: "fighter", level: 1 }, { classId: "oracle", level: 4 }],
    archetypeIdsByClass: { oracle: "oracle-ancient-lorekeeper" },
    ancestryId: "elf",
    baseAbilities: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 18 },
    selectedOptions: {
      "oracle-ancient-lorekeeper-elven-arcana-ex-2": "archetype-adjusted-spell-oracle-magic-missile",
      "oracle-ancient-lorekeeper-elven-arcana-ex-4": "archetype-adjusted-spell-oracle-burning-hands",
      "oracle-ancient-lorekeeper-elven-arcana-ex-6": "archetype-adjusted-spell-oracle-invisibility",
    },
  };
  fireEvent.change(screen.getByLabelText("Import character file"), {
    target: { files: [{ size: 1000, text: async () => JSON.stringify(draft) }] },
  });
  await screen.findByText("Imported character");
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  const search = screen.getByPlaceholderText("Name or effect");
  await user.type(search, "Burning Hands");
  assert.equal(screen.getByLabelText("Burning Hands (Elven Arcana) known").textContent, "Elven Arcana");
  await user.clear(search);
  await user.type(search, "Magic Missile");
  assert.equal(screen.queryByText("Magic Missile (Elven Arcana)"), null);
  await user.clear(search);
  await user.type(search, "Invisibility");
  assert.equal(screen.queryByText("Invisibility (Elven Arcana)"), null);
});

test("Dandy exposes gated Medium spontaneous casting from the Bard list", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "ranger");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  await user.selectOptions(screen.getByLabelText("Archetype"), "ranger-dandy");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.match(screen.getByText(/Ranger \(Dandy\) slots:/).textContent ?? "", /no leveled spell slots available/);

  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "4" } });
  assert.doesNotMatch(screen.getByText(/Ranger \(Dandy\) slots:/).textContent ?? "", /no leveled spell slots available/);
  assert.ok(screen.getByRole("heading", { name: "Spontaneous spells" }));
  await user.type(screen.getByPlaceholderText("Name or effect"), "Daze");
  assert.ok(screen.getByText("Daze"));
});

test("Living Grimoire exposes Warpriest-style prepared Inquisitor casting", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "inquisitor");
  await user.selectOptions(screen.getByLabelText("Human +2"), "intelligence");
  await user.selectOptions(screen.getByLabelText("Archetype"), "inquisitor-living-grimoire");
  await user.click(screen.getByRole("tab", { name: "Spells" }));

  assert.ok(screen.getByRole("heading", { name: "Prepared spells" }));
  assert.match(screen.getByText(/Inquisitor \(Living Grimoire\) slots:/).textContent ?? "", /1st-level/);
});

for (const [classId, archetypeId, className, archetypeName, ability, spellName] of [
  ["bard", "bard-speaker-of-the-palatine-eye", "Bard", "Speaker of the Palatine Eye", "charisma", "Aphasia"],
  ["investigator", "investigator-questioner", "Investigator", "Questioner", "intelligence", "Daze"],
  ["magus", "magus-eldritch-scion", "Magus", "Eldritch Scion", "charisma", "Shield"],
  ["magus", "magus-mindblade", "Magus", "Mindblade", "intelligence", "Shield"],
] as const) test(`${archetypeName} exposes its complete spontaneous spellcasting profile at 1st level`, async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), classId);
  await user.selectOptions(screen.getByLabelText("Human +2"), ability);
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  await user.click(screen.getByRole("tab", { name: "Spells" }));

  assert.ok(screen.getByRole("heading", { name: "Spontaneous spells" }));
  assert.doesNotMatch(screen.getByText(new RegExp(`${className} \\(${archetypeName}\\) slots:`)).textContent ?? "", /no leveled spell slots available/);
  await user.type(screen.getByPlaceholderText("Name or effect"), spellName);
  assert.ok(screen.getByText(spellName));
});

test("Pearl Seeker exposes gated Bloodrager slots and level-gated bonus spells", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "paladin");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  await user.selectOptions(screen.getByLabelText("Archetype"), "paladin-pearl-seeker");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "7" } });
  await user.click(screen.getByRole("tab", { name: "Spells" }));

  assert.ok(screen.getByRole("heading", { name: "Spontaneous spells" }));
  assert.doesNotMatch(screen.getByText(/Paladin \(Pearl Seeker\) slots:/).textContent ?? "", /no leveled spell slots available/);
  await user.type(screen.getByPlaceholderText("Name or effect"), "Slipstream");
  assert.ok(screen.getByText("Slipstream"));
});
