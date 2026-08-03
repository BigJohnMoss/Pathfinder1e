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

const displayedAbility = (name: string) => Number(screen.getByLabelText(`${name} base score`).closest("label")?.querySelector("strong")?.textContent?.match(/-?\d+/)?.[0]);

test("Eldritch Font applies surge penalties and bonuses and removes them only on refresh", async () => {
  const user = userEvent.setup();
  render(<Home />);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "arcanist-eldritch-font");
  const originalStrength = displayedAbility("Strength");
  const originalDexterity = displayedAbility("Dexterity");
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  const baseSpellDc = Number(document.querySelector(".spell-list article small")?.textContent?.match(/DC (\d+)/)?.[1]);

  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.click(screen.getByRole("button", { name: "Surge a spell — become fatigued" }));
  assert.match(screen.getByLabelText("Surge a spell result").textContent ?? "", /Active for 1 round/);
  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  assert.equal(displayedAbility("Strength"), originalStrength - 2);
  assert.equal(displayedAbility("Dexterity"), originalDexterity - 2);
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.equal(document.querySelector<HTMLOutputElement>('.spell-panel output[aria-label$="caster level"]')?.value, "22");
  assert.equal(Number(document.querySelector(".spell-list article small")?.textContent?.match(/DC (\d+)/)?.[1]), baseSpellDc + 2);

  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.click(screen.getByRole("button", { name: "Surge a spell — become exhausted" }));
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  assert.equal(document.querySelector<HTMLOutputElement>('.spell-panel output[aria-label$="caster level"]')?.value, "22", "a second surge replaces rather than stacks the +2 caster level");
  assert.equal(Number(document.querySelector(".spell-list article small")?.textContent?.match(/DC (\d+)/)?.[1]), baseSpellDc + 2, "a second surge replaces rather than stacks the +2 save DC");
  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  assert.equal(displayedAbility("Strength"), originalStrength - 6);
  assert.equal(displayedAbility("Dexterity"), originalDexterity - 6);

  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.click(screen.getByRole("button", { name: "Refresh arcanist eldritch surge" }));
  await user.click(screen.getByRole("tab", { name: "Basic info" }));
  assert.equal(displayedAbility("Strength"), originalStrength);
  assert.equal(displayedAbility("Dexterity"), originalDexterity);
});

test("Eldritch Font rolls replacement attacks, damage, and the lower saving throw", async () => {
  const user = userEvent.setup();
  render(<Home />);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "arcanist-eldritch-font");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    fireEvent.change(screen.getByLabelText("Reroll spell or exploit attack modifier"), { target: { value: "5" } });
    await user.click(screen.getByRole("button", { name: "Reroll attack — become fatigued" }));
    assert.match(screen.getByLabelText("Reroll spell or exploit attack result").textContent ?? "", /New attack roll: 1 \+ 5 = 6.*must keep/i);
    await user.click(screen.getByRole("button", { name: "Refresh arcanist eldritch surge" }));

    fireEvent.change(screen.getByLabelText("Reroll spell or exploit damage dice count"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Reroll spell or exploit damage modifier"), { target: { value: "2" } });
    await user.click(screen.getByRole("button", { name: "Reroll damage — become fatigued" }));
    assert.match(screen.getByLabelText("Reroll spell or exploit damage result").textContent ?? "", /1 \+ 1 \+ 1 \+ 2 = 5.*must keep/i);
    await user.click(screen.getByRole("button", { name: "Refresh arcanist eldritch surge" }));

    fireEvent.change(screen.getByLabelText("Force saving throw reroll original save total"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Force saving throw reroll modifier"), { target: { value: "3" } });
    await user.click(screen.getByRole("button", { name: "Force save reroll — become fatigued" }));
    assert.match(screen.getByLabelText("Force saving throw reroll result").textContent ?? "", /original 20; reroll 1 \+ 3 = 4\. Use 4/);
  } finally {
    Math.random = originalRandom;
  }
});
