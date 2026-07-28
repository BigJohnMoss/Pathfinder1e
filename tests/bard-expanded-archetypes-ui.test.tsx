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

test("Arcane Duelist is selectable, complete through level 20, and persistent", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-arcane-duelist']"));
  await user.selectOptions(archetype, "bard-arcane-duelist");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  for (const name of ["Arcane Strike", "Rallying Cry", "Bladethirst +1", "Mass Bladethirst", "Greater Penetrating Strike", "Arcane Bond", "Arcane Armor: Heavy"]) {
    assert.ok(screen.getByText(name));
  }
  assert.equal(screen.queryByText("Bardic Knowledge"), null);
  assert.equal(screen.queryByText("Versatile Performance 5"), null);
  assert.ok(screen.getByText("Deadly Performance"));

  await user.click(screen.getByRole("button", { name: "Save" }));
  assert.equal(JSON.parse(localStorage.getItem("pf1e-character-draft") ?? "{}").archetypeId, "bard-arcane-duelist");
});

test("Archivist switches in its complete scholarly progression", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-archivist']"));
  await user.selectOptions(archetype, "bard-archivist");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  for (const name of ["Naturalist +1", "Lamentable Belaborment", "Pedantic Lecture", "Magic Lore", "Jack of All Trades: Take 10", "Probable Path"]) {
    assert.ok(screen.getByText(name));
  }
  assert.equal(screen.queryByText("Inspire Courage +4"), null);
  assert.equal(screen.queryByText("Versatile Performance 5"), null);
  assert.ok(screen.getByText("Deadly Performance"));
});

test("Detective exposes five legal Arcane Investigation spell choices", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-detective']"));
  await user.selectOptions(archetype, "bard-detective");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of ["Careful Teamwork +1", "True Confession", "Show Yourselves", "Eye for Detail", "Arcane Insight"]) assert.ok(screen.getByText(name));
  assert.ok(screen.getByLabelText(/Arcane Investigation Spell 5/));
  const firstSpell = screen.getByLabelText(/Arcane Investigation Spell 1/);
  assert.ok(firstSpell.querySelector("option[value='detective-arcane-investigation-detect-evil']"));
  await user.selectOptions(firstSpell, "detective-arcane-investigation-detect-evil");
  assert.match(screen.getByText(/Add Detect Evil to your spells known/).textContent ?? "", /bonus spell/);
  assert.equal(screen.queryByText("Versatile Performance 5"), null);
});

test("Magician exposes expanded repertoire and bonded-object choices", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-magician']"));
  await user.selectOptions(archetype, "bard-magician");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of ["Dweomercraft +1", "Spell Suppression", "Metamagic Mastery", "Improved Counterspell", "Expanded Repertoire Spell 5", "Arcane Bond", "Wand Mastery: Caster Level"]) assert.ok(screen.getByText(name));
  const firstSpell = screen.getByLabelText(/Expanded Repertoire Spell 1/);
  assert.ok(firstSpell.querySelector("option[value='magician-expanded-repertoire-mage-armor']"));
  await user.selectOptions(firstSpell, "magician-expanded-repertoire-mage-armor");
  const bondedObject = screen.getByLabelText(/Arcane Bond/);
  assert.ok(bondedObject.querySelector("option[value='magician-bonded-object-wand']"));
  assert.equal(bondedObject.querySelector("option")?.textContent?.includes("Weapon"), false);
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.equal(screen.getByLabelText("Mage Armor known").textContent, "Feature");
  assert.equal(screen.getByRole("button", { name: "Forget Mage Armor" }).hasAttribute("disabled"), true);
});

test("Sandman exposes its complete stealth progression through level 20", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-sandman']"));
  await user.selectOptions(archetype, "bard-sandman");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of ["Stealspell", "Slumber Song", "Dramatic Subtext", "Greater Stealspell", "Mass Slumber Song", "Spell Catching", "Master of Deception", "Sneakspell +1 DC", "Trap Sense +1", "Sneak Attack +1d6"]) assert.ok(screen.getByText(name));
  assert.equal(screen.queryByText("Inspire Courage +4"), null);
  assert.equal(screen.queryByText("Deadly Performance"), null);
});

test("Savage Skald exposes every war-song replacement through level 20", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-savage-skald']"));
  await user.selectOptions(archetype, "bard-savage-skald");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of ["Inspiring Blow", "Incite Rage", "Song of the Fallen: Silver Horn", "Berserkergang", "Battle Song"]) assert.ok(screen.getByText(name));
  assert.equal(screen.queryByText("Fascinate"), null);
  assert.ok(screen.getByText("Deadly Performance"));
});

test("Sea Singer exposes its maritime features and familiar choice", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-sea-singer']"));
  await user.selectOptions(archetype, "bard-sea-singer");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of ["Sea Shanty", "Still Water", "Whistle the Wind", "Call the Storm", "World Traveler", "Sea Legs"]) assert.ok(screen.getByText(name));
  const familiar = screen.getByLabelText("Exotic Familiar");
  assert.ok(familiar.querySelector("option[value='sea-singer-familiar-monkey']"));
  assert.ok(familiar.querySelector("option[value='sea-singer-familiar-parrot']"));
});

test("Street Performer exposes every crowd-work replacement through level 20", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-street-performer']"));
  await user.selectOptions(archetype, "bard-street-performer");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  for (const name of ["Disappearing Act", "Harmless Performer", "Madcap Prank", "Slip through the Crowd", "Gladhanding", "Streetwise", "Quick Change"]) assert.ok(screen.getByText(name));
  assert.equal(screen.queryByText("Inspire Courage +4"), null);
  assert.ok(screen.getByText("Deadly Performance"));
});

test("Court Bard exposes every replacement performance through level 20", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  const archetype = screen.getByLabelText("Archetype");
  assert.ok(archetype.querySelector("option[value='bard-court-bard']"));
  await user.selectOptions(archetype, "bard-court-bard");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  for (const name of ["Satire -1", "Mockery -2", "Glorious Epic", "Scandal", "Heraldic Expertise", "Wide Audience"]) {
    assert.ok(screen.getByText(name));
  }
  assert.equal(screen.queryByText("Inspire Courage +4"), null);
  assert.equal(screen.queryByText("Inspire Competence +6"), null);
  assert.ok(screen.getByText("Deadly Performance"));
});
