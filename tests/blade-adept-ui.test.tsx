import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import { equippedWeaponAttacks } from "../apps/web/app/equipment-panel";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let waitFor: typeof import("@testing-library/react").waitFor;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, waitFor, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("bonded blade enhancement is enforced on attack and damage rolls", () => {
  assert.deepEqual(
    equippedWeaponAttacks([{ itemId: "rapier", quantity: 1, equipped: true, enhancementBonus: 1 }], 10, 3, 2, {}, { rapier: 5 })[0],
    { id: "rapier", name: "Rapier +5", attack: 18, damage: "1d6", damageBonus: 8, critical: "18–20/×2", range: undefined, enhancementBonus: 5 },
  );
});

test("Blade Adept tracks its blade progression, actions, arcana, and Life Drinker", async () => {
  const user = userEvent.setup();
  render(<Home />);
  fireEvent.change(screen.getByLabelText("Intelligence base score"), { target: { value: "16" } });
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "19" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "arcanist-blade-adept");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  await user.selectOptions(screen.getByLabelText("Sword Bond (Su) level 1"), "blade-adept-bond-rapier");
  await user.click(screen.getByRole("tab", { name: "Storage" }));
  await user.selectOptions(screen.getByLabelText("Equipment catalogue"), "rapier");
  await user.click(screen.getByLabelText("Equipped"));
  await user.click(screen.getByRole("tab", { name: "Skills" }));
  const perceptionRanks = screen.getByLabelText("Perception ranks");
  assert.match(perceptionRanks.closest("label")?.textContent ?? "", /Total\+2/);
  fireEvent.change(perceptionRanks, { target: { value: "10" } });
  assert.match(perceptionRanks.closest("label")?.textContent ?? "", /Total\+14/);
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const progression = screen.getByRole("region", { name: "Black blade progression" });
  assert.match(progression.textContent ?? "", /Enhancement\+5/);
  assert.match(progression.textContent ?? "", /Ego24/);
  assert.match(progression.textContent ?? "", /Blade pool5/);
  assert.match(progression.textContent ?? "", /Bonus languages8/);
  assert.match(progression.textContent ?? "", /Knowledge \(arcana\) ranks8/);
  assert.match(progression.textContent ?? "", /Saving throws use yours: Fortitude/);

  await waitFor(() => assert.match(screen.getByLabelText("Arcanist Black Blade Arcane Pool remaining").textContent ?? "", /5\/5/));
  await user.click(screen.getByRole("button", { name: "Use Black Blade Strike" }));
  assert.match(screen.getByLabelText("Arcanist Black Blade Arcane Pool remaining").textContent ?? "", /4\/5/);
  assert.match(screen.getByLabelText("Use Black Blade Strike result").textContent ?? "", /10 rounds/);

  await user.selectOptions(screen.getByLabelText("Arcanist Exploit level 5"), "blade-adept-magus-arcana-hasted-assault");
  await user.click(screen.getByRole("button", { name: "Use Hasted Assault" }));
  assert.match(screen.getByLabelText("Use Hasted Assault result").textContent ?? "", /4 rounds/);

  await user.selectOptions(screen.getByLabelText("Arcanist Exploit level 7"), "blade-adept-magus-arcana-critical-strike");
  await waitFor(() => assert.match(screen.getByLabelText("Arcanist Critical Strike remaining").textContent ?? "", /1\/1/));

  await user.selectOptions(screen.getByLabelText("Arcanist Exploit level 11"), "blade-adept-spell-strike");
  await user.selectOptions(screen.getByLabelText("Arcanist Exploit level 13"), "blade-adept-magus-arcana-close-range");
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "0");
  await user.click(screen.getByRole("button", { name: "Add Ray of Frost" }));
  const spellstrike = screen.getByRole("button", { name: "Cast Ray of Frost with Spellstrike" });
  assert.equal((spellstrike as HTMLButtonElement).disabled, false);
  await user.click(spellstrike);
  assert.match(screen.getByLabelText("Spellstrike result").textContent ?? "", /converted from a ray/);
  await user.selectOptions(screen.getByLabelText("Spell level filter"), "1");
  await user.click(screen.getByRole("button", { name: "Cast Mage Armor with Arcanist Sword Bond Spell" }));
  assert.match(screen.getByLabelText("Arcanist Sword Bond Spell result").textContent ?? "", /without preparing it or consuming a spell slot/);
  await user.click(screen.getByRole("button", { name: "Add Mage Armor" }));
  await user.click(screen.getByRole("button", { name: "Cast Mage Armor with Critical Strike" }));
  assert.match(screen.getByLabelText("Spellstrike result").textContent ?? "", /swift action after a melee critical hit/);

  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.match(screen.getByLabelText("Arcanist Critical Strike remaining").textContent ?? "", /0\/1/);
  assert.match(screen.getByLabelText("Arcanist Sword Bond Spell remaining").textContent ?? "", /0\/1/);
  const lifeDrinkerHitDice = screen.getByLabelText("Gain Life Drinker Temporary HP target Hit Dice");
  fireEvent.change(lifeDrinkerHitDice, { target: { value: "9" } });
  assert.equal((screen.getByRole("button", { name: "Gain Life Drinker Temporary HP" }) as HTMLButtonElement).disabled, true);
  fireEvent.change(lifeDrinkerHitDice, { target: { value: "10" } });
  await user.click(screen.getByRole("button", { name: "Gain Life Drinker Temporary HP" }));
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.equal((screen.getByLabelText("Temporary HP") as HTMLInputElement).value, "24");

  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.selectOptions(screen.getByLabelText("Additional class"), "wizard");
  fireEvent.change(screen.getByLabelText("Additional class levels"), { target: { value: "1" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const arcaneBond = screen.getByLabelText("Arcane Bond level 1") as HTMLSelectElement;
  assert.equal([...arcaneBond.options].some((option) => option.value === "wizard-arcane-bond-familiar"), false);
});

test("Transfer Arcana preserves resources on failed saves and blocks further attempts when exhausted", async () => {
  const user = userEvent.setup();
  render(<Home />);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "19" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "arcanist-blade-adept");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("Arcanist Exploit level 5"), "blade-adept-magus-arcana-hasted-assault");
  await user.click(screen.getByRole("button", { name: "Use Hasted Assault" }));

  const transfer = screen.getByRole("button", { name: "Transfer 2 Blade Points" }) as HTMLButtonElement;
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await user.click(transfer);
    assert.match(screen.getByLabelText("Transfer 2 Blade Points result").textContent ?? "", /failed DC 24.*fatigue/i);
    assert.match(screen.getByLabelText("Arcanist Transfer Arcana remaining").textContent ?? "", /1\/1/);
    assert.match(screen.getByLabelText("Arcanist Black Blade Arcane Pool remaining").textContent ?? "", /5\/5/);
    await user.click(transfer);
  } finally {
    Math.random = originalRandom;
  }
  assert.match(screen.getByLabelText("Transfer 2 Blade Points result").textContent ?? "", /exhaustion/i);
  assert.equal(transfer.disabled, true);
  assert.match(transfer.title, /Unavailable while Transfer Arcana exhaustion/);
});
