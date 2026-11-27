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

test("Cyclopean Seer restores revelations and keeps each divination choice within its own spell-level limit", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  fireEvent.change(screen.getByLabelText("Charisma base score"), { target: { value: "18" } });
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "6" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "oracle-cyclopean-seer");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("Mystery level 1"), "oracle-mystery-life");
  const curse = screen.getByLabelText<HTMLSelectElement>("Oracle’s Curse level 1");
  assert.deepEqual([...curse.options].map(({ value }) => value).filter(Boolean).sort(), [
    "oracle-curse-haunted", "oracle-curse-hunger", "oracle-curse-powerless-prophecy", "oracle-curse-tongues",
  ]);
  await user.selectOptions(curse, "oracle-curse-hunger");
  await user.selectOptions(screen.getByLabelText("Revelation level 3"), "oracle-revelation-cyclopean-prescience");
  assert.equal(screen.queryByLabelText("Revelation level 1"), null);
  assert.equal(screen.queryByText("Mystery spells"), null);

  const spellId = (id: string) => `archetype-adjusted-spell-oracle-${id}`;
  const choices = [2, 4, 6].map(level => screen.getByLabelText<HTMLSelectElement>(`Divination Bonus Spell level ${level}`));
  const allows = (choice: HTMLSelectElement, id: string) => [...choice.options].some(({ value }) => value === spellId(id));
  assert.ok(allows(choices[0], "detect-undead"), `Level-2 choices: ${[...choices[0].options].map(option => option.value).join(", ")}`);
  assert.ok(!allows(choices[0], "true-strike"));
  assert.ok(!allows(choices[1], "see-invisibility"));
  assert.ok(!allows(choices[2], "magic-missile"));
  await user.selectOptions(choices[0], spellId("detect-undead"));
  assert.ok(!allows(choices[1], "detect-undead"));
  await user.selectOptions(choices[1], spellId("true-strike"));
  await user.selectOptions(choices[2], spellId("see-invisibility"));

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  const search = screen.getByPlaceholderText("Name or effect");
  await user.type(search, "Detect Undead");
  assert.equal(screen.getByLabelText("Detect Undead known").textContent, "Divination Bonus Spell");
  assert.equal(screen.queryByText("Detect Undead (Divination Bonus Spell)"), null);
  await user.clear(search);
  await user.type(search, "True Strike");
  await user.click(screen.getByRole("button", { name: "Cast True Strike (Divination Bonus Spell)" }));
  assert.match(screen.getByText(/Oracle \(Cyclopean Seer\) slots:/).textContent ?? "", /6\/7 1st-level/);

  await user.click(screen.getByRole("button", { name: "Save", exact: true }));
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  await user.click(screen.getByRole("button", { name: "Load", exact: true }));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal(screen.getByLabelText<HTMLSelectElement>("Divination Bonus Spell level 4").value, spellId("true-strike"));
  assert.equal(screen.getByLabelText<HTMLSelectElement>("Oracle’s Curse level 1").value, "oracle-curse-hunger");
});

test("Cyclopean Seer tracks Brutal Trance and level-20 spell-like abilities", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "7" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "oracle-cyclopean-seer");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const question = screen.getByRole<HTMLButtonElement>("button", { name: "Ask a Brutal Trance question" });
  assert.ok(question.disabled);
  const trance = screen.getByRole<HTMLButtonElement>("button", { name: "Enter Brutal Trance" });
  await user.click(trance);
  assert.ok(trance.disabled);
  assert.match(screen.getByLabelText("Enter Brutal Trance result").textContent ?? "", /Active for 7 rounds/);
  await user.click(screen.getByLabelText("I can act normally and have asked no other question this round"));
  await user.click(question);
  assert.match(screen.getByLabelText("Ask a Brutal Trance question result").textContent ?? "", /Commune question activated/);

  assert.equal(screen.queryByRole("button", { name: "Use Stone Tell" }), null);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  for (const name of ["Discern Location", "Prying Eyes", "Stone Tell"]) {
    const cast = screen.getByRole<HTMLButtonElement>("button", { name: `Use ${name}` });
    await user.click(cast);
    assert.ok(cast.disabled);
  }
});

test("Cyclopean Seer resolves Assume Fate, Doomsaying and Flash of Insight and applies selected Prescience", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  fireEvent.change(screen.getByLabelText("Charisma base score"), { target: { value: "18" } });
  const level = screen.getByLabelText("Level");
  fireEvent.change(level, { target: { value: "11" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "oracle-cyclopean-seer");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("Mystery level 1"), "oracle-mystery-lore");
  assert.equal(screen.queryByRole("button", { name: "Choose a Flash of Insight result" }), null);
  await user.selectOptions(screen.getByLabelText("Revelation level 3"), "oracle-revelation-cyclopean-flash-of-insight");
  await user.selectOptions(screen.getByLabelText("Revelation level 11"), "oracle-revelation-cyclopean-prescience");

  const flash = screen.getByRole<HTMLButtonElement>("button", { name: "Choose a Flash of Insight result" });
  const result = screen.getByLabelText("Choose a Flash of Insight result result to use");
  const sides = screen.getByLabelText("Choose a Flash of Insight result die sides");
  await user.click(screen.getByLabelText("This is my own die and I have not rolled it"));
  fireEvent.change(result, { target: { value: "4" } });
  await user.click(flash);
  assert.match(screen.getByLabelText("Choose a Flash of Insight result result").textContent ?? "", /Use 4 as the result of your d20/);
  assert.ok(flash.disabled);

  fireEvent.change(level, { target: { value: "20" } });
  fireEvent.change(sides, { target: { value: "6" } });
  assert.ok(flash.disabled);
  fireEvent.change(sides, { target: { value: "20" } });
  await user.click(flash);
  assert.match(screen.getByLabelText("Choose a Flash of Insight result result").textContent ?? "", /spends no daily use/);
  fireEvent.change(result, { target: { value: "5" } });
  assert.ok(flash.disabled);

  await user.selectOptions(screen.getByLabelText("Revelation level 15"), "oracle-revelation-cyclopean-doomsaying");
  await user.selectOptions(screen.getByLabelText("Pronounce Doomsaying mode"), "saves");
  await user.click(screen.getByLabelText("The target is within 30 feet and can be affected by a curse"));
  await user.click(screen.getByRole("button", { name: "Pronounce Doomsaying" }));
  assert.match(screen.getByLabelText("Pronounce Doomsaying result").textContent ?? "", /−20 penalty on saving throws.*10 rounds/);

  await user.click(screen.getByLabelText("Another creature I can see is saving against the same effect"));
  const previousRandom = Math.random;
  Math.random = () => 0;
  try {
    await user.click(screen.getByRole("button", { name: "Roll Assume Fate" }));
    assert.match(screen.getByLabelText("Roll Assume Fate result").textContent ?? "", /1 \+ 5 = 6/);
    await user.click(screen.getByRole("tab", { name: "Actions" }));
    assert.ok(screen.getByText("+6 Prescience AC"));
    assert.ok(screen.getByText(/Apply a \+6 luck bonus to your save/));
    await user.click(screen.getByRole("button", { name: /^Will roll, modifier/ }));
    assert.equal(screen.queryByText(/Apply a \+6 luck bonus to your save/), null);
  } finally {
    Math.random = previousRandom;
  }

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.type(screen.getByPlaceholderText("Name or effect"), "Detect Magic");
  assert.match(screen.getByText("Detect Magic", { exact: true }).closest("article")?.textContent ?? "", /Prescience: \+6 concentration/);
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
