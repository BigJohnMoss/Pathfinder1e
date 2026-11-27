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

const selectFor = (label: string, index = 0) => {
  const selects = screen.getAllByText(label).map((text) => text.closest("label")?.querySelector("select")).filter(Boolean) as HTMLSelectElement[];
  assert.ok(selects[index], `expected ${label} select ${index}`);
  return selects[index];
};

test("Life and Lore expose grants, level gates, switching, and persistence", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  await user.selectOptions(screen.getByLabelText("Human +2"), "charisma");
  await user.clear(screen.getByLabelText("Charisma base score"));
  await user.type(screen.getByLabelText("Charisma base score"), "18");
  await user.clear(screen.getByLabelText("Level"));
  await user.type(screen.getByLabelText("Level"), "20");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const mystery = selectFor("Mystery");
  const revelation = selectFor("Revelation", 0);
  await user.selectOptions(mystery, "oracle-mystery-life");
  assert.ok(screen.getByText("true resurrection"));
  assert.ok(Array.from(revelation.options).some((option) => option.value === "oracle-revelation-lifesense"));
  await user.selectOptions(revelation, "oracle-revelation-lifesense");

  await user.selectOptions(mystery, "oracle-mystery-lore");
  await waitFor(() => assert.equal(revelation.value, ""));
  assert.ok(screen.getByText("time stop"));
  await user.selectOptions(revelation, "oracle-revelation-arcane-archivist");

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.equal(screen.getByLabelText("time stop known").textContent, "Mystery");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.equal((screen.getByLabelText("Class") as HTMLSelectElement).value, "oracle"));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal(selectFor("Mystery").value, "oracle-mystery-lore");
  assert.equal(selectFor("Revelation", 0).value, "oracle-revelation-arcane-archivist");
});

test("Planar Oracle keeps its mystery and persists the energy type through the final revelation", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  const level = screen.getByLabelText("Level");
  fireEvent.change(level, { target: { value: "11" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "oracle-planar-oracle");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("Mystery level 1"), "oracle-mystery-lore");
  await user.selectOptions(screen.getByLabelText("Revelation level 11"), "oracle-revelation-arcane-archivist");
  assert.equal(screen.queryByLabelText("Revelation level 3"), null);
  const affinity = screen.getByLabelText("Planar Affinity level 1");
  await user.selectOptions(affinity, "planar-oracle-energy-fire");
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByText("Fire resistance 20"));
  fireEvent.change(level, { target: { value: "20" } });
  assert.equal(screen.queryByText("Fire resistance 20"), null);
  assert.ok(screen.getByText("Immune to fire"));
  assert.ok(screen.getByText("DR 10/magic"));
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await waitFor(() => assert.ok(screen.getByText("Immune to fire")));
});

test("Enlightened Philosopher applies Charisma to all three saves at level 20", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  await user.selectOptions(screen.getByLabelText("Alignment"), "lawful-neutral");
  fireEvent.change(screen.getByLabelText("Charisma base score"), { target: { value: "18" } });
  const level = screen.getByLabelText("Level");
  fireEvent.change(level, { target: { value: "19" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "oracle-enlightened-philosopher");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("Mystery level 1"), "oracle-mystery-lore");
  await user.selectOptions(screen.getByLabelText("Revelation level 1"), "oracle-revelation-lore-keeper");
  assert.equal(screen.queryByLabelText("Revelation level 7"), null);
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.equal(screen.queryByText(/Immune to confusion/), null);
  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  const saveTotal = (save: string) => Number(screen.getByText(save, { selector: ".summary span" }).closest("article")?.querySelector("strong")?.textContent);
  const saves = ["Fortitude", "Reflex", "Will"];
  fireEvent.change(level, { target: { value: "20" } });
  const capstoneSaves = saves.map(saveTotal);
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByText(/Immune to confusion/));
  await user.click(screen.getByRole("button", { name: "Remove Enlightened Philosopher" }));
  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  assert.deepEqual(saves.map(saveTotal).map((total, index) => capstoneSaves[index] - total), [4, 4, 4]);
});

test("Dual-Cursed Oracle tracks distinct curses and its optional revelations", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  fireEvent.change(screen.getByLabelText("Charisma base score"), { target: { value: "18" } });
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "oracle-dual-cursed-oracle");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const curse = screen.getByLabelText<HTMLSelectElement>("Progressing Curse level 1");
  const fixedCurse = screen.getByLabelText<HTMLSelectElement>("Non-progressing Curse level 1");
  await user.selectOptions(curse, "oracle-curse-haunted");
  assert.ok(![...fixedCurse.options].some(({ value }) => value === "oracle-curse-haunted"));
  await user.selectOptions(fixedCurse, "oracle-curse-lame");

  await user.selectOptions(screen.getByLabelText("Mystery level 1"), "oracle-mystery-lore");
  const firstRevelation = screen.getByLabelText<HTMLSelectElement>("Revelation level 1");
  const newRevelation = screen.getByLabelText<HTMLSelectElement>("Revelation level 5");
  assert.ok(![...firstRevelation.options].some(({ value }) => value === "oracle-revelation-dual-cursed-fortune"));
  await user.selectOptions(firstRevelation, "oracle-revelation-dual-cursed-misfortune");
  await user.selectOptions(newRevelation, "oracle-revelation-dual-cursed-fortune");
  assert.ok(screen.getByRole("button", { name: "Force a d20 reroll with Misfortune" }));
  const fortune = screen.getByRole<HTMLButtonElement>("button", { name: "Reroll a d20 with Fortune" });
  assert.ok(fortune.disabled);
  await user.click(screen.getByLabelText("The result of my roll has not been revealed"));
  await user.click(fortune);
  assert.ok(screen.getByText(/You must keep this result/));
  assert.ok(fortune.disabled);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "13" } });
  assert.ok(screen.getByLabelText("Revelation level 13"));

  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.type(screen.getByPlaceholderText("Name or effect"), "Ill Omen");
  assert.ok(screen.getByRole("button", { name: "Cast Ill Omen" }));
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.selectOptions(screen.getByLabelText("Class"), "fighter");
  await user.click(screen.getByRole("button", { name: "Load" }));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.equal(screen.getByLabelText<HTMLSelectElement>("Non-progressing Curse level 1").value, "oracle-curse-lame");
  assert.equal(screen.getByLabelText<HTMLSelectElement>("Revelation level 5").value, "oracle-revelation-dual-cursed-fortune");
});

