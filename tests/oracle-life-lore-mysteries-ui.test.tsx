import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let waitFor: typeof import("@testing-library/react").waitFor;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, waitFor } = await import("@testing-library/react"));
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
