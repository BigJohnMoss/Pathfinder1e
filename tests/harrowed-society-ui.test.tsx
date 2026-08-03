import test from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { JSDOM } from "jsdom";
import type { ActiveEffect } from "../packages/types/src/index.js";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;
let ActivePlayPanel: typeof import("../apps/web/app/active-play-panel").ActivePlayPanel;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
  ActivePlayPanel = (await import("../apps/web/app/active-play-panel")).ActivePlayPanel;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("Trump Card applies and consumes a self fate and resolves named external targets", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "arcanist");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "arcanist-harrowed-society-student");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await user.click(screen.getByRole("button", { name: "Draw Trump Card" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.match(screen.getByLabelText("Draw Trump Card result").textContent ?? "", /Books drawn for Self.*consume it on the next qualifying roll/);
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByText("Trump Card — Self"));
  Math.random = () => 0;
  try {
    await user.click(screen.getByRole("button", { name: /Caster level check roll/ }));
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(screen.getByLabelText("Caster level check total").textContent, "23");
  assert.equal(screen.queryByText("Trump Card — Self"), null);

  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("Draw Trump Card mode"), "trump-card-ally");
  assert.equal((screen.getByLabelText("Draw Trump Card target name") as HTMLInputElement).value, "Ally");
  await user.clear(screen.getByLabelText("Draw Trump Card target name"));
  await user.type(screen.getByLabelText("Draw Trump Card target name"), "Valeros");
  Math.random = () => 0.84;
  try {
    await user.click(screen.getByRole("button", { name: "Draw Trump Card" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.match(screen.getByLabelText("Draw Trump Card result").textContent ?? "", /Stars drawn for Valeros/);
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByText("Trump Card — Valeros"));

  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("Draw Trump Card mode"), "trump-card-enemy");
  assert.equal((screen.getByLabelText("Draw Trump Card target name") as HTMLInputElement).value, "Enemy");
  await user.clear(screen.getByLabelText("Draw Trump Card target name"));
  await user.type(screen.getByLabelText("Draw Trump Card target name"), "Aspis Agent");
  fireEvent.change(screen.getByLabelText("Draw Trump Card target will modifier"), { target: { value: "-20" } });
  Math.random = () => 0;
  try {
    await user.click(screen.getByRole("button", { name: "Draw Trump Card" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.match(screen.getByLabelText("Draw Trump Card result").textContent ?? "", /Books drawn for Aspis Agent.*curse applied/);
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByText("Trump Card — Aspis Agent"));
});

test("enemy Shields applies a healing penalty using the arcanist level", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "arcanist");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "arcanist-harrowed-society-student");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  await user.selectOptions(screen.getByLabelText("Draw Trump Card mode"), "trump-card-enemy");
  fireEvent.change(screen.getByLabelText("Draw Trump Card target will modifier"), { target: { value: "-20" } });

  const originalRandom = Math.random;
  Math.random = () => 0.7;
  try {
    await user.click(screen.getByRole("button", { name: "Draw Trump Card" }));
  } finally {
    Math.random = originalRandom;
  }

  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByText(/Shields curse: The next magical healing received is reduced by 20 hit points/));
});

function ActivePlayHarness({ initialEffects }: { initialEffects: ActiveEffect[] }) {
  const [effects, setEffects] = useState(initialEffects);
  const [hitPoints, setHitPoints] = useState(1);
  return <ActivePlayPanel
    maximumHitPoints={100}
    currentHitPoints={hitPoints}
    temporaryHitPoints={0}
    attacks={[{ id: "longsword", name: "Longsword", attack: 0, damage: "1d8", damageBonus: 2, critical: "19–20/×2" }]}
    checks={[{ id: "initiative", name: "Initiative", modifier: 3 }, { id: "fortitude", name: "Fortitude save", modifier: 5 }, { id: "caster-level", name: "Caster level check", modifier: 20 }]}
    skills={[{ id: "Spellcraft", name: "Spellcraft", modifier: 12 }]}
    effects={effects}
    onCurrentHitPointsChange={setHitPoints}
    onTemporaryHitPointsChange={() => {}}
    onEffectsChange={setEffects}
  />;
}

test("Shields enhances the next magical healing and then expires", async () => {
  const user = userEvent.setup();
  render(<ActivePlayHarness initialEffects={[{ id: "shields", name: "Trump Card — Self", target: "healingReceived", bonus: 20, roundsRemaining: 999, consumeOnUse: true }]} />);
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "1");
  await user.click(screen.getByRole("button", { name: "Receive magical healing (1 + 20 fate)" }));
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "22");
  assert.equal(screen.queryByText("Trump Card — Self"), null);
});

test("Hammers waits for a successful melee attack before enhancing damage", async () => {
  const user = userEvent.setup();
  render(<ActivePlayHarness initialEffects={[{ id: "hammers", name: "Trump Card — Self", target: "meleeDamageRolls", bonus: 4, roundsRemaining: 999, consumeOnUse: true }]} />);
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    await user.click(screen.getByRole("button", { name: "Roll Longsword damage" }));
    assert.equal(screen.getByLabelText("Longsword damage total").textContent, "7");
    assert.ok(screen.getByText("Trump Card — Self"), "damage without a successful attack must not consume Hammers");
    await user.click(screen.getByRole("button", { name: "Roll Longsword attack" }));
    await user.click(screen.getByRole("button", { name: "Roll Longsword damage" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(screen.getAllByLabelText("Longsword damage total")[0].textContent, "11");
  assert.equal(screen.queryByText("Trump Card — Self"), null);
});