test("Possessed Oracle casts its replacement spells and rerolls a failed Will save once", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "oracle");
  fireEvent.change(screen.getByLabelText("Charisma base score"), { target: { value: "18" } });
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "8" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "oracle-possessed-oracle");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const curse = screen.getByLabelText<HTMLSelectElement>("Oracle’s Curse level 1");
  assert.deepEqual([...curse.options].map(({ value }) => value).filter(Boolean), ["oracle-curse-haunted", "oracle-curse-tongues"]);
  await user.selectOptions(curse, "oracle-curse-tongues");
  await user.selectOptions(screen.getByLabelText("Mystery level 1"), "oracle-mystery-life");
  await user.selectOptions(screen.getByLabelText("Revelation level 3"), "oracle-revelation-healing-hands");
  assert.equal(screen.queryByLabelText("Revelation level 1"), null);
  const reroll = screen.getByRole<HTMLButtonElement>("button", { name: "Reroll a failed Will save" });
  assert.ok(reroll.disabled);
  await user.click(screen.getByLabelText("I failed a Will save"));
  await user.click(reroll);
  assert.ok(screen.getByText(/New Will save roll.*You must keep this result/));
  assert.ok(reroll.disabled);
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByText("against enchantment spells or effects · Possessed Oracle"));
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.type(screen.getByPlaceholderText("Name or effect"), "Sleepwalk");
  assert.ok(screen.getByRole("button", { name: "Cast Sleepwalk" }));
});

for (const scenario of [
  {
    archetype: "oracle-seer",
    mystery: "life",
    revelation: "oracle-revelation-lifesense",
    keptSpell: "detect undead",
    replacedSpell: "lesser restoration",
    archetypeSpell: "Detect Thoughts",
    classSkill: "Handle Animal",
    otherSkill: "Appraise",
  },
  {
    archetype: "oracle-stargazer",
    mystery: "lore",
    revelation: "oracle-revelation-arcane-archivist",
    keptSpell: "contact other plane",
    replacedSpell: "identify",
    archetypeSpell: "Faerie Fire",
    classSkill: "Knowledge (nature)",
    otherSkill: "Appraise",
  },
  {
    archetype: "oracle-keleshite-prophet",
    mystery: "life",
    revelation: "oracle-revelation-lifesense",
    keptSpell: "detect undead",
    replacedSpell: "neutralize poison",
    archetypeSpell: "Clairaudience/Clairvoyance",
    classSkill: "Perform (dance)",
    otherSkill: "Handle Animal",
  },
  {
    archetype: "oracle-community-guardian",
    ancestry: "halfling",
    alignment: "neutral-good",
    mystery: "life",
    revelation: "oracle-revelation-lifesense",
    keptSpell: "restoration",
    replacedSpell: "lesser restoration",
    archetypeSpell: "Consecrate",
    classSkill: "Linguistics",
    otherSkill: "Handle Animal",
  },
]) {
  test(`${scenario.archetype} preserves its mystery while applying its specific swaps`, async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.selectOptions(screen.getByLabelText("Class"), "oracle");
    if (scenario.ancestry) await user.selectOptions(screen.getByLabelText("Ancestry"), scenario.ancestry);
    if (scenario.alignment) await user.selectOptions(screen.getByLabelText("Alignment"), scenario.alignment);
    await user.clear(screen.getByLabelText("Charisma base score"));
    await user.type(screen.getByLabelText("Charisma base score"), "18");
    await user.clear(screen.getByLabelText("Level"));
    await user.type(screen.getByLabelText("Level"), "11");
    await user.selectOptions(screen.getByLabelText("Archetype"), scenario.archetype);
    await user.click(screen.getByRole("tab", { name: "Features" }));
    await user.selectOptions(screen.getByLabelText("Mystery level 1"), `oracle-mystery-${scenario.mystery}`);
    const revelation = screen.getByLabelText<HTMLSelectElement>("Revelation level 11");
    await user.selectOptions(revelation, scenario.revelation);
    assert.equal(revelation.value, scenario.revelation);
    assert.ok(screen.getByText(scenario.keptSpell));
    assert.equal(screen.queryByText(scenario.replacedSpell), null);

    await user.click(screen.getByRole("tab", { name: "Skills" }));
    assert.match(screen.getByText(scenario.classSkill).closest("label")?.textContent ?? "", /Class skill/);
    assert.doesNotMatch(screen.getByText(scenario.otherSkill).closest("label")?.textContent ?? "", /Class skill/);

    await user.click(screen.getByRole("tab", { name: "Spells" }));
    const search = screen.getByPlaceholderText("Name or effect");
    await user.type(search, scenario.keptSpell);
    assert.equal(screen.getByLabelText(`${scenario.keptSpell} known`).textContent, "Mystery");
    await user.clear(search);
    await user.type(search, scenario.archetypeSpell);
    assert.ok(screen.getByLabelText(`${scenario.archetypeSpell} known`, { exact: false }));
  });
}
